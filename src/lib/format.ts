// Number formats shared by the dashboard and calculator.

const gbp2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  // Without the minimum, Node and browsers disagree ("£20.0" vs "£20").
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat("en-GB");

/** £12.34 below £1,000, then £1,234. */
export const money = (n: number) => (Math.abs(n) >= 1000 ? gbp0 : gbp2).format(n);

/** Always with pennies, for prices. */
export const price = (n: number) => gbp2.format(n);

/** Short form for chart axes: £0, £500, £1.5K. */
export const moneyAxis = (n: number) => gbpCompact.format(n);

export const units = (n: number) => count.format(Math.round(n));

export const percent = (n: number) => `${n.toFixed(1)}%`;
