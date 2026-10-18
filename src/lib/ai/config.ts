import type {
  BetaWebSearchTool20250305,
  BetaWebSearchTool20260209,
  MessageCreateParamsBase,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { GOOD_DEAL_MIN_PROFIT, GOOD_DEAL_MIN_ROI_PERCENT } from "@/lib/profit";

/** Claude Haiku 5.5 is the cheapest Claude model. Set AI_MODEL to use another, e.g. claude-sonnet-5-5. */
export const DEFAULT_MODEL = "claude-haiku-5-5";
export const MODEL = process.env.AI_MODEL || DEFAULT_MODEL;

/** Models that can re-run a declined request on Anthropic's recommended fallback model. */
const FALLBACK_MODELS = ["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"];
/** Models that support the newer web search, which filters results before reading them. */
const FILTERING_SEARCH_MODELS = /^claude-(fable-5|opus-5|opus-4-[678]|sonnet-5|sonnet-4-6)/;

export type Effort = "low" | "medium" | "high";

/** Model, effort and (where supported) refusal fallback for one request. */
export function modelParams(
  effort: Effort,
  model = MODEL,
): Pick<MessageCreateParamsBase, "model" | "output_config" | "betas" | "fallbacks"> {
  return {
    model,
    output_config: { effort },
    ...(FALLBACK_MODELS.includes(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  };
}

/** Web search tuned to UK results, in the version the model supports. */
export function webSearchTool(maxUses: number, model = MODEL): BetaWebSearchTool20250305 | BetaWebSearchTool20260209 {
  const common = {
    name: "web_search" as const,
    max_uses: maxUses,
    user_location: { type: "approximate" as const, country: "GB" },
  };
  return FILTERING_SEARCH_MODELS.test(model)
    ? { type: "web_search_20260209", ...common }
    : { type: "web_search_20250305", ...common };
}

/** Facts about the business that every agent works from. */
export const BUSINESS_CONTEXT = `About the business:
- The owner resells products on Amazon UK using FBA (Amazon stores, ships and handles returns).
- Stage 1 is reselling items bought cheaper in UK shops, clearance sales, wholesalers or Alibaba. Own-brand products come later, once profits reach about £2,000.
- Starting budget is about £400. Profits are reinvested in stock.
- A good deal makes at least £${GOOD_DEAL_MIN_PROFIT} profit and a ${GOOD_DEAL_MIN_ROI_PERCENT}% return per item.
- The owner is not VAT registered unless they say otherwise.
- The owner prefers plain, simple English: short sentences, no jargon (explain terms like FBA or ROI if you use them).

Rules you must never break:
- Never buy, pay, or change anything on the owner's behalf. You research and advise; the owner decides and acts. (The only exception is routine customer replies, which follow their own safety rules.)
- Only use official or allowed sources. Don't suggest scraping Amazon or other websites, and never suggest review manipulation or contacting buyers outside Amazon.
- Only recommend new, genuine items. Warn when a brand or category is often restricted ("gated") on Amazon or known for complaints against resellers.
- Be honest about what is estimated. Prices and fees found online are estimates until the owner's Amazon seller account is connected.`;
