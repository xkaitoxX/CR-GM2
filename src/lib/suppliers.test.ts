import { describe, expect, it } from "vitest";
import { compareSuppliers, landedCost, type ComparisonInput, type SupplierOffer } from "./suppliers";

const IMPORT = { dutyPercent: 4, clearanceFee: 15, importVatPercent: 20, vatRegistered: false };

const good: SupplierOffer = {
  supplier: "Good Co",
  unitPrice: 2,
  freightPerUnit: 0.5,
  moq: 100,
  leadTimeDays: 30,
  tradeAssurance: true,
  verified: true,
  yearsOnAlibaba: 5,
  hasSafetyMark: true,
};
const risky: SupplierOffer = {
  supplier: "Risky Ltd",
  unitPrice: 1,
  freightPerUnit: 0.5,
  moq: 500,
  leadTimeDays: 60,
  tradeAssurance: false,
  verified: false,
  yearsOnAlibaba: 1,
  hasSafetyMark: false,
};
const ddp: SupplierOffer = {
  supplier: "DDP Trading",
  unitPrice: 2.2,
  freightPerUnit: 0.4,
  moq: 50,
  leadTimeDays: 20,
  tradeAssurance: true,
  verified: true,
  yearsOnAlibaba: 3,
  hasSafetyMark: true,
  ddp: true,
};

const input = (offers: SupplierOffer[], overrides: Partial<ComparisonInput> = {}): ComparisonInput => ({
  sellPrice: 14.99,
  plannedQty: 100,
  budget: 400,
  needsSafetyMark: true,
  importCosts: IMPORT,
  offers,
  ...overrides,
});

describe("landedCost", () => {
  it("adds shipping, duty, clearance and import VAT when not VAT registered", () => {
    const c = landedCost(good, 100, IMPORT);

    expect(c.breakdown).toEqual({ goods: 2.5, duty: 0.1, clearance: 0.15, importVat: expect.closeTo(0.52, 9) });
    expect(c.landed).toBeCloseTo(3.27, 9);
  });

  it("leaves out import VAT for VAT-registered sellers, who claim it back", () => {
    expect(landedCost(good, 100, { ...IMPORT, vatRegistered: true }).landed).toBeCloseTo(2.75, 9);
  });

  it("counts nothing extra when the price is delivered duty paid", () => {
    expect(landedCost(ddp, 100, IMPORT).landed).toBeCloseTo(2.6, 9);
  });
});

describe("compareSuppliers", () => {
  const c = compareSuppliers(input([good, risky, ddp]));
  const bySupplier = (name: string) => c.ranked.find((o) => o.supplier === name)!;

  it("puts the safest, most profitable offer first and recommends it", () => {
    expect(c.ranked.map((o) => o.supplier)).toEqual(["DDP Trading", "Good Co", "Risky Ltd"]);
    expect(c.recommended?.supplier).toBe("DDP Trading");
    expect(c.advice).toMatch(/DDP Trading is the best choice: £2\.60 per item/);
  });

  it("works out cash needed and profit on the landed cost", () => {
    const g = bySupplier("Good Co");

    expect(g.quantity).toBe(100);
    expect(g.cashNeeded).toBeCloseTo(327, 6);
    expect(g.profitPerItem).toBeCloseTo(5.085436, 5);
    expect(g.verdict).toBe("good");
    expect(g.flags).toEqual([]);
  });

  it("orders at least the minimum and flags every risk", () => {
    const r = bySupplier("Risky Ltd");

    expect(r.quantity).toBe(500);
    expect(r.cashNeeded).toBeCloseTo(951, 6);
    expect(r.flags.map((f) => f.text)).toEqual([
      "No Trade Assurance, so your payment isn't protected.",
      "Minimum order of 500 costs £951.00, more than your £400.00 budget.",
      "No UKCA/CE safety papers, which this item needs to be sold in the UK.",
      "Not a verified supplier.",
      "Only 1 year(s) on Alibaba.",
      "Takes 60 days to arrive.",
      "Much cheaper than the others. Order a sample to check quality.",
    ]);
  });

  it("flags offers that lose money and recommends none when nothing is safe", () => {
    const c2 = compareSuppliers(input([risky], { sellPrice: 3 }));

    expect(c2.ranked[0].flags[0]).toEqual({ severity: "serious", text: "Loses money at £3.00." });
    expect(c2.recommended).toBeNull();
    expect(c2.advice).toMatch(/None of these offers/);
  });
});
