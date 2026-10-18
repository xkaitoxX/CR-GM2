// Made-up but realistic sales so the dashboard can be tried before the Amazon account is connected.
import { addDays } from "@/lib/business/dates";
import type { AdSpend, BusinessData, Product, Sale } from "@/lib/business/types";

export const EXAMPLE_AS_OF = "2026-10-17";
// Enough history to compare the last 90 days with the 90 before.
const DAYS = 180;

interface ExampleProduct extends Product {
  /** Average units sold per day at the start and at the end of the period. */
  startRate: number;
  endRate: number;
  /** £ ad spend per day, if the product is advertised. */
  adsPerDay?: number;
}

const PRODUCTS: ExampleProduct[] = [
  { id: "garlic-press", name: "Garlic press", buyPrice: 6, fulfilmentFee: 2.5, stockAtAmazon: 34, price: 16.99, startRate: 1.1, endRate: 2 },
  { id: "cable-box", name: "Cable organiser box", buyPrice: 4.2, fulfilmentFee: 2.2, stockAtAmazon: 52, price: 12.99, startRate: 2.2, endRate: 2.6 },
  { id: "baking-mats", name: "Silicone baking mats (2)", buyPrice: 5.5, fulfilmentFee: 2.6, stockAtAmazon: 9, price: 14.99, startRate: 1.2, endRate: 1.6 },
  { id: "drawer-organiser", name: "Bamboo drawer organiser", buyPrice: 7.5, fulfilmentFee: 3.1, stockAtAmazon: 21, price: 21.99, startRate: 0.8, endRate: 0.9 },
  { id: "water-bottle", name: "Kids' water bottle", buyPrice: 3.8, fulfilmentFee: 2.4, stockAtAmazon: 30, price: 11.49, startRate: 1.4, endRate: 0.8 },
  { id: "coffee-cup", name: "Reusable coffee cup", buyPrice: 5, fulfilmentFee: 2.5, stockAtAmazon: 4, price: 13.99, startRate: 0.6, endRate: 0.9 },
  { id: "reading-light", name: "LED reading light", buyPrice: 7.2, fulfilmentFee: 2.4, stockAtAmazon: 25, price: 14.99, startRate: 0.5, endRate: 0.4, adsPerDay: 2.5 },
  { id: "phone-stand", name: "Aluminium phone stand", buyPrice: 4, fulfilmentFee: 2.2, stockAtAmazon: 38, price: 9.99, startRate: 0.12, endRate: 0.06 },
];

/** Small seeded random number generator, so the example data is the same on every visit. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(mean: number, random: () => number) {
  const limit = Math.exp(-mean);
  let k = 0;
  for (let p = random(); p > limit; p *= random()) k++;
  return k;
}

export function exampleData(): BusinessData {
  const random = seededRandom(20261017);
  const sales: Sale[] = [];
  const adSpend: AdSpend[] = [];
  const firstDay = addDays(EXAMPLE_AS_OF, -(DAYS - 1));

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(firstDay, i);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.25 : 1;

    for (const p of PRODUCTS) {
      const rate = (p.startRate + ((p.endRate - p.startRate) * i) / (DAYS - 1)) * weekendBoost;
      const units = poisson(rate, random);
      // Now and then the price moves a little to match competitors.
      const priceNudge = random() < 0.15 ? -0.5 : 0;
      if (units > 0) sales.push({ date, productId: p.id, units, unitPrice: p.price + priceNudge });
      if (p.adsPerDay) adSpend.push({ date, productId: p.id, amount: p.adsPerDay });
    }
  }

  return {
    products: PRODUCTS.map(({ startRate, endRate, adsPerDay, ...product }) => product),
    sales,
    adSpend,
    asOf: EXAMPLE_AS_OF,
    isExample: true,
  };
}

/** Where the dashboard and the agents get the business data from. */
export function getBusinessData(): BusinessData {
  return exampleData();
}
