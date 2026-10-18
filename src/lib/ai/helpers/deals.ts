import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { BUSINESS_CONTEXT, FALLBACK, MODEL } from "@/lib/ai/config";
import { runToText, type StatusFn } from "@/lib/ai/run";
import { profitTool } from "@/lib/ai/tools/profit-tool";

const SYSTEM = `You are the Deals and Trends helper for a small Amazon UK reselling business. The manager gives you a research job, usually checking a product or finding product ideas. Your report goes back to the manager, not straight to the owner.

${BUSINESS_CONTEXT}

How to check a product:
1. Amazon UK price: find the current selling price from search results. Note where it came from.
2. FBA fee: estimate the item's size and weight, then the FBA fee. Search Amazon UK's published FBA fee rates if you need them, and say it's an estimate.
3. Where to buy it cheaper: UK shops, clearance and discount retailers, UK wholesalers, or Alibaba. Give the price and the link for each.
4. Demand and competition: how well it seems to sell (reviews, "bought in past month", best-seller rank if shown), how many sellers there are, and whether Amazon itself sells it (bad for resellers).
5. Risks: restricted or gated brands and categories, brands that complain about resellers, fragile, heavy, hazardous or seasonal items.
6. Run calculate_profit with your best numbers. If the buy price is unknown, work out the highest buy price that still makes a good deal.

How to find product ideas: search for trending and fast-selling products that suit reselling (small, light, not fragile, sells for £10-£30, not a restricted brand), then check the best few as above.

Your report:
- Start with a one-line verdict for each product: good deal, thin, or avoid.
- Then the numbers: Amazon price, buy price, estimated FBA fee, profit per item, return on money.
- Then where to buy (with links), demand, competition and risks.
- List your sources as links.
- Say clearly which numbers are estimates and what the owner should check before buying.
Keep it short and factual.`;

const WEB_SEARCH = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 8,
  user_location: { type: "approximate", country: "GB" },
} as const;

function reportProgress(message: BetaMessage, onStatus: StatusFn) {
  for (const block of message.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const query = typeof block.input.query === "string" ? block.input.query : "";
      onStatus(query ? `Deals helper searched: ${query}` : "Deals helper is searching the web");
    } else if (block.type === "tool_use" && block.name === profitTool.name) {
      onStatus("Deals helper is calculating the profit");
    }
  }
}

/** Runs the Deals and Trends helper on one research job and returns its report. */
export async function runDealsHelper(
  client: Anthropic,
  task: string,
  onStatus: StatusFn = () => {},
): Promise<string> {
  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    ...FALLBACK,
    max_iterations: 12,
    system: SYSTEM,
    tools: [WEB_SEARCH, profitTool],
    messages: [{ role: "user", content: task }],
  });
  return runToText(runner, (message) => reportProgress(message, onStatus));
}
