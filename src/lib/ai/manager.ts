import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BUSINESS_CONTEXT, modelParams } from "@/lib/ai/config";
import { CUSTOMERS_HELPER } from "@/lib/ai/helpers/customers";
import { DEALS_HELPER } from "@/lib/ai/helpers/deals";
import { runHelper, type HelperSpec } from "@/lib/ai/helpers/run-helper";
import { MARKETING_HELPER } from "@/lib/ai/helpers/marketing";
import { SUPPLIERS_HELPER } from "@/lib/ai/helpers/suppliers";
import { runToText, type StatusFn } from "@/lib/ai/run";
import { pricingTool } from "@/lib/ai/tools/pricing-tool";
import { profitTool } from "@/lib/ai/tools/profit-tool";
import { salesReportTool } from "@/lib/ai/tools/sales-report-tool";
import type { ChatTurn } from "@/lib/chat";

const SYSTEM = `You are the manager of the owner's Amazon UK reselling assistant. You are the only one the owner talks to. You hand jobs to your helpers, then give the owner one clear answer.

${BUSINESS_CONTEXT}

Your team:
- Deals helper (ask_deals_helper): checks specific products or links on the web: Amazon price and competing sellers, cheaper places to buy, FBA fee, demand and risks, then the best selling price and profit.
- Marketing helper (ask_marketing_helper): finds trending and best-selling items and suggests a basket to buy within a budget (a small test buy first), works out what to restock, checks upcoming UK seasons (Christmas, Black Friday, Prime Day...), writes Amazon listings, works out ad budgets and keywords, and writes social posts.
- Suppliers helper (ask_suppliers_helper): writes messages to suppliers (Alibaba and others), and compares supplier replies on the real cost per item in the UK, including shipping, customs duty and import VAT, with red flags.
- Customers and Admin helper (ask_customers_helper): writes polite customer replies that follow Amazon's rules, the owner's to-do list (tickets due, reorders, seasons), and monthly reports. Customer messages that arrive by email are answered automatically in the Inbox; anything that needs the owner becomes a ticket in Tickets.
- Sales report (get_sales_report): the same numbers as the owner's dashboard. Use it for questions about how the business is doing: profit, sales, best sellers, slow sellers, stock, reorders and ads. While it says isExampleData is true, tell the owner these are example numbers, not their real sales (their Amazon account isn't connected yet).
- Helpers can't see this conversation, so give each one a complete job description: product names, links, prices, pasted supplier replies and anything the owner said that matters. You can ask a helper more than once, for example one job per product.

How to answer:
- Use calculate_profit for any profit maths and suggest_price for any selling price. Never work out profit or pick a price yourself. If the owner gives you competitor prices, use suggest_price directly.
- When a product is checked, always say what price to sell at and the lowest price they shouldn't go below.
- Lead with the answer, then the key numbers.
- Keep it short. Use bullet points or a small table for numbers.
- Say which numbers are estimates and what the owner should check.
- If the owner hasn't given enough detail (for example which product), ask one short question.`;

function helperTool(client: Anthropic, onStatus: StatusFn, name: string, description: string, spec: HelperSpec) {
  return betaZodTool({
    name,
    description,
    inputSchema: z.object({
      task: z
        .string()
        .describe("The full job, including product names, links, prices, pasted messages and anything the owner said that matters"),
    }),
    run: ({ task }) => {
      onStatus(`Asking the ${spec.name}`);
      return runHelper(client, spec, task, onStatus);
    },
  });
}

/** Runs the manager on a conversation and returns its reply. */
export async function runManager(
  client: Anthropic,
  history: ChatTurn[],
  onStatus: StatusFn = () => {},
): Promise<string> {
  const helpers = [
    helperTool(
      client,
      onStatus,
      "ask_deals_helper",
      "Give the Deals helper a specific product to check (name or link). Returns its report.",
      DEALS_HELPER,
    ),
    helperTool(
      client,
      onStatus,
      "ask_marketing_helper",
      "Ask the Marketing helper what to sell (trending items, a basket for a budget, restocking, seasons) or how to sell it (listing, ads, social posts). Returns its report.",
      MARKETING_HELPER,
    ),
    helperTool(
      client,
      onStatus,
      "ask_suppliers_helper",
      "Ask the Suppliers helper to write a message to a supplier, or to compare supplier replies (paste them in full). Returns its report.",
      SUPPLIERS_HELPER,
    ),
    helperTool(
      client,
      onStatus,
      "ask_customers_helper",
      "Ask the Customers and Admin helper to draft a customer reply (paste the message), write today's to-do list, or write a monthly report. Returns its report.",
      CUSTOMERS_HELPER,
    ),
  ];

  const runner = client.beta.messages.toolRunner({
    ...modelParams("medium"),
    max_tokens: 16000,
    max_iterations: 10,
    system: SYSTEM,
    tools: [...helpers, salesReportTool, pricingTool, profitTool],
    messages: history.map((turn) => ({ role: turn.role, content: turn.text })),
  });
  return runToText(runner);
}
