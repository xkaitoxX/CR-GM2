import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { BUSINESS_CONTEXT, FALLBACK, MODEL } from "@/lib/ai/config";
import { runToText, type StatusFn } from "@/lib/ai/run";
import { pricingTool } from "@/lib/ai/tools/pricing-tool";
import { profitTool } from "@/lib/ai/tools/profit-tool";

const SYSTEM = `You are the Deals and Trends helper for a small Amazon UK reselling business. The manager gives you a research job, usually checking a product or finding product ideas. Your report goes back to the manager, not straight to the owner.

${BUSINESS_CONTEXT}

How to check a product:
1. Amazon UK price and competition: find the current Buy Box price and the other sellers' prices on the same listing. Note whether each seller uses FBA, ships it themselves (FBM), or is Amazon itself. Note where the prices came from.
2. FBA fee: estimate the item's size and weight, then the FBA fee. Search Amazon UK's published FBA fee rates if you need them, and say it's an estimate.
3. Where to buy it cheaper: UK shops, clearance and discount retailers, UK wholesalers, or Alibaba. Give the price and the link for each.
4. Demand: how well it seems to sell (reviews, "bought in past month", best-seller rank if shown).
5. Risks: restricted or gated brands and categories, brands that complain about resellers, fragile, heavy, hazardous or seasonal items.
6. Run suggest_price with the buy price, FBA fee and the competitor offers you found. It gives the best selling price (competitive and still profitable), the profit at that price, and the lowest price that is still a good deal. Never pick a selling price or work out profit yourself; use calculate_profit if you need the profit at another price.

How to find product ideas: search for trending and fast-selling products that suit reselling (small, light, not fragile, sells for £10-£30, not a restricted brand), then check the best few as above.

Your report:
- Start with a one-line verdict for each product: good deal, thin, or avoid.
- Then the numbers: suggested selling price (and why), Buy Box and lowest competitor prices, buy price, estimated FBA fee, profit per item, return on money, and the lowest price before it stops being a good deal.
- Then where to buy (with links), demand, competition and risks, including any warnings from suggest_price.
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
    } else if (block.type === "tool_use" && block.name === pricingTool.name) {
      onStatus("Deals helper is working out the best selling price");
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
    tools: [WEB_SEARCH, pricingTool, profitTool],
    messages: [{ role: "user", content: task }],
  });
  return runToText(runner, (message) => reportProgress(message, onStatus));
}
