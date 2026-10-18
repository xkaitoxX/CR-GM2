// Calendar maths on YYYY-MM-DD strings, in UTC so results never depend on the time zone.

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDay = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (day: string, days: number) => toDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));

/** Whole days from `from` to `to`. */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** e.g. "3 Aug" */
export const formatDay = (day: string) => shortDate.format(new Date(`${day}T00:00:00Z`));
