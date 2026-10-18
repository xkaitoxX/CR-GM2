import { describe, expect, it } from "vitest";
import { calculateProfit, DEFAULT_INPUTS, type ProfitInputs } from "./profit";

const inputs = (overrides: Partial<ProfitInputs> = {}): ProfitInputs => ({
  ...DEFAULT_INPUTS,
  ...overrides,
});

describe("calculateProfit", () => {
  it("charges VAT on Amazon fees when not VAT registered", () => {
    const r = calculateProfit(inputs());

    expect(r.outputVat).toBe(0);
    expect(r.revenue).toBeCloseTo(16.99, 6);
    expect(r.referralFee).toBeCloseTo(2.5485, 6);
    expect(r.digitalServicesFee).toBeCloseTo(0.10297, 6);
    expect(r.vatOnFees).toBeCloseTo(1.050294, 6);
    expect(r.totalAmazonFees).toBeCloseTo(6.301764, 6);
    expect(r.productCost).toBe(6);
    expect(r.extraCosts).toBeCloseTo(0.7, 6);
    expect(r.profitPerUnit).toBeCloseTo(3.988236, 6);
    expect(r.roiPercent).toBeCloseTo(59.5259, 3);
    expect(r.marginPercent).toBeCloseTo(23.4740, 3);
    expect(r.totalInvestment).toBeCloseTo(67, 6);
    expect(r.totalProfit).toBeCloseTo(39.88236, 5);
    expect(r.verdict).toBe("good");
  });

  it("removes VAT from the sale and reclaims it on costs when VAT registered", () => {
    const r = calculateProfit(inputs({ vatRegistered: true }));

    expect(r.outputVat).toBeCloseTo(2.831667, 6);
    expect(r.revenue).toBeCloseTo(14.158333, 6);
    expect(r.vatOnFees).toBe(0);
    expect(r.totalAmazonFees).toBeCloseTo(5.25147, 6);
    expect(r.productCost).toBeCloseTo(5, 6);
    expect(r.profitPerUnit).toBeCloseTo(3.206863, 6);
  });

  it("keeps the full buy price when it has no reclaimable VAT", () => {
    const r = calculateProfit(inputs({ vatRegistered: true, buyPriceIncludesVat: false }));

    expect(r.productCost).toBe(6);
  });

  it("finds the sell price where profit is zero", () => {
    const r = calculateProfit(inputs());

    expect(r.breakEvenSellPrice).toBeCloseTo(12.10485, 4);
    const atBreakEven = calculateProfit(inputs({ sellPrice: r.breakEvenSellPrice! }));
    expect(atBreakEven.profitPerUnit).toBeCloseTo(0, 9);
  });

  it("has no break-even price when fees take the whole sale", () => {
    const r = calculateProfit(inputs({ referralFeePercent: 100 }));

    expect(r.breakEvenSellPrice).toBeNull();
  });

  it("marks a small profit as thin", () => {
    const r = calculateProfit(inputs({ sellPrice: 13 }));

    expect(r.profitPerUnit).toBeCloseTo(0.7308, 4);
    expect(r.verdict).toBe("thin");
  });

  it("marks a good profit with a low return on money as thin", () => {
    const r = calculateProfit(inputs({ buyPrice: 30, sellPrice: 50 }));

    expect(r.profitPerUnit).toBeCloseTo(6.9376, 4);
    expect(r.roiPercent).toBeLessThan(30);
    expect(r.verdict).toBe("thin");
  });

  it("marks a loss", () => {
    const r = calculateProfit(inputs({ sellPrice: 8 }));

    expect(r.profitPerUnit).toBeLessThan(0);
    expect(r.verdict).toBe("loss");
  });
});
