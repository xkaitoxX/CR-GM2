// Turns raw sales into the dashboard's numbers: totals, trends, best sellers and alerts.
import { addDays, formatDay } from "@/lib/business/dates";
import type { BusinessData, Product } from "@/lib/business/types";
import { calculateProfit, DEFAULT_INPUTS, type ProfitResult } from "@/lib/profit";

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

/** Warn below this many days of stock; urgent below the second. */
export const LOW_STOCK_DAYS = 14;
export const VERY_LOW_STOCK_DAYS = 7;
/** An item selling this many or fewer in 30 days, with plenty in stock, is a slow seller. */
export const SLOW_SELLER_UNITS_PER_30_DAYS = 4;
const SLOW_SELLER_MIN_STOCK = 10;
/** Profit changes smaller than this (%) count as steady. */
const STEADY_CHANGE_PERCENT = 5;

export interface Totals {
  sales: number;
  profit: number;
  units: number;
  adSpend: number;
  /** Money put in for the items sold: product cost, shipping, prep and ads. */
  moneySpent: number;
  roiPercent: number;
  profitPerItem: number;
}

export interface ProductRow {
  id: string;
  name: string;
  units: number;
  sales: number;
  /** Profit after ads. */
  profit: number;
  profitPerItem: number;
  marginPercent: number;
  adSpend: number;
  stockAtAmazon: number;
  /** At the last 30 days' pace. Null when nothing sold. */
  daysOfStockLeft: number | null;
}

export interface Bucket {
  start: string;
  end: string;
  label: string;
  sales: number;
  profit: number;
  units: number;
}

export type BreakdownKey = "profit" | "productCost" | "amazonFees" | "vatOnFees" | "vatOnSales" | "shippingPrep" | "ads";

export interface BreakdownPart {
  key: BreakdownKey;
  label: string;
  amount: number;
}

export interface Insight {
  severity: "critical" | "warning" | "good" | "info";
  title: string;
  text: string;
}

export interface DashboardSummary {
  days: PeriodDays;
  from: string;
  to: string;
  isExample: boolean;
  totals: Totals;
  previous: Totals;
  bucketSize: "day" | "week";
  buckets: Bucket[];
  /** Highest profit first. */
  products: ProductRow[];
  /** Where the sales money went. Adds up to total sales. */
  breakdown: BreakdownPart[];
  stockUnits: number;
  /** What the stock at Amazon cost to buy. */
  stockValue: number;
  insights: Insight[];
}

interface Tally {
  sales: number;
  units: number;
  profitBeforeAds: number;
  productCost: number;
  amazonFees: number;
  vatOnFees: number;
  vatOnSales: number;
  shippingPrep: number;
  adSpend: number;
}

const emptyTally = (): Tally => ({
  sales: 0,
  units: 0,
  profitBeforeAds: 0,
  productCost: 0,
  amazonFees: 0,
  vatOnFees: 0,
  vatOnSales: 0,
  shippingPrep: 0,
  adSpend: 0,
});

const gbp = (n: number) => `£${n.toFixed(2)}`;

function toTotals(t: Tally): Totals {
  const profit = t.profitBeforeAds - t.adSpend;
  const moneySpent = t.productCost + t.shippingPrep + t.adSpend;
  return {
    sales: t.sales,
    profit,
    units: t.units,
    adSpend: t.adSpend,
    moneySpent,
    roiPercent: moneySpent > 0 ? (profit / moneySpent) * 100 : 0,
    profitPerItem: t.units > 0 ? profit / t.units : 0,
  };
}

export function summarise(data: BusinessData, days: PeriodDays): DashboardSummary {
  const to = data.asOf;
  const from = addDays(to, -(days - 1));
  const previousFrom = addDays(from, -days);
  const last30From = addDays(to, -29);
  const products = new Map(data.products.map((p) => [p.id, p]));

  const economics = new Map<string, ProfitResult>();
  const unitEconomics = (product: Product, price: number) => {
    const key = `${product.id}|${price}`;
    let r = economics.get(key);
    if (!r) {
      r = calculateProfit({
        ...DEFAULT_INPUTS,
        buyPrice: product.buyPrice,
        fulfilmentFee: product.fulfilmentFee,
        sellPrice: price,
        quantity: 1,
      });
      economics.set(key, r);
    }
    return r;
  };

  const bucketSize = days > 30 ? "week" : "day";
  const width = bucketSize === "week" ? 7 : 1;
  const bucketCount = Math.ceil(days / width);
  // Buckets end on the last day; the first one may be shorter.
  const buckets: (Bucket & { tally: Tally })[] = Array.from({ length: bucketCount }, (_, i) => {
    const end = addDays(to, -(bucketCount - 1 - i) * width);
    const start = i === 0 ? from : addDays(end, -(width - 1));
    return { start, end, label: formatDay(start), sales: 0, profit: 0, units: 0, tally: emptyTally() };
  });
  const bucketFor = (date: string) => buckets.find((b) => date >= b.start && date <= b.end)!;

  const current = emptyTally();
  const previous = emptyTally();
  const byProduct = new Map(data.products.map((p) => [p.id, emptyTally()]));
  const unitsLast30 = new Map<string, number>();

  for (const sale of data.sales) {
    const product = products.get(sale.productId);
    if (!product) continue;
    if (sale.date >= last30From && sale.date <= to) {
      unitsLast30.set(product.id, (unitsLast30.get(product.id) ?? 0) + sale.units);
    }
    const inCurrent = sale.date >= from && sale.date <= to;
    const inPrevious = sale.date >= previousFrom && sale.date < from;
    if (!inCurrent && !inPrevious) continue;

    const r = unitEconomics(product, sale.unitPrice);
    const add = (t: Tally) => {
      t.sales += sale.unitPrice * sale.units;
      t.units += sale.units;
      t.profitBeforeAds += r.profitPerUnit * sale.units;
      t.productCost += r.productCost * sale.units;
      t.amazonFees += (r.totalAmazonFees - r.vatOnFees) * sale.units;
      t.vatOnFees += r.vatOnFees * sale.units;
      t.vatOnSales += r.outputVat * sale.units;
      t.shippingPrep += r.extraCosts * sale.units;
    };
    if (inPrevious) add(previous);
    if (inCurrent) {
      add(current);
      add(byProduct.get(product.id)!);
      add(bucketFor(sale.date).tally);
    }
  }

  for (const ad of data.adSpend) {
    if (!products.has(ad.productId)) continue;
    if (ad.date >= previousFrom && ad.date < from) previous.adSpend += ad.amount;
    if (ad.date >= from && ad.date <= to) {
      current.adSpend += ad.amount;
      byProduct.get(ad.productId)!.adSpend += ad.amount;
      bucketFor(ad.date).tally.adSpend += ad.amount;
    }
  }

  const rows: ProductRow[] = data.products
    .map((p) => {
      const t = toTotals(byProduct.get(p.id)!);
      const dailyUnits = (unitsLast30.get(p.id) ?? 0) / 30;
      return {
        id: p.id,
        name: p.name,
        units: t.units,
        sales: t.sales,
        profit: t.profit,
        profitPerItem: t.profitPerItem,
        marginPercent: t.sales > 0 ? (t.profit / t.sales) * 100 : 0,
        adSpend: t.adSpend,
        stockAtAmazon: p.stockAtAmazon,
        daysOfStockLeft: dailyUnits > 0 ? p.stockAtAmazon / dailyUnits : null,
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const totals = toTotals(current);
  const previousTotals = toTotals(previous);

  const breakdown: BreakdownPart[] = (
    [
      ["profit", "Your profit", Math.max(0, totals.profit)],
      ["productCost", "Buying the items", current.productCost],
      ["amazonFees", "Amazon fees", current.amazonFees],
      ["vatOnFees", "VAT on Amazon fees", current.vatOnFees],
      ["vatOnSales", "VAT on sales", current.vatOnSales],
      ["shippingPrep", "Shipping and prep", current.shippingPrep],
      ["ads", "Ads", current.adSpend],
    ] as const
  )
    .filter(([, , amount]) => amount > 0)
    .map(([key, label, amount]) => ({ key, label, amount }));

  return {
    days,
    from,
    to,
    isExample: data.isExample,
    totals,
    previous: previousTotals,
    bucketSize,
    buckets: buckets.map(({ tally, ...b }) => {
      const t = toTotals(tally);
      return { ...b, sales: t.sales, profit: t.profit, units: t.units };
    }),
    products: rows,
    breakdown,
    stockUnits: data.products.reduce((n, p) => n + p.stockAtAmazon, 0),
    stockValue: data.products.reduce((n, p) => n + p.stockAtAmazon * p.buyPrice, 0),
    insights: findInsights(days, totals, previousTotals, rows, unitsLast30),
  };
}

const SEVERITY_ORDER: Insight["severity"][] = ["critical", "warning", "good", "info"];

function findInsights(
  days: number,
  totals: Totals,
  previous: Totals,
  rows: ProductRow[],
  unitsLast30: Map<string, number>,
): Insight[] {
  const insights: Insight[] = [];

  for (const row of rows) {
    if (row.daysOfStockLeft !== null && row.daysOfStockLeft < LOW_STOCK_DAYS) {
      const daysLeft = Math.max(1, Math.round(row.daysOfStockLeft));
      insights.push({
        severity: row.daysOfStockLeft < VERY_LOW_STOCK_DAYS ? "critical" : "warning",
        title: `Reorder ${row.name}`,
        text: `About ${daysLeft} day${daysLeft === 1 ? "" : "s"} of stock left at Amazon (${row.stockAtAmazon} items). Running out hurts your ranking.`,
      });
    }
    if (row.adSpend > 0 && row.profit < 0) {
      insights.push({
        severity: "critical",
        title: `Ads on ${row.name} are losing money`,
        text: `You spent ${gbp(row.adSpend)} on ads and the item made a ${gbp(-row.profit)} loss after ads. Lower the ad budget or pause the ads.`,
      });
    }
    const sold30 = unitsLast30.get(row.id) ?? 0;
    const lowStock = row.daysOfStockLeft !== null && row.daysOfStockLeft < LOW_STOCK_DAYS;
    if (sold30 <= SLOW_SELLER_UNITS_PER_30_DAYS && row.stockAtAmazon >= SLOW_SELLER_MIN_STOCK && !lowStock) {
      insights.push({
        severity: "warning",
        title: `${row.name} is selling slowly`,
        text: `Only ${sold30} sold in the last 30 days, with ${row.stockAtAmazon} still in stock. Try a lower price, or stop restocking it.`,
      });
    }
  }

  if (previous.profit > 0) {
    const change = ((totals.profit - previous.profit) / previous.profit) * 100;
    const compared = `${gbp(totals.profit)} in the last ${days} days, against ${gbp(previous.profit)} the ${days} days before.`;
    insights.push(
      Math.abs(change) < STEADY_CHANGE_PERCENT
        ? { severity: "info", title: "Profit is steady", text: compared }
        : change > 0
          ? { severity: "good", title: `Profit is up ${Math.round(change)}%`, text: compared }
          : { severity: "warning", title: `Profit is down ${Math.round(-change)}%`, text: compared },
    );
  }

  const top = rows[0];
  if (top && top.profit > 0 && totals.profit > 0) {
    insights.push({
      severity: "good",
      title: `Top earner: ${top.name}`,
      text: `Made ${gbp(top.profit)} profit (${Math.round((top.profit / totals.profit) * 100)}% of the total) from ${top.units} sold.`,
    });
  }
  const popular = [...rows].sort((a, b) => b.units - a.units)[0];
  if (popular && popular.units > 0 && popular.id !== top?.id) {
    insights.push({
      severity: "info",
      title: `Best seller: ${popular.name}`,
      text: `${popular.units} sold, more than any other item.`,
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}
