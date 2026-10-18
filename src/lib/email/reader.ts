import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailConfig } from "@/lib/email/config";
import type { ParsedEmail } from "@/lib/email/sort";

/** Look back this many days for emails not handled yet. */
export const LOOK_BACK_DAYS = 3;
/** Most emails to read in one check, so a check never runs too long. */
export const MAX_PER_CHECK = 40;

/** Reads recent emails from the inbox without changing anything in the mailbox. */
export async function readRecentEmails(config: EmailConfig): Promise<ParsedEmail[]> {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapPort === 993,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });
  await client.connect();
  const emails: ParsedEmail[] = [];
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const since = new Date(Date.now() - LOOK_BACK_DAYS * 86_400_000);
      const uids = (await client.search({ since }, { uid: true })) || [];
      if (uids.length) {
        for await (const message of client.fetch(uids.slice(-MAX_PER_CHECK), { source: true }, { uid: true })) {
          if (!message.source) continue;
          const parsed = await simpleParser(message.source);
          const from = parsed.from?.value[0];
          const replyTo = parsed.replyTo?.value[0]?.address;
          emails.push({
            messageId: parsed.messageId ?? `uid-${message.uid}`,
            fromName: from?.name ?? "",
            fromAddress: from?.address ?? "",
            replyTo: replyTo ?? from?.address,
            subject: parsed.subject ?? "",
            text: parsed.text ?? "",
            date: (parsed.date ?? new Date()).toISOString(),
          });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return emails;
}
