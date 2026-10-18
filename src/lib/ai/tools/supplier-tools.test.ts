import { describe, expect, it } from "vitest";
import { compareSuppliersTool, supplierSummary } from "./supplier-tools";

const offer = {
  supplier: "Good Co",
  unitPrice: 2,
  freightPerUnit: 0.5,
  moq: 100,
  tradeAssurance: true,
  verified: true,
  yearsOnAlibaba: 5,
  hasSafetyMark: true,
};

describe("compare_suppliers tool", () => {
  it("uses the default clearance fee and rounds money for the agent", () => {
    const s = supplierSummary({
      sellPrice: 14.99,
      plannedQty: 100,
      budget: 400,
      needsSafetyMark: true,
      dutyPercent: 4,
      offers: [offer],
    });

    expect(s.recommended).toBe("Good Co");
    expect(s.ranked[0]).toMatchObject({
      landedCostPerItem: 3.27,
      cashNeeded: 327,
      profitPerItem: 5.09,
      breakdown: { goodsAndShipping: 2.5, duty: 0.1, clearance: 0.15, importVat: 0.52 },
    });
  });

  it("returns JSON and rejects offers without a price", async () => {
    const out = await compareSuppliersTool.run({
      sellPrice: 14.99,
      plannedQty: 100,
      budget: 400,
      needsSafetyMark: false,
      dutyPercent: 0,
      offers: [offer],
    });

    expect(JSON.parse(out as string).ranked).toHaveLength(1);
    expect(() =>
      compareSuppliersTool.parse({ sellPrice: 10, plannedQty: 1, budget: 1, needsSafetyMark: false, dutyPercent: 0, offers: [{ supplier: "X" }] }),
    ).toThrow();
  });
});
