import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { exampleData, EXAMPLE_AS_OF } from "./example-data";
import { summarise } from "./summary";
import type { BusinessData } from "./types";

const data: BusinessData = {
  asOf: "2026-01-31",
  isExample: false,
  products: [
    { id: "a", name: "Garlic press", buyPrice: 6, fulfilmentFee: 2.5, stockAtAmazon: 1 },
    { id: "b", name: "Phone stand", buyPrice: 4, fulfilmentFee: 2.2, stockAtAmazon: 20 },
  ],
  sales: [
    { date: "2026-01-31", productId: "a", units: 2, unitPrice: 16.99 },
    { date: "2026-01-25", productId: "a", units: 1, unitPrice: 16.99 },
    { date: "2026-01-20", productId: "a", units: 1, unitPrice: 16.99 }, // previous 7 days
    { date: "2026-01-30", productId: "b", units: 1, unitPrice: 9.99 },
    { date: "2025-12-01", productId: "a", units: 5, unitPrice: 16.99 }, // too old to count
  ],
  adSpend: [{ date: "2026-01-30", productId: "b", amount: 5 }],
};

describe("summarise", () => {
  const s = summarise(data, 7);

  it("adds up sales, profit after ads and return on money for the period", () => {
    expect(s.from).toBe("2026-01-25");
    expect(s.to).toBe("2026-01-31");
    expect(s.totals.units).toBe(4);
    expect(s.totals.sales).toBeCloseTo(60.96, 6);
    expect(s.totals.adSpend).toBe(5);
    expect(s.totals.profit).toBeCloseTo(3 * 3.988236 + 0.640636 - 5, 5);
    expect(s.totals.moneySpent).toBeCloseTo(3 * 6 + 4 + 4 * 0.7 + 5, 6);
    expect(s.totals.roiPercent).toBeCloseTo((s.totals.profit / s.totals.moneySpent) * 100, 9);
  });

  it("compares with the period before", () => {
    expect(s.previous.units).toBe(1);
    expect(s.previous.profit).toBeCloseTo(3.988236, 5);
  });

  it("splits sales into where the money went", () => {
    const sum = s.breakdown.reduce((n, part) => n + part.amount, 0);

    expect(sum).toBeCloseTo(s.totals.sales, 6);
    expect(s.breakdown.map((p) => p.key)).toEqual(["profit", "productCost", "amazonFees", "vatOnFees", "shippingPrep", "ads"]);
  });

  it("ranks products by profit after ads", () => {
    expect(s.products.map((p) => p.id)).toEqual(["a", "b"]);
    expect(s.products[0]).toMatchObject({ units: 3, profitPerItem: expect.closeTo(3.988236, 5) });
    expect(s.products[1].profit).toBeCloseTo(0.640636 - 5, 5);
  });

  it("works out days of stock left at the last 30 days' pace", () => {
    expect(s.products[0].daysOfStockLeft).toBeCloseTo(1 / (4 / 30), 6);
    expect(s.products[1].daysOfStockLeft).toBeCloseTo(600, 6);
  });

  it("gives one bar per day for short periods", () => {
    expect(s.bucketSize).toBe("day");
    expect(s.buckets).toHaveLength(7);
    expect(s.buckets[6]).toMatchObject({ start: "2026-01-31", label: "31 Jan", units: 2 });
    expect(s.buckets[5].profit).toBeCloseTo(0.640636 - 5, 5);
  });

  it("raises the right alerts, most urgent first", () => {
    expect(s.insights.map((i) => [i.severity, i.title])).toEqual([
      ["critical", "Ads on Phone stand are losing money"],
      ["warning", "Reorder Garlic press"],
      ["warning", "Phone stand is selling slowly"],
      ["good", "Profit is up 91%"],
      ["good", "Top earner: Garlic press"],
    ]);
    expect(s.insights[1].text).toMatch(/About 8 days of stock left/);
  });

  it("values the stock at Amazon at what it cost", () => {
    expect(s.stockUnits).toBe(21);
    expect(s.stockValue).toBe(86);
  });

  it("gives weekly bars that cover a 90-day period exactly", () => {
    const q = summarise(data, 90);

    expect(q.bucketSize).toBe("week");
    expect(q.buckets).toHaveLength(13);
    expect(q.buckets[0].start).toBe(q.from);
    expect(q.buckets[12].end).toBe(q.to);
    for (let i = 1; i < q.buckets.length; i++) {
      expect(q.buckets[i].start).toBe(addDays(q.buckets[i - 1].end, 1));
    }
    expect(q.buckets.reduce((n, b) => n + b.units, 0)).toBe(q.totals.units);
  });
});

describe("example data", () => {
  it("is the same on every visit and ends on the example date", () => {
    const a = exampleData();

    expect(exampleData()).toEqual(a);
    expect(a.sales.every((s) => s.date <= EXAMPLE_AS_OF)).toBe(true);
    expect(new Set(a.sales.map((s) => s.productId)).size).toBe(a.products.length);
  });

  it("shows the kinds of alerts the dashboard is for", () => {
    const titles = summarise(exampleData(), 30).insights.map((i) => i.title);

    expect(titles).toContain("Ads on LED reading light are losing money");
    expect(titles.some((t) => t.startsWith("Reorder "))).toBe(true);
    expect(titles).toContain("Aluminium phone stand is selling slowly");
  });
});
