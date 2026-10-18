// Customer messages, feedback, tickets and fact sheets.

export const CATEGORIES = [
  "where_is_order",
  "delivery",
  "how_to_use",
  "product_question",
  "thanks",
  "positive_feedback",
  "neutral_feedback",
  "negative_feedback",
  "refund_or_return",
  "damaged_or_missing",
  "complaint",
  "safety",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** A message from a customer through Amazon, or seller feedback to reply to publicly. */
export type MessageKind = "customer_message" | "feedback";

export interface IncomingMessage {
  kind: MessageKind;
  /** Customer name or email address. */
  from: string;
  subject?: string;
  text: string;
  productName?: string;
  orderId?: string;
  /** ISO time it arrived. */
  receivedAt: string;
  source: "email" | "pasted";
  /** Where a reply goes (Amazon's relay address for buyer messages). */
  replyTo?: string;
  /** Email Message-ID, so replies stay in the same thread. */
  emailMessageId?: string;
}

export type MessageStatus =
  /** Reply sent automatically. */
  | "auto_replied"
  /** Safe reply written, waiting to be sent or posted by the owner (no email connection, or feedback). */
  | "ready"
  /** Sent or posted by the owner. */
  | "sent"
  /** Handed to the owner as a ticket. */
  | "escalated";

export interface InboxMessage extends IncomingMessage {
  category: Category;
  reply: string;
  status: MessageStatus;
  /** Why it was or wasn't sent automatically. */
  reason: string;
  ticketId?: string;
  /** Holding reply sent while the owner decides, if any. */
  holdingReply?: string;
}

export type Priority = "urgent" | "high" | "normal";

export interface TicketNote {
  at: string;
  by: "ai" | "owner";
  text: string;
}

export interface Ticket {
  title: string;
  messageId: string;
  customer: string;
  kind: MessageKind;
  priority: Priority;
  status: "open" | "waiting" | "resolved";
  /** What the problem is, in a sentence or two. */
  summary: string;
  /** Reply the AI suggests; the owner can edit it. */
  suggestedReply: string;
  /** ISO time a reply is due (24 hours after the message arrived). */
  deadline: string;
  notes: TicketNote[];
}

export interface FactSheet {
  productName: string;
  /** Size, materials, how to use, care, what's in the box, warranty... in the owner's words. */
  facts: string;
}

export interface Settings {
  /** Reply to simple messages without asking. */
  autoReply: boolean;
}

export const INBOX = "inbox";
export const TICKETS = "tickets";
export const FACTS = "facts";
export const SETTINGS = "settings";
export const DEFAULT_SETTINGS: Settings = { autoReply: true };

/** Amazon expects replies to customer messages within 24 hours. */
export const REPLY_WITHIN_HOURS = 24;

const LABELS: Record<Category, string> = {
  where_is_order: "Where is my order",
  delivery: "Delivery question",
  how_to_use: "How to use",
  product_question: "Product question",
  thanks: "Thank you",
  positive_feedback: "Positive feedback",
  neutral_feedback: "Feedback",
  negative_feedback: "Negative feedback",
  refund_or_return: "Refund or return",
  damaged_or_missing: "Damaged or missing item",
  complaint: "Complaint",
  safety: "Safety issue",
  other: "Message",
};

export const categoryLabel = (category: Category) => LABELS[category];
