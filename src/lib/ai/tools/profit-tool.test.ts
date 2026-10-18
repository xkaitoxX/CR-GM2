import { describe, expect, it } from "vitest";
import { profitSummary, profitTool } from "./profit-tool";

describe("calculate_profit tool", () => {
  it("fills in defaults for fields the agent leaves out", () => {
    const s = profitSummary({ buyPrice: 6, sellPrice: 16.99, fulfilmentFee: undefined });

    expect(s.inputsUsed.fulfilmentFee).toBe(2.5);
    expect(s.inputsUsed.vatRegistered).toBe(false);
    expect(s.profitPerItem).toBe(3.99);
    expect(s.verdict).toBe("good");
    expect(s.returnOnMoneyPercent).toBe(59.5);
    expect(s.breakEvenAmazonPrice).toBe(12.1);
    expect(s.forQuantity).toEqual({ quantity: 10, moneyToSpend: 67, totalProfit: 39.88 });
  });

  it("uses the numbers the agent gives", () => {
    const s = profitSummary({ buyPrice: 6, sellPrice: 16.99, fulfilmentFee: 3.5, quantity: 4 });

    expect(s.inputsUsed.fulfilmentFee).toBe(3.5);
    expect(s.profitPerItem).toBeLessThan(3.99);
    expect(s.forQuantity.quantity).toBe(4);
  });

  it("returns JSON the agent can read", async () => {
    const out = await profitTool.run({ buyPrice: 6, sellPrice: 8 });

    expect(JSON.parse(out as string).verdict).toBe("loss");
  });

  it("rejects impossible input", () => {
    expect(() => profitTool.parse({ buyPrice: -1, sellPrice: 10 })).toThrow();
  });
});
