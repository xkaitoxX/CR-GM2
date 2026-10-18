import { describe, expect, it } from "vitest";
import { suggestPrices, type CompetitorOffer } from "./pricing";
import { calculateProfit, DEFAULT_INPUTS, maxBuyPriceForGoodDeal } from "./profit";

const { sellPrice: _, ...costs } = DEFAULT_INPUTS;
const fba = (price: number): CompetitorOffer => ({ price, fulfilment: "fba" });

describe("goodDealSellPrice and maxBuyPriceForGoodDeal", () => {
  it("finds the lowest price that is still a good deal", () => {
    const r = calculateProfit(DEFAULT_INPUTS);

    expect(r.goodDealSellPrice).toBeCloseTo(15.7795, 3);
    const atFloor = calculateProfit({ ...DEFAULT_INPUTS, sellPrice: r.goodDealSellPrice! });
    expect(atFloor.profitPerUnit).toBeCloseTo(3, 9);
  });

  it("finds the highest buy price that is still a good deal", () => {
    const max = maxBuyPriceForGoodDeal(DEFAULT_INPUTS)!;

    expect(max).toBeCloseTo(6.988236, 5);
    expect(calculateProfit({ ...DEFAULT_INPUTS, buyPrice: max }).profitPerUnit).toBeCloseTo(3, 9);
  });

  it("uses the return-on-money rule when it is stricter", () => {
    const inputs = { ...DEFAULT_INPUTS, sellPrice: 60 };
    const r = calculateProfit({ ...inputs, buyPrice: maxBuyPriceForGoodDeal(inputs)! });

    expect(r.profitPerUnit).toBeGreaterThan(3);
    expect(r.roiPercent).toBeCloseTo(30, 6);
  });

  it("has no good buy price when the sell price is too low", () => {
    expect(maxBuyPriceForGoodDeal({ ...DEFAULT_INPUTS, sellPrice: 5 })).toBeNull();
  });
});

describe("suggestPrices", () => {
  it("matches the Buy Box when that still makes a good profit", () => {
    const s = suggestPrices(costs, [fba(16.99), fba(17.49), { price: 15.5, fulfilment: "fbm" }], 16.99);

    expect(s.recommended).toMatchObject({ label: "Match the Buy Box", price: 16.99, verdict: "good" });
    expect(s.recommended!.profitPerItem).toBeCloseTo(3.988, 3);
    expect(s.goodDealPrice).toBe(15.78);
    expect(s.breakEvenPrice).toBeCloseTo(12.105, 3);
    expect(s.options.map((o) => o.label)).toEqual([
      "Match the Buy Box",
      "1p below the lowest FBA offer",
      "Lowest price that's still a good deal",
    ]);
    expect(s.advice).toMatch(/avoids a price war/);
    expect(s.warnings).toEqual([]);
  });

  it("ignores cheaper sellers who ship it themselves when picking the price to match", () => {
    const s = suggestPrices(costs, [fba(16.99), { price: 14, fulfilment: "fbm" }]);

    expect(s.recommended).toMatchObject({ label: "Match the lowest FBA offer", price: 16.99 });
  });

  it("says how cheap to buy when matching competitors only gives a thin profit", () => {
    const s = suggestPrices(costs, [fba(14)]);

    expect(s.recommended).toMatchObject({ price: 14, verdict: "thin" });
    expect(s.advice).toMatch(/profit is thin.*£4\.54 or less/);
  });

  it("recommends no price when competitors are below break-even", () => {
    const s = suggestPrices(costs, [fba(11)]);

    expect(s.recommended).toBeNull();
    expect(s.advice).toMatch(/below your break-even price of £12\.10/);
  });

  it("warns when Amazon sells it or the listing is crowded", () => {
    const offers = [{ price: 16.99, fulfilment: "amazon" as const }, ...Array.from({ length: 9 }, () => fba(17.5))];
    const s = suggestPrices(costs, offers);

    expect(s.warnings).toHaveLength(2);
    expect(s.warnings[0]).toMatch(/Amazon sells this item itself/);
    expect(s.warnings[1]).toMatch(/10 sellers/);
  });

  it("gives a floor price when there are no competitor prices", () => {
    const s = suggestPrices(costs, []);

    expect(s.recommended).toBeNull();
    expect(s.options).toEqual([expect.objectContaining({ price: 15.78 })]);
    expect(s.advice).toMatch(/Don't sell below £15\.78/);
  });
});
