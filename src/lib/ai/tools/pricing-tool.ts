import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { suggestPrices, type PriceOption } from "@/lib/pricing";
import { money, pct, profitInputSchema, withDefaults } from "@/lib/ai/tools/profit-tool";

export const pricingInputSchema = profitInputSchema.omit({ sellPrice: true }).extend({
  competitorOffers: z
    .array(
      z.object({
        price: z.number().positive().describe("£ the customer pays for this offer, including delivery"),
        fulfilment: z
          .enum(["fba", "fbm", "amazon"])
          .describe("fba = another FBA seller, fbm = seller ships it themselves, amazon = sold by Amazon itself"),
      }),
    )
    .describe("Other sellers' offers on the same Amazon listing. Empty if unknown"),
  buyBoxPrice: z.number().positive().optional().describe("£ current Buy Box price, if known"),
});

const roundOption = (o: PriceOption) => ({
  ...o,
  profitPerItem: money(o.profitPerItem),
  roiPercent: pct(o.roiPercent),
});

/** Suggests selling prices and returns a compact summary for an agent to read. */
export function pricingSummary({ competitorOffers, buyBoxPrice, ...costArgs }: z.infer<typeof pricingInputSchema>) {
  const { sellPrice: _, ...costs } = withDefaults(costArgs);
  const s = suggestPrices(costs, competitorOffers, buyBoxPrice);

  return {
    costsUsed: costs,
    recommended: s.recommended && roundOption(s.recommended),
    advice: s.advice,
    warnings: s.warnings,
    breakEvenPrice: s.breakEvenPrice === null ? null : money(s.breakEvenPrice),
    goodDealPrice: s.goodDealPrice,
    options: s.options.map(roundOption),
  };
}

export const pricingTool = betaZodTool({
  name: "suggest_price",
  description:
    "Suggest the best Amazon UK selling price for an item: competitive with other sellers' offers while still profitable. " +
    "Returns a recommended price with the reason, other price options with profit at each, the break-even price, the lowest good-deal price and warnings. " +
    "Use this whenever you need a selling price; never pick a price yourself. " +
    "Leave out cost fields you don't know and typical defaults are used (listed in costsUsed).",
  inputSchema: pricingInputSchema,
  run: (args) => JSON.stringify(pricingSummary(args)),
});
