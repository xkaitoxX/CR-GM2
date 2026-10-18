import { describe, expect, it } from "vitest";
import { easterSunday, seasonsForYear, upcomingSeasons } from "./seasons";

const dateOf = (year: number, name: string) => seasonsForYear(year).find((s) => s.name === name)!.date;

describe("UK seasons", () => {
  it("works out Easter", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2024)).toBe("2024-03-31");
  });

  it("works out the dates that move each year", () => {
    expect(dateOf(2026, "Mother's Day (UK)")).toBe("2026-03-15");
    expect(dateOf(2026, "Father's Day")).toBe("2026-06-21");
    expect(dateOf(2026, "Black Friday")).toBe("2026-11-27");
    expect(dateOf(2026, "Cyber Monday")).toBe("2026-11-30");
    expect(dateOf(2025, "Black Friday")).toBe("2025-11-28");
  });

  it("lists what's coming up with order-by dates, soonest first", () => {
    const upcoming = upcomingSeasons("2026-10-18");

    expect(upcoming.map((s) => [s.name, s.daysAway])).toEqual([
      ["Halloween", 13],
      ["Christmas stock deadline at Amazon", 28],
      ["Black Friday", 40],
      ["Cyber Monday", 43],
      ["Christmas", 68],
      ["Valentine's Day", 119],
      ["Mother's Day (UK)", 140],
    ]);
    expect(upcoming[2]).toMatchObject({ stockAtAmazonBy: "2026-11-13", orderImportsBy: "2026-09-28" });
  });

  it("includes today's season and nothing past the window", () => {
    expect(upcomingSeasons("2026-12-25", 10).map((s) => s.name)).toEqual(["Christmas"]);
  });
});
