import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { money, pct } from "@/lib/ai/tools/profit-tool";
import { compareSuppliers } from "@/lib/suppliers";

export const DEFAULT_CLEARANCE_FEE = 15;

export const supplierInputSchema = z.object({
  sellPrice: z.number().positive().describe("£ Amazon UK selling price"),
  plannedQty: z.number().int().min(1).describe("How many items the owner wants to order"),
  budget: z.number().positive().describe("£ the owner can spend on this order"),
  needsSafetyMark: z
    .boolean()
    .describe("True if the item needs UKCA/CE marking to be sold in the UK (toys, electricals, PPE and so on)"),
  dutyPercent: z
    .number()
    .min(0)
    .max(100)
    .describe("UK import duty % for this kind of item. Look it up on the UK Trade Tariff (gov.uk) if unsure; often 0-12%"),
  clearanceFee: z
    .number()
    .min(0)
    .optional()
    .describe(`£ per shipment for customs clearance and courier handling. Default £${DEFAULT_CLEARANCE_FEE}`),
  vatRegistered: z.boolean().optional().describe("Whether the owner is VAT registered. Default false"),
  fulfilmentFee: z.number().min(0).optional().describe("£ Amazon FBA fee per item, if known"),
  offers: z
    .array(
      z.object({
        supplier: z.string(),
        unitPrice: z.number().positive().describe("£ per item at the planned quantity, converted to GBP"),
        freightPerUnit: z.number().min(0).describe("£ shipping per item to the UK"),
        moq: z.number().int().min(1).describe("Minimum order quantity"),
        leadTimeDays: z.number().int().min(0).optional(),
        tradeAssurance: z.boolean(),
        verified: z.boolean().describe("Alibaba Verified Supplier"),
        yearsOnAlibaba: z.number().min(0).optional(),
        hasSafetyMark: z.boolean().optional().describe("Supplier provides UKCA/CE safety papers"),
        ddp: z.boolean().optional().describe("Price is Delivered Duty Paid: includes UK duty, import VAT and clearance"),
      }),
    )
    .min(1),
});

export function supplierSummary(args: z.infer<typeof supplierInputSchema>) {
  const { dutyPercent, clearanceFee, vatRegistered, fulfilmentFee, ...rest } = args;
  const c = compareSuppliers({
    ...rest,
    importCosts: {
      dutyPercent,
      clearanceFee: clearanceFee ?? DEFAULT_CLEARANCE_FEE,
      importVatPercent: 20,
      vatRegistered: vatRegistered ?? false,
    },
    costs: fulfilmentFee === undefined ? undefined : { fulfilmentFee },
  });
  return {
    recommended: c.recommended?.supplier ?? null,
    advice: c.advice,
    ranked: c.ranked.map((o) => ({
      supplier: o.supplier,
      quantity: o.quantity,
      landedCostPerItem: money(o.landedCost),
      breakdown: {
        goodsAndShipping: money(o.breakdown.goods),
        duty: money(o.breakdown.duty),
        clearance: money(o.breakdown.clearance),
        importVat: money(o.breakdown.importVat),
      },
      cashNeeded: money(o.cashNeeded),
      profitPerItem: money(o.profitPerItem),
      returnOnMoneyPercent: pct(o.roiPercent),
      totalProfit: money(o.totalProfit),
      verdict: o.verdict,
      flags: o.flags,
    })),
  };
}

export const compareSuppliersTool = betaZodTool({
  name: "compare_suppliers",
  description:
    "Compare supplier offers on the real cost per item once it's in the UK (shipping, customs duty, clearance and import VAT), " +
    "the profit at the Amazon price, the cash needed up front, and red flags (no Trade Assurance, over budget, no safety papers, " +
    "new or unverified supplier, slow delivery, suspiciously cheap). Returns them ranked with a recommendation. " +
    "Always use this to compare suppliers; never compare costs yourself.",
  inputSchema: supplierInputSchema,
  run: (args) => JSON.stringify(supplierSummary(args)),
});
