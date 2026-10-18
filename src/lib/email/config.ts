// Email account settings from the website's environment variables.

export interface EmailConfig {
  user: string;
  /** An app password, not the normal password. */
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
}

/** Known providers, so only the address and app password are needed. */
const PRESETS: { match: RegExp; imapHost: string; smtpHost: string; smtpPort: number }[] = [
  { match: /@(gmail|googlemail)\.com$/i, imapHost: "imap.gmail.com", smtpHost: "smtp.gmail.com", smtpPort: 465 },
  { match: /@(icloud|me|mac)\.com$/i, imapHost: "imap.mail.me.com", smtpHost: "smtp.mail.me.com", smtpPort: 587 },
  { match: /@yahoo\.(com|co\.uk)$/i, imapHost: "imap.mail.yahoo.com", smtpHost: "smtp.mail.yahoo.com", smtpPort: 465 },
];

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig | null {
  const user = env.EMAIL_USER?.trim();
  const password = env.EMAIL_PASSWORD?.replace(/\s+/g, "");
  if (!user || !password) return null;
  const preset = PRESETS.find((p) => p.match.test(user));
  const imapHost = env.EMAIL_IMAP_HOST || preset?.imapHost;
  const smtpHost = env.EMAIL_SMTP_HOST || preset?.smtpHost;
  if (!imapHost || !smtpHost) return null;
  return {
    user,
    password,
    imapHost,
    imapPort: Number(env.EMAIL_IMAP_PORT) || 993,
    smtpHost,
    smtpPort: Number(env.EMAIL_SMTP_PORT) || preset?.smtpPort || 465,
  };
}
