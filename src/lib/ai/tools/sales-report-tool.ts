import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getBusinessData } from "@/lib/business/example-data";
import { summarise, type PeriodDays, type Totals } from "@/lib/business/summary";
import type { BusinessData } from "@/lib/business/types";
import { money, pct } from "@/lib/ai/tools/profit-tool";

const roundTotals = (t: Totals) => ({
  sales: money(t.sales),
  profit: money(t.profit),
  itemsSold: t.units,
  adSpend: money(t.adSpend),
  moneySpent: money(t.moneySpent),
  returnOnMoneyPercent: pct(t.roiPercent),
  profitPerItem: money(t.profitPerItem),
});

/** The dashboard's numbers in a compact form for an agent to read. */
export function salesReport(data: BusinessData, days: PeriodDays) {
  const s = summarise(data, days);
  return {
    isExampleData: s.isExample,
    period: { from: s.from, to: s.to, days },
    totals: roundTotals(s.totals),
    previousPeriod: roundTotals(s.previous),
    itemsByProfit: s.products.map((p) => ({
      name: p.name,
      itemsSold: p.units,
      sales: money(p.sales),
      profitAfterAds: money(p.profit),
      profitPerItem: money(p.profitPerItem),
      marginPercent: pct(p.marginPercent),
      adSpend: money(p.adSpend),
      stockAtAmazon: p.stockAtAmazon,
      daysOfStockLeft: p.daysOfStockLeft === null ? null : Math.round(p.daysOfStockLeft),
    })),
    whereTheMoneyWent: s.breakdown.map((part) => ({ part: part.label, amount: money(part.amount) })),
    stock: { items: s.stockUnits, costToBuy: money(s.stockValue) },
    alerts: s.insights,
  };
}

export const salesReportTool = betaZodTool({
  name: "get_sales_report",
  description:
    "Get the business's sales and profit report for the last 7, 30 or 90 days: totals compared with the period before, " +
    "sales, profit and stock for each item, where the money went, and alerts (low stock, slow sellers, ads losing money). " +
    "Use it for any question about how the business is doing, best sellers, profit, stock or ads.",
  inputSchema: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]).describe("How many days back to report on"),
  }),
  run: ({ days }) => JSON.stringify(salesReport(getBusinessData(), days)),
});
