// Code-level safety rules for customer replies. They sit on top of the AI's own judgement:
// the AI can only send a reply by itself when every rule here agrees.
import type { Category, MessageKind, Priority } from "@/lib/customers/types";

export const SAFE_CATEGORIES: Category[] = [
  "where_is_order",
  "delivery",
  "how_to_use",
  "product_question",
  "thanks",
  "positive_feedback",
  "neutral_feedback",
];

/** Words in a customer's message that always need the owner. */
const URGENT_WORDS = [
  /\binjur/i,
  /\bhurt/i,
  /\ballerg/i,
  /\bfire\b/i,
  /\bburn/i,
  /\bsmok(e|ing)\b/i,
  /\bdangerous\b/i,
  /\bunsafe\b/i,
  /\blawyer/i,
  /\bsolicitor/i,
  /\blegal action\b/i,
  /\btrading standards\b/i,
  /\bpolice\b/i,
  /\ba-?\s?to-?\s?z\b/i,
  /\bchargeback/i,
  /\bfake\b/i,
  /\bcounterfeit/i,
  /\bscam/i,
  /\bfraud/i,
];
const RISKY_WORDS = [
  /\brefund/i,
  /\breturn(ed|ing|s)?\b/i,
  /\bmoney back\b/i,
  /\bdamaged?\b/i,
  /\bbroken\b/i,
  /\bbroke\b/i,
  /\bfaulty\b/i,
  /\bdefective\b/i,
  /\bmissing\b/i,
  /\bnever (arrived|came|received)\b/i,
  /\bnot (arrived|received)\b/i,
  /\bwrong item\b/i,
  /\bcomplain/i,
  /\bdisappointed\b/i,
  /\bterrible\b/i,
  /\bawful\b/i,
  /\bcancel/i,
];
/** Things a reply must never say on its own: links, review requests, promises of money. */
const UNSAFE_REPLY = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b(leave|write|post|give) (us )?(a )?(positive |good |5[- ]star |five[- ]star )?(review|feedback|rating)/i,
  /\b5[- ]stars?\b/i,
  /\brefund/i,
  /\bmoney back\b/i,
  /\bdiscount/i,
  /\bvoucher/i,
  /\bfree (replacement|gift)\b/i,
];

export interface Draft {
  category: Category;
  reply: string;
  /** The AI is sure its reply fully answers the message using only known facts. */
  confident: boolean;
}

export interface Decision {
  autoSend: boolean;
  reason: string;
  /** For escalations. */
  priority: Priority;
}

const matches = (patterns: RegExp[], text: string) => patterns.filter((p) => p.test(text));

export function priorityFor(category: Category, customerText: string): Priority {
  if (category === "safety" || matches(URGENT_WORDS, customerText).length) return "urgent";
  if (
    ["refund_or_return", "damaged_or_missing", "complaint", "negative_feedback"].includes(category) ||
    matches(RISKY_WORDS, customerText).length
  ) {
    return "high";
  }
  return "normal";
}

export function decideReply(draft: Draft, customerText: string, kind: MessageKind, autoReplyOn: boolean): Decision {
  const priority = priorityFor(draft.category, customerText);
  const hold = (reason: string): Decision => ({ autoSend: false, reason, priority });

  if (!autoReplyOn) return hold("Auto-replies are switched off.");
  if (!SAFE_CATEGORIES.includes(draft.category)) return hold(`This needs you: ${draft.category.replace(/_/g, " ")}.`);
  if (kind === "feedback" && draft.category === "negative_feedback") return hold("Negative feedback needs you.");
  if (matches(URGENT_WORDS, customerText).length || matches(RISKY_WORDS, customerText).length) {
    return hold("The message mentions something that needs you (for example a refund, damage or a safety issue).");
  }
  if (!draft.confident) return hold("The AI wasn't sure it could answer fully from the facts it has.");
  if (!draft.reply.trim()) return hold("The AI couldn't write a reply.");
  if (matches(UNSAFE_REPLY, draft.reply).length) {
    return hold("The reply mentioned a link, a review request or money, which Amazon's rules don't allow without you.");
  }
  return { autoSend: true, reason: "A simple message, answered from your facts.", priority };
}

/** Sent straight away when a message needs the owner, so the 24-hour reply time is kept. */
export function holdingReply(customer: string, shopName: string) {
  const first = customer.includes("@") ? "" : customer.trim().split(/\s+/)[0];
  return `${first ? `Hi ${first}` : "Hello"},\n\nThank you for your message. We're looking into this and will get back to you within 24 hours.\n\nKind regards,\n${shopName}`;
}
