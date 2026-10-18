// Compares supplier offers on the real cost of getting each item to the UK, and flags risks.
import { calculateProfit, DEFAULT_INPUTS, type ProfitInputs, type Verdict } from "@/lib/profit";

export interface SupplierOffer {
  supplier: string;
  /** £ per item at the planned quantity, before shipping. */
  unitPrice: number;
  /** £ shipping per item to the UK. */
  freightPerUnit: number;
  /** Minimum order quantity. */
  moq: number;
  leadTimeDays?: number;
  tradeAssurance: boolean;
  verified: boolean;
  yearsOnAlibaba?: number;
  /** Supplier provides UKCA/CE safety papers. */
  hasSafetyMark?: boolean;
  /** Delivered Duty Paid: the price already includes UK duty, import VAT and clearance. */
  ddp?: boolean;
}

export interface ImportCosts {
  /** UK customs duty rate for this kind of item. */
  dutyPercent: number;
  /** £ per shipment for customs clearance and courier handling. */
  clearanceFee: number;
  importVatPercent: number;
  /** VAT-registered sellers can claim import VAT back, so it isn't a cost for them. */
  vatRegistered: boolean;
}

export interface ComparisonInput {
  /** £ Amazon selling price. */
  sellPrice: number;
  plannedQty: number;
  budget: number;
  /** The item needs UKCA/CE marking to be sold in the UK (toys, electricals and so on). */
  needsSafetyMark: boolean;
  importCosts: ImportCosts;
  /** Amazon fees and other costs, as in the profit calculator. */
  costs?: Partial<Omit<ProfitInputs, "buyPrice" | "sellPrice" | "quantity">>;
  offers: SupplierOffer[];
}

export interface Flag {
  severity: "serious" | "warning";
  text: string;
}

export interface OfferResult {
  supplier: string;
  quantity: number;
  /** £ per item once it's in the UK. */
  landedCost: number;
  breakdown: { goods: number; duty: number; clearance: number; importVat: number };
  /** £ to pay up front, including import VAT even when it can be claimed back later. */
  cashNeeded: number;
  profitPerItem: number;
  roiPercent: number;
  verdict: Verdict;
  totalProfit: number;
  flags: Flag[];
}

export interface Comparison {
  /** Safest profitable offer first. */
  ranked: OfferResult[];
  recommended: OfferResult | null;
  advice: string;
}

/** Offers this much cheaper than the middle offer may be poor quality. */
export const SUSPICIOUSLY_CHEAP_PERCENT = 40;
export const SLOW_DELIVERY_DAYS = 45;
export const MIN_YEARS_ON_ALIBABA = 2;

const gbp = (n: number) => `£${n.toFixed(2)}`;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function landedCost(offer: SupplierOffer, quantity: number, imp: ImportCosts) {
  const goods = offer.unitPrice + offer.freightPerUnit;
  if (offer.ddp) {
    return { landed: goods, cashPerItem: goods, fixed: 0, breakdown: { goods, duty: 0, clearance: 0, importVat: 0 } };
  }
  const duty = (goods * imp.dutyPercent) / 100;
  const clearance = imp.clearanceFee / quantity;
  // Import VAT is charged on the goods, shipping and duty.
  const vat = ((goods + duty) * imp.importVatPercent) / 100;
  const importVat = imp.vatRegistered ? 0 : vat;
  return {
    landed: goods + duty + clearance + importVat,
    cashPerItem: goods + duty + vat,
    fixed: imp.clearanceFee,
    breakdown: { goods, duty, clearance, importVat },
  };
}

export function compareSuppliers(input: ComparisonInput): Comparison {
  const middlePrice = input.offers.length >= 2 ? median(input.offers.map((o) => o.unitPrice)) : null;

  const results = input.offers.map<OfferResult>((offer) => {
    const quantity = Math.max(input.plannedQty, offer.moq);
    const cost = landedCost(offer, quantity, input.importCosts);
    const r = calculateProfit({
      ...DEFAULT_INPUTS,
      ...input.costs,
      vatRegistered: input.importCosts.vatRegistered,
      // Import VAT is already handled in the landed cost.
      buyPriceIncludesVat: false,
      buyPrice: cost.landed,
      sellPrice: input.sellPrice,
      quantity,
    });
    const cashNeeded = cost.cashPerItem * quantity + cost.fixed;

    const flags: Flag[] = [];
    if (r.verdict === "loss") flags.push({ severity: "serious", text: `Loses money at ${gbp(input.sellPrice)}.` });
    if (!offer.tradeAssurance) flags.push({ severity: "serious", text: "No Trade Assurance, so your payment isn't protected." });
    if (cashNeeded > input.budget) {
      flags.push({
        severity: "serious",
        text: `Minimum order of ${quantity} costs ${gbp(cashNeeded)}, more than your ${gbp(input.budget)} budget.`,
      });
    }
    if (input.needsSafetyMark && !offer.hasSafetyMark) {
      flags.push({ severity: "serious", text: "No UKCA/CE safety papers, which this item needs to be sold in the UK." });
    }
    if (r.verdict === "thin") flags.push({ severity: "warning", text: "Thin profit." });
    if (!offer.verified) flags.push({ severity: "warning", text: "Not a verified supplier." });
    if (offer.yearsOnAlibaba !== undefined && offer.yearsOnAlibaba < MIN_YEARS_ON_ALIBABA) {
      flags.push({ severity: "warning", text: `Only ${offer.yearsOnAlibaba} year(s) on Alibaba.` });
    }
    if (offer.leadTimeDays !== undefined && offer.leadTimeDays > SLOW_DELIVERY_DAYS) {
      flags.push({ severity: "warning", text: `Takes ${offer.leadTimeDays} days to arrive.` });
    }
    if (middlePrice !== null && offer.unitPrice < middlePrice * (1 - SUSPICIOUSLY_CHEAP_PERCENT / 100)) {
      flags.push({ severity: "warning", text: "Much cheaper than the others. Order a sample to check quality." });
    }

    return {
      supplier: offer.supplier,
      quantity,
      landedCost: cost.landed,
      breakdown: cost.breakdown,
      cashNeeded,
      profitPerItem: r.profitPerUnit,
      roiPercent: r.roiPercent,
      verdict: r.verdict,
      totalProfit: r.totalProfit,
      flags,
    };
  });

  const serious = (o: OfferResult) => o.flags.filter((f) => f.severity === "serious").length;
  const ranked = results.sort((a, b) => serious(a) - serious(b) || b.profitPerItem - a.profitPerItem);
  const recommended = ranked.find((o) => serious(o) === 0) ?? null;

  return {
    ranked,
    recommended,
    advice: recommended
      ? `${recommended.supplier} is the best choice: ${gbp(recommended.landedCost)} per item delivered to the UK, ${gbp(recommended.profitPerItem)} profit each. Order a sample before the full order, and pay through Trade Assurance.`
      : "None of these offers is safe and profitable as it stands. Ask for better prices or a smaller minimum order, or look for other suppliers.",
  };
}
