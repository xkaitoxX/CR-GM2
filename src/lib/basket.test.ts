import { describe, expect, it } from "vitest";
import { planBasket, restockBasket, type BasketCandidate } from "./basket";

const A: BasketCandidate = { name: "Garlic press", buyPrice: 6, sellPrice: 16.99, monthlySales: 30 };
const B: BasketCandidate = { name: "Cable box", buyPrice: 4.2, sellPrice: 12.99, fulfilmentFee: 2.2, monthlySales: 60 };
const C: BasketCandidate = { name: "Loss maker", buyPrice: 9, sellPrice: 10, monthlySales: 30 };
const D: BasketCandidate = { name: "Slow seller", buyPrice: 5, sellPrice: 15, monthlySales: 0.5 };
const E: BasketCandidate = { name: "Water bottle", buyPrice: 3, sellPrice: 11.49, fulfilmentFee: 2.4, monthlySales: 20, moq: 50 };
const all = [A, B, C, D, E];

describe("planBasket: test buy", () => {
  const basket = planBasket(100, all, "test");

  it("buys 5-10 of several items, best return first, within budget", () => {
    expect(basket.lines.map((l) => [l.name, l.quantity])).toEqual([
      ["Garlic press", 10],
      ["Cable box", 6],
    ]);
    expect(basket.spend).toBeCloseTo(96.4, 6);
    expect(basket.leftover).toBeCloseTo(3.6, 6);
    expect(basket.expectedProfit).toBeCloseTo(10 * 3.988236 + 6 * 2.889836, 5);
    expect(basket.spend).toBeLessThanOrEqual(basket.budget);
  });

  it("explains every item it left out", () => {
    expect(basket.skipped).toEqual([
      { name: "Water bottle", reason: "Minimum order of 50 is too big for a test buy." },
      { name: "Slow seller", reason: "Sells too slowly." },
      { name: "Loss maker", reason: "Loses money at this price." },
    ]);
  });

  it("works out how long each line takes to sell", () => {
    expect(basket.lines[0].daysToSell).toBe(10);
    expect(basket.lines[1].daysToSell).toBe(3);
  });
});

describe("planBasket: bigger order", () => {
  const basket = planBasket(400, all, "scale");

  it("caps each item at 40% of the budget and keeps the rest as a reserve", () => {
    expect(basket.lines.map((l) => [l.name, l.quantity])).toEqual([
      ["Garlic press", 23],
      ["Cable box", 32],
    ]);
    for (const line of basket.lines) expect(line.spend).toBeLessThanOrEqual(0.4 * 400);
    expect(basket.leftover).toBeCloseTo(89.1, 6);
  });

  it("skips a minimum order that would take too much of the budget", () => {
    expect(basket.skipped[0]).toEqual({
      name: "Water bottle",
      reason: "Minimum order of 50 would use more than 40% of the budget.",
    });
  });

  it("never buys more than sells in about 45 days", () => {
    const b = planBasket(10000, [{ ...A, monthlySales: 10 }], "scale");
    expect(b.lines[0].quantity).toBe(15);
  });
});

describe("restockBasket", () => {
  const basket = restockBasket(200, [
    { name: "Garlic press", buyPrice: 6, sellPrice: 16.99, fulfilmentFee: 2.5, stockAtAmazon: 4, dailySales: 1 },
    { name: "Cable box", buyPrice: 4.2, sellPrice: 12.99, fulfilmentFee: 2.2, stockAtAmazon: 50, dailySales: 1 },
    { name: "Phone stand", buyPrice: 4, sellPrice: 9.99, fulfilmentFee: 2.2, stockAtAmazon: 30, dailySales: 0 },
    { name: "Loss maker", buyPrice: 9, sellPrice: 10, fulfilmentFee: 2.5, stockAtAmazon: 2, dailySales: 1 },
  ]);

  it("reorders the most urgent items up to 45 days of stock, within budget", () => {
    expect(basket.lines.map((l) => [l.name, l.quantity])).toEqual([["Garlic press", 29]]);
    expect(basket.spend).toBeCloseTo(194.3, 6);
  });

  it("says why other items aren't reordered", () => {
    expect(basket.skipped).toEqual([
      { name: "Loss maker", reason: "Loses money, so don't restock it." },
      { name: "Cable box", reason: "Enough stock for about 50 days." },
      { name: "Phone stand", reason: "No recent sales." },
    ]);
  });
});
