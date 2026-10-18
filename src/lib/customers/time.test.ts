import { describe, expect, it } from "vitest";
import { timeLeft } from "./time";

const now = Date.parse("2026-10-18T09:00:00Z");

describe("timeLeft", () => {
  it("counts down the hours to the deadline", () => {
    expect(timeLeft("2026-10-19T09:00:00Z", now)).toEqual({ text: "24 h left to reply", overdue: false, urgent: false });
  });

  it("is urgent with under 4 hours left, in minutes under an hour", () => {
    expect(timeLeft("2026-10-18T12:00:00Z", now)).toMatchObject({ text: "3 h left to reply", urgent: true });
    expect(timeLeft("2026-10-18T09:20:00Z", now).text).toBe("20 min left to reply");
  });

  it("says when it's overdue", () => {
    expect(timeLeft("2026-10-18T07:00:00Z", now)).toEqual({ text: "Overdue by 2 h", overdue: true, urgent: true });
  });
});
