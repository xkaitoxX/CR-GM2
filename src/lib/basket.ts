// Picks what to buy with a budget: a small test buy of several items, or a bigger order of the
// best ones, or a restock of items that are running low.
import { calculateProfit, DEFAULT_INPUTS, type ProfitInputs } from "@/lib/profit";

export interface BasketCandidate {
  name: string;
  /** £ per item to buy, including import costs if importing. */
  buyPrice: number;
  /** £ Amazon selling price. */
  sellPrice: number;
  fulfilmentFee?: number;
  /** Items the owner can expect to sell per month. */
  monthlySales: number;
  moq?: number;
}

export type BasketMode = "test" | "scale";

export interface BasketLine {
  name: string;
  quantity: number;
  /** £ put in per item: product plus shipping and prep. */
  unitCost: number;
  spend: number;
  profitPerItem: number;
  expectedProfit: number;
  roiPercent: number;
  daysToSell: number;
}

export interface Basket {
  budget: number;
  lines: BasketLine[];
  spend: number;
  leftover: number;
  expectedProfit: number;
  roiPercent: number;
  skipped: { name: string; reason: string }[];
}

/** A test buy is 5-10 of each item: enough to learn whether it sells. */
export const TEST_MIN = 5;
export const TEST_MAX = 10;
/** No single item takes more than this share of the budget in a bigger order. */
export const MAX_SHARE = 0.4;
/** Don't buy more than sells in this many days. */
export const SELL_THROUGH_DAYS = 45;

type Costs = Partial<Omit<ProfitInputs, "buyPrice" | "sellPrice" | "quantity" | "fulfilmentFee">>;

function evaluate(c: BasketCandidate, costs: Costs) {
  const r = calculateProfit({
    ...DEFAULT_INPUTS,
    ...costs,
    ...(c.fulfilmentFee === undefined ? {} : { fulfilmentFee: c.fulfilmentFee }),
    buyPrice: c.buyPrice,
    sellPrice: c.sellPrice,
    quantity: 1,
  });
  return { r, maxBySales: Math.floor((c.monthlySales * SELL_THROUGH_DAYS) / 30) };
}

function totals(budget: number, lines: BasketLine[], skipped: Basket["skipped"]): Basket {
  const spend = lines.reduce((n, l) => n + l.spend, 0);
  const expectedProfit = lines.reduce((n, l) => n + l.expectedProfit, 0);
  return {
    budget,
    lines,
    spend,
    leftover: budget - spend,
    expectedProfit,
    roiPercent: spend > 0 ? (expectedProfit / spend) * 100 : 0,
    skipped,
  };
}

const line = (name: string, quantity: number, r: ReturnType<typeof calculateProfit>, dailySales: number): BasketLine => ({
  name,
  quantity,
  unitCost: r.costPerUnit,
  spend: r.costPerUnit * quantity,
  profitPerItem: r.profitPerUnit,
  expectedProfit: r.profitPerUnit * quantity,
  roiPercent: r.roiPercent,
  daysToSell: dailySales > 0 ? Math.ceil(quantity / dailySales) : Infinity,
});

export function planBasket(budget: number, candidates: BasketCandidate[], mode: BasketMode, costs: Costs = {}): Basket {
  const lines: BasketLine[] = [];
  const skipped: Basket["skipped"] = [];
  let remaining = budget;

  const evaluated = candidates
    .map((c) => ({ c, ...evaluate(c, costs) }))
    .sort((a, b) => b.r.roiPercent - a.r.roiPercent);

  for (const { c, r, maxBySales } of evaluated) {
    const moq = c.moq ?? 1;
    const unit = r.costPerUnit;
    if (r.verdict === "loss") {
      skipped.push({ name: c.name, reason: "Loses money at this price." });
      continue;
    }
    if (maxBySales < 1) {
      skipped.push({ name: c.name, reason: "Sells too slowly." });
      continue;
    }

    let quantity: number;
    if (mode === "test") {
      if (moq > TEST_MAX) {
        skipped.push({ name: c.name, reason: `Minimum order of ${moq} is too big for a test buy.` });
        continue;
      }
      const wanted = Math.max(moq, Math.min(TEST_MAX, Math.max(TEST_MIN, maxBySales)));
      quantity = Math.min(wanted, Math.floor(remaining / unit));
      if (quantity < Math.max(TEST_MIN, moq)) {
        skipped.push({ name: c.name, reason: "Not enough budget left." });
        continue;
      }
    } else {
      const cap = Math.floor((MAX_SHARE * budget) / unit);
      if (moq > cap) {
        skipped.push({ name: c.name, reason: `Minimum order of ${moq} would use more than ${MAX_SHARE * 100}% of the budget.` });
        continue;
      }
      quantity = Math.min(maxBySales, cap, Math.floor(remaining / unit));
      if (quantity < moq || quantity < 1) {
        skipped.push({ name: c.name, reason: "Not enough budget left." });
        continue;
      }
    }

    lines.push(line(c.name, quantity, r, c.monthlySales / 30));
    remaining -= quantity * unit;
  }

  return totals(budget, lines, skipped);
}

export interface RestockItem {
  name: string;
  buyPrice: number;
  sellPrice: number;
  fulfilmentFee: number;
  stockAtAmazon: number;
  /** Items sold per day lately. */
  dailySales: number;
}

/** Reorders items running low, most urgent first, to cover `targetDays` of sales. */
export function restockBasket(budget: number, items: RestockItem[], targetDays = SELL_THROUGH_DAYS, costs: Costs = {}): Basket {
  const lines: BasketLine[] = [];
  const skipped: Basket["skipped"] = [];
  let remaining = budget;

  const daysLeft = (i: RestockItem) => (i.dailySales > 0 ? i.stockAtAmazon / i.dailySales : Infinity);
  for (const item of [...items].sort((a, b) => daysLeft(a) - daysLeft(b))) {
    const { r } = evaluate({ ...item, monthlySales: item.dailySales * 30 }, costs);
    const need = Math.ceil(item.dailySales * targetDays - item.stockAtAmazon);
    if (r.verdict === "loss") {
      skipped.push({ name: item.name, reason: "Loses money, so don't restock it." });
      continue;
    }
    if (need <= 0) {
      skipped.push({
        name: item.name,
        reason: item.dailySales > 0 ? `Enough stock for about ${Math.round(daysLeft(item))} days.` : "No recent sales.",
      });
      continue;
    }
    const quantity = Math.min(need, Math.floor(remaining / r.costPerUnit));
    if (quantity < 1) {
      skipped.push({ name: item.name, reason: "Not enough budget left." });
      continue;
    }
    lines.push(line(item.name, quantity, r, item.dailySales));
    remaining -= quantity * r.costPerUnit;
  }

  return totals(budget, lines, skipped);
}
