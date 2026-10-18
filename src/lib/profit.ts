// Profit maths for reselling one item on Amazon UK with FBA.
// All money values are in pounds (GBP) per unit unless the name says otherwise.

export interface ProfitInputs {
  /** What you pay the shop or supplier for one unit. */
  buyPrice: number;
  /** The price the customer pays on Amazon (UK prices include VAT). */
  sellPrice: number;
  /** Amazon's selling (referral) fee as a % of the sell price. 15% for most categories. */
  referralFeePercent: number;
  /** FBA fee per unit for picking, packing and delivering. Depends on size and weight. */
  fulfilmentFee: number;
  /** Estimated storage fee per unit until it sells. */
  storageFeePerUnit: number;
  /** Cost of shipping one unit to Amazon's warehouse. */
  shippingToAmazonPerUnit: number;
  /** Labels, bags and other prep per unit. */
  prepCostPerUnit: number;
  otherCostsPerUnit: number;
  /** Surcharge Amazon adds on top of its fees in the UK (digital services fee). */
  digitalServicesFeePercent: number;
  vatRegistered: boolean;
  vatRatePercent: number;
  /** True if the buy price includes VAT you can reclaim (only matters when VAT registered). */
  buyPriceIncludesVat: boolean;
  quantity: number;
}

export type Verdict = "good" | "thin" | "loss";

export interface ProfitResult {
  /** Sell price minus the VAT you owe on the sale. */
  revenue: number;
  outputVat: number;
  referralFee: number;
  fulfilmentFee: number;
  storageFee: number;
  digitalServicesFee: number;
  /** VAT Amazon charges on its fees. A real cost when you are not VAT registered. */
  vatOnFees: number;
  totalAmazonFees: number;
  /** Buy price after reclaiming VAT, if you can. */
  productCost: number;
  /** Shipping to Amazon, prep and other costs. */
  extraCosts: number;
  /** Money you put in per unit before Amazon pays you (product + extra costs). */
  costPerUnit: number;
  profitPerUnit: number;
  /** Profit as a share of the sell price. */
  marginPercent: number;
  /** Profit as a share of the money you put in. */
  roiPercent: number;
  /** Lowest sell price that still breaks even. Null if no price can. */
  breakEvenSellPrice: number | null;
  totalInvestment: number;
  totalProfit: number;
  verdict: Verdict;
}

/** A deal is "good" when it clears both of these (from the business plan). */
export const GOOD_DEAL_MIN_PROFIT = 3;
export const GOOD_DEAL_MIN_ROI_PERCENT = 30;

export const DEFAULT_INPUTS: ProfitInputs = {
  buyPrice: 6,
  sellPrice: 16.99,
  referralFeePercent: 15,
  fulfilmentFee: 2.5,
  storageFeePerUnit: 0.1,
  shippingToAmazonPerUnit: 0.5,
  prepCostPerUnit: 0.2,
  otherCostsPerUnit: 0,
  digitalServicesFeePercent: 2,
  vatRegistered: false,
  vatRatePercent: 20,
  buyPriceIncludesVat: true,
  quantity: 10,
};

function profitAt(inputs: ProfitInputs, sellPrice: number) {
  const vatShare = inputs.vatRatePercent / (100 + inputs.vatRatePercent);

  const outputVat = inputs.vatRegistered ? sellPrice * vatShare : 0;
  const revenue = sellPrice - outputVat;

  // Amazon works out the referral fee on the full price the customer pays.
  const referralFee = (sellPrice * inputs.referralFeePercent) / 100;
  const baseFees = referralFee + inputs.fulfilmentFee + inputs.storageFeePerUnit;
  const digitalServicesFee = (baseFees * inputs.digitalServicesFeePercent) / 100;
  const vatOnFees = inputs.vatRegistered
    ? 0
    : ((baseFees + digitalServicesFee) * inputs.vatRatePercent) / 100;
  const totalAmazonFees = baseFees + digitalServicesFee + vatOnFees;

  const productCost =
    inputs.vatRegistered && inputs.buyPriceIncludesVat
      ? inputs.buyPrice * (1 - vatShare)
      : inputs.buyPrice;
  const extraCosts =
    inputs.shippingToAmazonPerUnit + inputs.prepCostPerUnit + inputs.otherCostsPerUnit;

  return {
    revenue,
    outputVat,
    referralFee,
    digitalServicesFee,
    vatOnFees,
    totalAmazonFees,
    productCost,
    extraCosts,
    profit: revenue - totalAmazonFees - productCost - extraCosts,
  };
}

export function calculateProfit(inputs: ProfitInputs): ProfitResult {
  const r = profitAt(inputs, inputs.sellPrice);
  const costPerUnit = r.productCost + r.extraCosts;

  // Profit rises in a straight line with the sell price, so two points give the break-even.
  const profitAtZero = profitAt(inputs, 0).profit;
  const slope = profitAt(inputs, 1).profit - profitAtZero;
  const breakEvenSellPrice = slope > 0 ? -profitAtZero / slope : null;

  const roiPercent = costPerUnit > 0 ? (r.profit / costPerUnit) * 100 : 0;
  const verdict: Verdict =
    r.profit >= GOOD_DEAL_MIN_PROFIT && roiPercent >= GOOD_DEAL_MIN_ROI_PERCENT
      ? "good"
      : r.profit > 0
        ? "thin"
        : "loss";

  return {
    revenue: r.revenue,
    outputVat: r.outputVat,
    referralFee: r.referralFee,
    fulfilmentFee: inputs.fulfilmentFee,
    storageFee: inputs.storageFeePerUnit,
    digitalServicesFee: r.digitalServicesFee,
    vatOnFees: r.vatOnFees,
    totalAmazonFees: r.totalAmazonFees,
    productCost: r.productCost,
    extraCosts: r.extraCosts,
    costPerUnit,
    profitPerUnit: r.profit,
    marginPercent: inputs.sellPrice > 0 ? (r.profit / inputs.sellPrice) * 100 : 0,
    roiPercent,
    breakEvenSellPrice,
    totalInvestment: costPerUnit * inputs.quantity,
    totalProfit: r.profit * inputs.quantity,
    verdict,
  };
}
