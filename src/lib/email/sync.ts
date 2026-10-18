// Checks for new emails and hands each one to the right place.
import { createHash } from "node:crypto";
import { logActivity } from "@/lib/activity";
import { handleIncoming, type InboxDeps } from "@/lib/customers/inbox";
import { customerText, sortEmail, type EmailKind, type ParsedEmail } from "@/lib/email/sort";

export const EMAILS = "emails";

export interface EmailRecord {
  messageId: string;
  kind: EmailKind;
  from: string;
  subject: string;
  receivedAt: string;
  /** For customer messages: what happened. */
  outcome?: "auto_replied" | "ready" | "escalated";
}

export interface SyncResult {
  checked: number;
  newEmails: number;
  customerMessages: number;
  repliedAutomatically: number;
  ticketsOpened: number;
  supplierEmails: number;
}

const emailKey = (messageId: string) => createHash("sha256").update(messageId).digest("hex").slice(0, 32);

export async function syncEmail(deps: InboxDeps, emails: ParsedEmail[], ownAddress: string): Promise<SyncResult> {
  const result: SyncResult = {
    checked: emails.length,
    newEmails: 0,
    customerMessages: 0,
    repliedAutomatically: 0,
    ticketsOpened: 0,
    supplierEmails: 0,
  };

  // Oldest first, so replies go out in the order customers wrote.
  for (const email of [...emails].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = emailKey(email.messageId);
    if (await deps.store.get(EMAILS, key)) continue;
    result.newEmails++;

    const sorted = sortEmail(email, ownAddress);
    const record: EmailRecord = {
      messageId: email.messageId,
      kind: sorted.kind,
      from: sorted.name,
      subject: email.subject,
      receivedAt: email.date,
    };

    if (sorted.kind === "customer_message") {
      result.customerMessages++;
      const { message, ticket } = await handleIncoming(deps, {
        kind: "customer_message",
        from: sorted.name,
        subject: email.subject,
        text: customerText(email.text),
        orderId: sorted.orderId,
        receivedAt: email.date,
        source: "email",
        replyTo: email.replyTo ?? email.fromAddress,
        emailMessageId: email.messageId,
      });
      if (message.data.status === "auto_replied") result.repliedAutomatically++;
      if (ticket) result.ticketsOpened++;
      record.outcome = message.data.status === "sent" ? undefined : (message.data.status as EmailRecord["outcome"]);
    } else if (sorted.kind === "supplier") {
      result.supplierEmails++;
      await logActivity(deps.store, {
        actor: "ai",
        title: `Supplier email from ${sorted.name}`,
        detail: email.subject || undefined,
      });
    }

    // Saved last, so an email that failed half-way is tried again next time.
    await deps.store.put<EmailRecord>(EMAILS, key, record);
  }

  if (result.newEmails) {
    await logActivity(deps.store, {
      actor: "ai",
      title: `Checked email: ${result.newEmails} new`,
      detail: [
        result.customerMessages && `${result.customerMessages} from customers`,
        result.repliedAutomatically && `${result.repliedAutomatically} answered automatically`,
        result.ticketsOpened && `${result.ticketsOpened} sent to Tickets`,
        result.supplierEmails && `${result.supplierEmails} from suppliers`,
      ]
        .filter(Boolean)
        .join(", ") || undefined,
      link: "/inbox",
    });
  }
  return result;
}
