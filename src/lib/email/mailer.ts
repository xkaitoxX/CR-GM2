import nodemailer from "nodemailer";
import type { Mailer } from "@/lib/customers/inbox";
import { emailConfig, type EmailConfig } from "@/lib/email/config";

export function createSmtpMailer(config: EmailConfig, shopName: string): Mailer {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS.
    secure: config.smtpPort === 465,
    auth: { user: config.user, pass: config.password },
  });
  return {
    async send({ to, subject, text, inReplyTo }) {
      await transporter.sendMail({
        from: { name: shopName, address: config.user },
        to,
        subject,
        text,
        ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
      });
    },
  };
}

/** The email sender, or null when no email account is connected. */
export function getMailer(shopName: string): Mailer | null {
  const config = emailConfig();
  return config ? createSmtpMailer(config, shopName) : null;
}
