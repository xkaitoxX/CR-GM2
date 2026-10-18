import { describe, expect, it } from "vitest";
import { pricingSummary, pricingTool } from "./pricing-tool";

describe("suggest_price tool", () => {
  it("recommends a competitive, profitable price with rounded numbers", () => {
    const s = pricingSummary({
      buyPrice: 6,
      competitorOffers: [
        { price: 16.99, fulfilment: "fba" },
        { price: 15.5, fulfilment: "fbm" },
      ],
      buyBoxPrice: 16.99,
    });

    expect(s.recommended).toEqual({
      label: "Match the Buy Box",
      price: 16.99,
      profitPerItem: 3.99,
      roiPercent: 59.5,
      verdict: "good",
    });
    expect(s.breakEvenPrice).toBe(12.1);
    expect(s.goodDealPrice).toBe(15.78);
    expect(s.costsUsed).not.toHaveProperty("sellPrice");
    expect(s.costsUsed.fulfilmentFee).toBe(2.5);
  });

  it("returns JSON the agent can read", async () => {
    const out = await pricingTool.run({ buyPrice: 6, competitorOffers: [{ price: 11, fulfilment: "fba" }] });

    expect(JSON.parse(out as string).recommended).toBeNull();
  });

  it("rejects an unknown kind of seller", () => {
    expect(() =>
      pricingTool.parse({ buyPrice: 6, competitorOffers: [{ price: 10, fulfilment: "ebay" }] }),
    ).toThrow();
  });
});
