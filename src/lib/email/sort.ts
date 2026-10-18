// Works out what kind of email arrived, and pulls out what the inbox needs.

export interface ParsedEmail {
  /** Email Message-ID, used so each email is only handled once. */
  messageId: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
  subject: string;
  text: string;
  /** ISO time it arrived. */
  date: string;
}

export type EmailKind = "customer_message" | "supplier" | "amazon_notice" | "own" | "other";

export interface SortedEmail {
  kind: EmailKind;
  /** Customer or supplier name, cleaned up. */
  name: string;
  orderId?: string;
}

/** Amazon passes buyer messages through addresses like abc123@marketplace.amazon.co.uk. */
const AMAZON_BUYER = /@marketplace\.amazon\.[a-z.]+$/i;
const AMAZON_NOTICE = /@([a-z0-9-]+\.)*amazon\.(co\.uk|com|de|fr|it|es|nl|se|pl|com\.be|ie)$/i;
const SUPPLIER_DOMAINS = /@([a-z0-9-]+\.)*(alibaba|1688|aliexpress|made-in-china|globalsources|dhgate)\.[a-z.]+$/i;
const SUPPLIER_WORDS = /\b(quotation|quote|rfq|inquiry|enquiry|proforma|invoice|moq|samples?|shipment)\b/i;
const ORDER_ID = /\b\d{3}-\d{7}-\d{7}\b/;

export function sortEmail(email: ParsedEmail, ownAddress: string): SortedEmail {
  const address = email.fromAddress.toLowerCase();
  const name = email.fromName.replace(/\s*[-–]\s*Amazon Marketplace\s*$/i, "").replace(/\s+via Amazon.*$/i, "").trim();
  const orderId = `${email.subject}\n${email.text}`.match(ORDER_ID)?.[0];

  if (address === ownAddress.toLowerCase()) return { kind: "own", name };
  if (AMAZON_BUYER.test(address)) return { kind: "customer_message", name: name || "Amazon customer", orderId };
  if (AMAZON_NOTICE.test(address)) return { kind: "amazon_notice", name: name || "Amazon" };
  if (SUPPLIER_DOMAINS.test(address) || SUPPLIER_WORDS.test(email.subject)) return { kind: "supplier", name: name || address };
  return { kind: "other", name: name || address };
}

/** Amazon wraps buyer messages in standard text; keep just what the customer wrote. */
export function customerText(text: string) {
  const cleaned = text
    .split(/\n-{5,}|\nWas this email helpful\?|\nCopyright \d{4}|\nWe hope to see you again soon/i)[0]
    .replace(/^\s*(Message|Dear seller,?)\s*:?\s*$/gim, "")
    .trim();
  return (cleaned || text.trim()).slice(0, 4000);
}
