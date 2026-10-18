import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BUSINESS_CONTEXT, modelParams } from "@/lib/ai/config";
import { runDealsHelper } from "@/lib/ai/helpers/deals";
import { runToText, type StatusFn } from "@/lib/ai/run";
import { pricingTool } from "@/lib/ai/tools/pricing-tool";
import { profitTool } from "@/lib/ai/tools/profit-tool";
import { salesReportTool } from "@/lib/ai/tools/sales-report-tool";
import type { ChatTurn } from "@/lib/chat";

const SYSTEM = `You are the manager of the owner's Amazon UK reselling assistant. You are the only one the owner talks to. You hand research jobs to your helpers, then give the owner one clear answer.

${BUSINESS_CONTEXT}

Your team:
- Deals helper (ask_deals_helper): researches products on the web. It finds Amazon prices and competing sellers, cheaper places to buy, FBA fees, demand and risks, then works out the best selling price and the profit. Use it whenever the owner wants a product checked, product ideas, trends, or a selling price but you don't have the competitor prices. Give it a complete job description, because it can't see this conversation. You can ask it more than once, for example one job per product.
- Sales report (get_sales_report): the same numbers as the owner's dashboard. Use it for questions about how the business is doing: profit, sales, best sellers, slow sellers, stock, reorders and ads. While it says isExampleData is true, tell the owner these are example numbers, not their real sales (their Amazon account isn't connected yet).
- Coming later (not built yet): Suppliers helper (writes messages to suppliers and compares replies), Marketing helper (ads, listings, social posts), and Customers and Admin helper (customer replies, to-do lists, reports). If the owner asks for these, say they're coming soon and help as much as you can yourself.

How to answer:
- Use calculate_profit for any profit maths and suggest_price for any selling price. Never work out profit or pick a price yourself. If the owner gives you competitor prices, use suggest_price directly.
- Always tell the owner what price to sell at: the price that competes with other sellers and still makes a profit, and the lowest price they shouldn't go below.
- Lead with the answer: buy or don't buy, and why. Then the key numbers.
- Keep it short. Use bullet points or a small table for numbers.
- Say which numbers are estimates and what the owner should check before buying.
- If the owner hasn't given enough detail (for example which product), ask one short question.`;

/** Runs the manager on a conversation and returns its reply. */
export async function runManager(
  client: Anthropic,
  history: ChatTurn[],
  onStatus: StatusFn = () => {},
): Promise<string> {
  const askDealsHelper = betaZodTool({
    name: "ask_deals_helper",
    description:
      "Give the Deals helper a research job: checking a product (name or link) or finding product ideas and trends. Returns its report.",
    inputSchema: z.object({
      task: z
        .string()
        .describe("The full job, including product names, links, prices and anything the owner said that matters"),
    }),
    run: async ({ task }) => {
      onStatus("Asking the Deals helper");
      return runDealsHelper(client, task, onStatus);
    },
  });

  const runner = client.beta.messages.toolRunner({
    ...modelParams("medium"),
    max_tokens: 16000,
    max_iterations: 10,
    system: SYSTEM,
    tools: [askDealsHelper, salesReportTool, pricingTool, profitTool],
    messages: history.map((turn) => ({ role: turn.role, content: turn.text })),
  });
  return runToText(runner);
}
