import { describe, expect, it } from "vitest";
import { adBudgetTool, checkListingTool, planBasketTool, restockBasketTool, seasonCalendarTool } from "./marketing-tools";

const parse = async (out: unknown) => JSON.parse((await out) as string);

describe("marketing tools", () => {
  it("plan_basket returns a rounded basket", async () => {
    const b = await parse(
      planBasketTool.run({
        budget: 100,
        mode: "test",
        candidates: [{ name: "Garlic press", buyPrice: 6, sellPrice: 16.99, monthlySales: 30 }],
      }),
    );

    expect(b.lines).toEqual([
      expect.objectContaining({ name: "Garlic press", quantity: 10, costPerItem: 6.7, spend: 67, profitPerItem: 3.99 }),
    ]);
    expect(b.leftover).toBe(33);
  });

  it("restock_basket works from the dashboard data and says when it's example data", async () => {
    const b = await parse(restockBasketTool.run({ budget: 150 }));

    expect(b.isExampleData).toBe(true);
    expect(b.spend).toBeLessThanOrEqual(150);
    expect(b.lines.length).toBeGreaterThan(0);
  });

  it("get_season_calendar lists upcoming seasons from today", async () => {
    const c = await parse(seasonCalendarTool.run({ withinDays: 365 }));

    expect(c.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c.seasons.length).toBeGreaterThan(5);
    expect(c.seasons[0]).toHaveProperty("stockAtAmazonBy");
  });

  it("suggest_ad_budget and check_listing return their checks", async () => {
    expect((await parse(adBudgetTool.run({ price: 16.99, profitBeforeAds: 3.99 }))).maxBidPerClick).toBe(0.23);
    expect((await parse(checkListingTool.run({ title: "Garlic Press!", bullets: [] }))).ok).toBe(false);
  });

  it("rejects a basket with no candidates", () => {
    expect(() => planBasketTool.parse({ budget: 100, mode: "test", candidates: [] })).toThrow();
  });
});
