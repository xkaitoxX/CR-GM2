import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { calculateProfit, DEFAULT_INPUTS, type ProfitInputs } from "@/lib/profit";

export const money = (n: number) => Math.round(n * 100) / 100;
export const pct = (n: number) => Math.round(n * 10) / 10;

const optionalMoney = (description: string) => z.number().min(0).optional().describe(description);

export const profitInputSchema = z.object({
  buyPrice: z.number().min(0).describe("£ paid per item to the shop or supplier"),
  sellPrice: z.number().min(0).describe("£ Amazon UK price the customer pays (includes VAT)"),
  fulfilmentFee: optionalMoney(
    `£ FBA fee per item, from the item's size and weight. Default £${DEFAULT_INPUTS.fulfilmentFee}`,
  ),
  referralFeePercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(`Amazon selling fee as % of the price. Default ${DEFAULT_INPUTS.referralFeePercent}%`),
  storageFeePerUnit: optionalMoney(`£ storage per item until sold. Default £${DEFAULT_INPUTS.storageFeePerUnit}`),
  shippingToAmazonPerUnit: optionalMoney(
    `£ to ship one item to Amazon's warehouse. Default £${DEFAULT_INPUTS.shippingToAmazonPerUnit}`,
  ),
  prepCostPerUnit: optionalMoney(`£ labels and bags per item. Default £${DEFAULT_INPUTS.prepCostPerUnit}`),
  otherCostsPerUnit: optionalMoney("£ any other cost per item. Default £0"),
  vatRegistered: z.boolean().optional().describe("Whether the owner is VAT registered. Default false"),
  buyPriceIncludesVat: z
    .boolean()
    .optional()
    .describe("Whether the buy price includes VAT the owner can reclaim. Default true"),
  quantity: z.number().int().min(1).optional().describe(`How many items to buy. Default ${DEFAULT_INPUTS.quantity}`),
});

/** Fills in typical values for anything the agent left out. */
export function withDefaults<T extends Partial<ProfitInputs>>(args: T) {
  return {
    ...DEFAULT_INPUTS,
    ...Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined)),
  } as ProfitInputs;
}

/** Runs the profit maths and returns a compact summary for an agent to read. */
export function profitSummary(args: z.infer<typeof profitInputSchema>) {
  const inputs = withDefaults(args);
  const r = calculateProfit(inputs);

  return {
    inputsUsed: inputs,
    profitPerItem: money(r.profitPerUnit),
    verdict: r.verdict,
    returnOnMoneyPercent: pct(r.roiPercent),
    marginPercent: pct(r.marginPercent),
    breakEvenAmazonPrice: r.breakEvenSellPrice === null ? null : money(r.breakEvenSellPrice),
    perItem: {
      revenueAfterVat: money(r.revenue),
      totalAmazonFees: money(r.totalAmazonFees),
      vatOnAmazonFees: money(r.vatOnFees),
      productCost: money(r.productCost),
      otherCosts: money(r.extraCosts),
    },
    forQuantity: {
      quantity: inputs.quantity,
      moneyToSpend: money(r.totalInvestment),
      totalProfit: money(r.totalProfit),
    },
  };
}

export const profitTool = betaZodTool({
  name: "calculate_profit",
  description:
    "Work out the profit for reselling an item on Amazon UK with FBA, after Amazon fees, VAT and costs. " +
    "Always use this for profit maths; never calculate profit yourself. " +
    "Leave out fields you don't know and typical defaults are used (listed in inputsUsed).",
  inputSchema: profitInputSchema,
  run: (args) => JSON.stringify(profitSummary(args)),
});
