// Suggests a selling price that competes with other sellers while still making a profit.
import { calculateProfit, maxBuyPriceForGoodDeal, type ProfitInputs, type Verdict } from "@/lib/profit";

export interface CompetitorOffer {
  /** £ the customer pays for this offer, including any delivery charge. */
  price: number;
  /** Who stores and ships it: another FBA seller, a seller shipping it themselves (FBM), or Amazon itself. */
  fulfilment: "fba" | "fbm" | "amazon";
}

export interface PriceOption {
  label: string;
  price: number;
  profitPerItem: number;
  roiPercent: number;
  verdict: Verdict;
}

export interface PriceSuggestion {
  breakEvenPrice: number | null;
  /** Lowest price that is still a good deal. */
  goodDealPrice: number | null;
  options: PriceOption[];
  recommended: PriceOption | null;
  advice: string;
  warnings: string[];
}

/** Above this many sellers on one listing, sales get split thinly. */
export const CROWDED_LISTING_SELLERS = 10;

const roundPrice = (n: number) => Math.round(n * 100) / 100;
const gbp = (n: number) => `£${n.toFixed(2)}`;

export function suggestPrices(
  costs: Omit<ProfitInputs, "sellPrice">,
  offers: CompetitorOffer[],
  buyBoxPrice?: number,
): PriceSuggestion {
  const at = (sellPrice: number) => calculateProfit({ ...costs, sellPrice });
  const option = (label: string, price: number): PriceOption => {
    const r = at(price);
    return { label, price, profitPerItem: r.profitPerUnit, roiPercent: r.roiPercent, verdict: r.verdict };
  };

  // Floors don't depend on the sell price we pass here.
  const floors = at(0);
  const breakEvenPrice = floors.breakEvenSellPrice;
  const goodDealPrice = floors.goodDealSellPrice === null ? null : Math.ceil(floors.goodDealSellPrice * 100) / 100;

  // FBA sellers mostly compete with other FBA offers (and Amazon) for the Buy Box.
  const fbaPrices = offers.filter((o) => o.fulfilment !== "fbm").map((o) => o.price);
  const lowestFba = fbaPrices.length ? Math.min(...fbaPrices) : undefined;
  const lowestAny = offers.length ? Math.min(...offers.map((o) => o.price)) : undefined;

  const candidates: [string, number | undefined][] = [
    ["Match the Buy Box", buyBoxPrice],
    ["Match the lowest FBA offer", lowestFba],
    ["1p below the lowest FBA offer", lowestFba === undefined ? undefined : lowestFba - 0.01],
    ["Lowest price that's still a good deal", goodDealPrice ?? undefined],
  ];
  const seen = new Set<number>();
  const options = candidates.flatMap(([label, price]) => {
    if (price === undefined || price <= 0) return [];
    const rounded = roundPrice(price);
    if (seen.has(rounded)) return [];
    seen.add(rounded);
    return [option(label, rounded)];
  });

  const warnings: string[] = [];
  if (offers.some((o) => o.fulfilment === "amazon")) {
    warnings.push("Amazon sells this item itself and usually wins the Buy Box. Think twice before buying it.");
  }
  if (offers.length >= CROWDED_LISTING_SELLERS) {
    warnings.push(`${offers.length} sellers share this listing, so sales will be split between many sellers.`);
  }

  const target = buyBoxPrice ?? lowestFba ?? lowestAny;
  if (target === undefined) {
    return {
      breakEvenPrice,
      goodDealPrice,
      options,
      recommended: null,
      advice:
        goodDealPrice === null
          ? "No competitor prices yet, and no price makes this a good deal."
          : `No competitor prices yet. Don't sell below ${gbp(goodDealPrice)} if you want a good deal.`,
      warnings,
    };
  }

  const targetPrice = roundPrice(target);
  const recommendation = option(
    buyBoxPrice !== undefined ? "Match the Buy Box" : lowestFba !== undefined ? "Match the lowest FBA offer" : "Match the lowest offer",
    targetPrice,
  );
  const maxBuy = maxBuyPriceForGoodDeal({ ...costs, sellPrice: targetPrice });
  const buyHint =
    maxBuy === null
      ? "No buy price makes this a good deal at that price."
      : `To make it a good deal at that price, buy it for ${gbp(Math.floor(maxBuy * 100) / 100)} or less.`;

  if (breakEvenPrice === null || targetPrice < breakEvenPrice) {
    return {
      breakEvenPrice,
      goodDealPrice,
      options,
      recommended: null,
      advice: `Competitors sell at ${gbp(targetPrice)}, below your break-even price${breakEvenPrice === null ? "" : ` of ${gbp(breakEvenPrice)}`}. You'd lose money matching them. ${buyHint}`,
      warnings,
    };
  }

  const advice =
    recommendation.verdict === "good"
      ? `Sell at ${gbp(targetPrice)} to match competitors and keep a good profit. Matching is better than undercutting: it avoids a price war, and FBA sellers at similar prices often share the Buy Box.`
      : `You can match competitors at ${gbp(targetPrice)}, but the profit is thin. ${buyHint}`;
  return { breakEvenPrice, goodDealPrice, options, recommended: recommendation, advice, warnings };
}
