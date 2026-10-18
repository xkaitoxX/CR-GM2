// How much an item can afford to spend on Amazon ads without losing money.

export interface AdBudget {
  worthAdvertising: boolean;
  /** Ad cost per sale at which the item makes no profit, as % of the price. */
  breakEvenAcosPercent: number;
  /** Aim for ad cost per sale below this. */
  targetAcosPercent: number;
  /** £ highest bid per click that stays profitable with a safety margin. */
  maxBidPerClick: number;
  /** £ starting daily budget. */
  dailyBudget: number;
  advice: string;
}

export const DEFAULT_CONVERSION_PERCENT = 10;
/** Keep 40% of the break-even amount as a safety margin. */
export const SAFETY = 0.6;
/** Start small: £3-£5 a day, only for items already making a profit. */
export const MIN_DAILY = 3;
export const MAX_DAILY = 5;
/** Bids below this rarely win any clicks. */
export const MIN_USEFUL_BID = 0.1;
const CLICKS_PER_DAY = 20;

const gbp = (n: number) => `£${n.toFixed(2)}`;

export function suggestAdBudget(
  price: number,
  profitBeforeAds: number,
  conversionRatePercent = DEFAULT_CONVERSION_PERCENT,
): AdBudget {
  if (profitBeforeAds <= 0 || price <= 0) {
    return {
      worthAdvertising: false,
      breakEvenAcosPercent: 0,
      targetAcosPercent: 0,
      maxBidPerClick: 0,
      dailyBudget: 0,
      advice: "Don't advertise this item: it doesn't make a profit yet, so every ad sale would lose money.",
    };
  }

  const breakEvenAcosPercent = (profitBeforeAds / price) * 100;
  const maxBidPerClick = Math.floor(profitBeforeAds * (conversionRatePercent / 100) * SAFETY * 100) / 100;
  const dailyBudget = Math.round(Math.min(MAX_DAILY, Math.max(MIN_DAILY, maxBidPerClick * CLICKS_PER_DAY)) * 100) / 100;
  const worthAdvertising = maxBidPerClick >= MIN_USEFUL_BID;

  return {
    worthAdvertising,
    breakEvenAcosPercent,
    targetAcosPercent: breakEvenAcosPercent * SAFETY,
    maxBidPerClick,
    dailyBudget: worthAdvertising ? dailyBudget : 0,
    advice: worthAdvertising
      ? `Start with ${gbp(dailyBudget)} a day and bid no more than ${gbp(maxBidPerClick)} per click. Pause any keyword whose ad cost per sale goes above ${Math.round(breakEvenAcosPercent * SAFETY)}% of the price.`
      : `The profit per item is too small for ads: the most you could bid is ${gbp(maxBidPerClick)} per click, which rarely wins. Raise the price or buy cheaper first.`,
  };
}
