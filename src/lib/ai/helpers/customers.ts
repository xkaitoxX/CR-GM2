import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BUSINESS_CONTEXT, modelParams } from "@/lib/ai/config";
import type { HelperSpec } from "@/lib/ai/helpers/run-helper";
import { inboxOverviewTool } from "@/lib/ai/tools/inbox-tools";
import { seasonCalendarTool } from "@/lib/ai/tools/marketing-tools";
import { salesReportTool } from "@/lib/ai/tools/sales-report-tool";
import { CATEGORIES, type FactSheet, type IncomingMessage } from "@/lib/customers/types";

export const SHOP_NAME = process.env.SHOP_NAME || "Customer Service";

const replySchema = z.object({
  category: z.enum(CATEGORIES).describe("What the message is about"),
  summary: z.string().describe("One or two sentences for the owner: who, what, and what they want"),
  reply: z.string().describe("The reply to send, ready to go"),
  confident: z
    .boolean()
    .describe("True only if the reply fully answers the message using the facts given, with nothing guessed"),
});

export type DraftedReply = z.infer<typeof replySchema>;

const SYSTEM = `You write replies for a small Amazon UK seller, as the seller's customer service team. Write in friendly, polite British English. Keep replies short: greeting, the answer, a kind sign-off with "Kind regards," and the shop name "${SHOP_NAME}".

Amazon's rules for messages, which you must always follow:
- Only write about this customer's order or question. No marketing, no other products.
- No links, no email addresses or phone numbers, no attachments.
- Never ask for a review, a rating or feedback, and never offer anything for one.
- Never promise a refund, replacement, discount or voucher: the owner decides those.
- Never share other customers' details.

Facts:
- Only use the product facts you are given and what the customer said. If the answer isn't in the facts, don't guess: say you're checking and will reply soon, and set confident to false.
- For "where is my order" without tracking details, explain that the delivery estimate and tracking are in their Amazon account under Your Orders.

Seller feedback (public replies on the seller's feedback page):
- Thank the customer, keep it to one or two sentences, and never include personal details.
- For negative feedback, write a calm, helpful public reply and set category to negative_feedback.

Choose the category carefully: anything about refunds, returns, damage, missing items, complaints, safety, legal threats, A-to-z claims or fake products is never a simple category.`;

function describeMessage(message: Pick<IncomingMessage, "kind" | "from" | "subject" | "text" | "productName" | "orderId">, facts: FactSheet[]) {
  const factText = facts.length
    ? facts.map((f) => `## ${f.productName}\n${f.facts.trim() || "(no facts written yet)"}`).join("\n\n")
    : "(no fact sheets written yet)";
  return [
    `Type: ${message.kind === "feedback" ? "public seller feedback to reply to" : "customer message"}`,
    `From: ${message.from}`,
    message.subject ? `Subject: ${message.subject}` : "",
    message.productName ? `Product: ${message.productName}` : "",
    message.orderId ? `Order: ${message.orderId}` : "",
    "",
    "Message:",
    message.text,
    "",
    "Product facts you may use:",
    factText,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Writes a reply and sorts the message. Never sends anything itself. */
export async function draftCustomerReply(
  client: Anthropic,
  message: Pick<IncomingMessage, "kind" | "from" | "subject" | "text" | "productName" | "orderId">,
  facts: FactSheet[],
): Promise<DraftedReply> {
  const params = modelParams("low");
  const response = await client.beta.messages.parse({
    ...params,
    output_config: { ...params.output_config, format: betaZodOutputFormat(replySchema) },
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: describeMessage(message, facts) }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return {
      category: "other",
      summary: "The AI couldn't write a reply to this message.",
      reply: "",
      confident: false,
    };
  }
  return response.parsed_output;
}

const ADMIN_SYSTEM = `You are the Customers and Admin helper for a small Amazon UK reselling business. The manager asks you to draft customer replies, write the owner's to-do list, or write reports. Your report goes back to the manager, not straight to the owner.

${BUSINESS_CONTEXT}

- To-do lists: use get_inbox_overview (tickets and messages waiting, replies due within 24 hours) and get_sales_report (reorders, slow sellers, ads losing money), and get_season_calendar for seasons coming up. List the most urgent things first, each as one short action.
- Monthly reports: use get_sales_report for the last 30 days. Cover sales, profit, best and worst items, stock, customer messages and what to do next month. Say if the numbers are example data.
- Customer replies pasted in chat: write a polite reply following Amazon's rules (no links, no review requests, no promised refunds or discounts). Real incoming messages are handled automatically in the Inbox, so remind the manager the owner can paste messages there too.
Keep it short and clear.`;

export const CUSTOMERS_HELPER: HelperSpec = {
  name: "Customers and Admin helper",
  system: ADMIN_SYSTEM,
  tools: [inboxOverviewTool, salesReportTool, seasonCalendarTool],
  effort: "low",
  maxIterations: 8,
  toolStatus: {
    [inboxOverviewTool.name]: "is checking the inbox and tickets",
    [salesReportTool.name]: "is reading the sales report",
    [seasonCalendarTool.name]: "is checking upcoming seasons",
  },
};
