// UK shopping seasons, so stock can be ordered in time.
import { addDays, daysBetween } from "@/lib/business/dates";

export interface Season {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  /** True when the date moves each year and this is only a guide. */
  approximate: boolean;
  /** What tends to sell. */
  tip: string;
}

export interface UpcomingSeason extends Season {
  daysAway: number;
  /** Latest day to have stock in Amazon's warehouse (two weeks before). */
  stockAtAmazonBy: string;
  /** Latest day to order from overseas suppliers (about two months before). */
  orderImportsBy: string;
}

/** Stock should reach Amazon this many days before a season. */
export const STOCK_AT_AMAZON_DAYS = 14;
/** Orders from overseas (e.g. China) need about this long to make and ship. */
export const IMPORT_LEAD_DAYS = 60;

const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);

/** Easter Sunday (Gregorian calendar). */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

/** The nth given weekday (0 = Sunday) of a month. */
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return iso(year, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}

export function seasonsForYear(year: number): Season[] {
  const easter = easterSunday(year);
  // Black Friday is the day after the fourth Thursday of November.
  const blackFriday = addDays(nthWeekday(year, 11, 4, 4), 1);
  return [
    { name: "Valentine's Day", date: iso(year, 2, 14), approximate: false, tip: "Gifts, couples' items, chocolates and flowers accessories." },
    { name: "Mother's Day (UK)", date: addDays(easter, -21), approximate: false, tip: "Gifts for mums: home, kitchen, pamper and garden items." },
    { name: "Easter", date: easter, approximate: false, tip: "Easter crafts, baskets, egg hunt kits and spring garden items." },
    { name: "Father's Day", date: nthWeekday(year, 6, 0, 3), approximate: false, tip: "Gifts for dads: gadgets, BBQ, tools and outdoor items." },
    { name: "Prime Day", date: iso(year, 7, 15), approximate: true, tip: "Big Amazon sale in July. Amazon announces the date; have stock ready early." },
    { name: "Back to school", date: iso(year, 9, 1), approximate: true, tip: "Lunch boxes, water bottles, stationery and bags. Sales start in late July." },
    { name: "Halloween", date: iso(year, 10, 31), approximate: false, tip: "Costumes, decorations and party items." },
    {
      name: "Christmas stock deadline at Amazon",
      date: iso(year, 11, 15),
      approximate: true,
      tip: "Send Christmas stock to Amazon by about mid-November; check Amazon's exact dates. Storage fees are higher from October to December.",
    },
    { name: "Black Friday", date: blackFriday, approximate: false, tip: "Deals week. Busy for gifts, electronics accessories and home items." },
    { name: "Cyber Monday", date: addDays(blackFriday, 3), approximate: false, tip: "Online deals day after Black Friday weekend." },
    { name: "Christmas", date: iso(year, 12, 25), approximate: false, tip: "Gifts and stocking fillers. Most sales are in November and early December." },
  ];
}

/** Seasons in the next `withinDays` days, soonest first, with order-by dates. */
export function upcomingSeasons(today: string, withinDays = 150): UpcomingSeason[] {
  const year = Number(today.slice(0, 4));
  return [...seasonsForYear(year), ...seasonsForYear(year + 1)]
    .map((s) => ({
      ...s,
      daysAway: daysBetween(today, s.date),
      stockAtAmazonBy: addDays(s.date, -STOCK_AT_AMAZON_DAYS),
      orderImportsBy: addDays(s.date, -IMPORT_LEAD_DAYS),
    }))
    .filter((s) => s.daysAway >= 0 && s.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}
