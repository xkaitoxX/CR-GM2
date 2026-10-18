import { describe, expect, it } from "vitest";
import { exampleData } from "@/lib/business/example-data";
import { salesReport, salesReportTool } from "./sales-report-tool";

describe("get_sales_report tool", () => {
  it("tells the agent when the numbers are only example data", () => {
    const r = salesReport(exampleData(), 30);

    expect(r.isExampleData).toBe(true);
    expect(r.period.days).toBe(30);
  });

  it("rounds money to pennies and lists items by profit", () => {
    const r = salesReport(exampleData(), 30);
    const profits = r.itemsByProfit.map((i) => i.profitAfterAds);

    expect(profits).toEqual([...profits].sort((a, b) => b - a));
    expect(r.totals.profit).toBe(Math.round(r.totals.profit * 100) / 100);
    expect(r.alerts.length).toBeGreaterThan(0);
  });

  it("only accepts the dashboard's periods", async () => {
    expect(() => salesReportTool.parse({ days: 14 })).toThrow();
    expect(JSON.parse((await salesReportTool.run({ days: 7 })) as string).period.days).toBe(7);
  });
});
