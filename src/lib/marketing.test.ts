import { describe, expect, it } from "vitest";
import { suggestAdBudget } from "./ads";
import { checkListing } from "./listing";

describe("suggestAdBudget", () => {
  it("keeps bids and budget inside what the profit can pay for", () => {
    const a = suggestAdBudget(16.99, 3.99);

    expect(a.worthAdvertising).toBe(true);
    expect(a.breakEvenAcosPercent).toBeCloseTo(23.48, 2);
    expect(a.targetAcosPercent).toBeCloseTo(14.09, 2);
    expect(a.maxBidPerClick).toBe(0.23);
    expect(a.dailyBudget).toBe(4.6);
    expect(a.advice).toMatch(/Start with £4\.60 a day and bid no more than £0\.23 per click/);
  });

  it("keeps the daily budget between £3 and £5", () => {
    expect(suggestAdBudget(40, 20).dailyBudget).toBe(5);
    expect(suggestAdBudget(16.99, 2).dailyBudget).toBe(3);
  });

  it("says not to advertise items with too little or no profit", () => {
    expect(suggestAdBudget(9.99, 0.64)).toMatchObject({ worthAdvertising: false, dailyBudget: 0 });
    expect(suggestAdBudget(9.99, 0.64).advice).toMatch(/too small for ads/);
    expect(suggestAdBudget(14.99, -1).advice).toMatch(/doesn't make a profit/);
  });
});

describe("checkListing", () => {
  it("passes a clean listing", () => {
    const c = checkListing({
      title: "Stainless Steel Garlic Press with Silicone Peeler, Dishwasher Safe",
      bullets: ["Crushes garlic with little effort.", "Easy to clean: dishwasher safe."],
    });

    expect(c).toEqual({ ok: true, problems: [], warnings: [] });
  });

  it("finds rule breaks: length, restricted characters, repeated words, too many bullets", () => {
    const c = checkListing({
      title: `Garlic Press Garlic Crusher Garlic Mincer! ${"x".repeat(200)}`,
      bullets: ["1", "2", "3", "4", "5", "6"],
    });

    expect(c.ok).toBe(false);
    expect(c.problems).toEqual([
      expect.stringMatching(/^The title is 2\d\d characters; Amazon allows 200\.$/),
      "The title uses characters Amazon doesn't allow: !",
      "The title uses the same word more than twice: garlic",
      "There are 6 bullet points; use 5 at most.",
    ]);
  });

  it("warns about promotional claims, long bullets and long titles", () => {
    const c = checkListing({
      title: "Best Seller Garlic Press, the Cheapest Kitchen Tool for Mincing Garlic and Ginger Quickly at Home",
      bullets: ["y".repeat(260)],
      description: "Free delivery and a 100% money back guarantee.",
    });

    expect(c.ok).toBe(true);
    expect(c.warnings).toEqual([
      "Bullet point 1 is 260 characters; keep it under 250 so it's easy to read.",
      "Only about the first 80 characters of the title show on phones. Put the most important words first.",
      'Avoid promotional claims Amazon may remove: "best seller", "free delivery", "100%", "guarantee", "cheapest"',
    ]);
  });

  it("doesn't count small words or flag words that only contain a promo word", () => {
    const c = checkListing({ title: "Salad Spinner with Lid and Bowl and Strainer and Handle", bullets: [] });

    expect(c.problems).toEqual([]);
    expect(c.warnings).toEqual([]);
  });
});
