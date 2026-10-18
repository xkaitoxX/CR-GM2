import { describe, expect, it } from "vitest";
import { exampleData } from "@/lib/business/example-data";
import { summarise } from "@/lib/business/summary";
import { upcomingSeasons } from "@/lib/seasons";
import { aiMorningNote, rulesSummary, type InboxOverview } from "./morning";
import { fakeClient, textMessage } from "./test-helpers";

const summary = summarise(exampleData(), 30);
const overview: InboxOverview = {
  openTickets: [
    { id: "a", title: "Refund from Sam", priority: "high", status: "open", hoursLeftToReply: 3, link: "/tickets/a" },
    { id: "b", title: "Complaint from Jo", priority: "high", status: "open", hoursLeftToReply: 20, link: "/tickets/b" },
  ],
  repliesWaitingToBeSent: 2,
  repliedAutomatically: 5,
  savedPermanently: false,
};

describe("rulesSummary", () => {
  it("puts urgent tickets first, then waiting work, stock problems and seasons", () => {
    const items = rulesSummary(summary, overview, upcomingSeasons("2026-10-18"), "2026-10-18");

    expect(items[0]).toEqual({ tone: "critical", text: "Reply to Refund from Sam: 3 h left", link: "/tickets/a" });
    expect(items.map((i) => i.text)).toContain("1 more ticket waiting for you");
    expect(items.map((i) => i.text)).toContain("2 customer replies are ready to send");
    expect(items).toHaveLength(6);
    const order = ["critical", "warning", "info", "good"];
    expect(items.map((i) => order.indexOf(i.tone))).toEqual([...items.map((i) => order.indexOf(i.tone))].sort());
  });

  it("reminds about seasons with the stock-at-Amazon date, skipping ones it's too late for", () => {
    const quiet = { ...summary, insights: [] };
    const items = rulesSummary(quiet, null, upcomingSeasons("2026-10-18"), "2026-10-18");

    expect(items.some((i) => i.text === "Black Friday in 40 days: get stock to Amazon by 13 Nov")).toBe(true);
    expect(items.some((i) => i.text.startsWith("Halloween"))).toBe(false);
  });

  it("says all clear when there's nothing to do", () => {
    expect(rulesSummary({ ...summary, insights: [] }, null, [], "2026-10-18")).toEqual([
      { tone: "good", text: "All clear today. Nothing needs you." },
    ]);
  });
});

describe("aiMorningNote", () => {
  it("returns the manager's short note", async () => {
    const { client } = fakeClient();
    const create = async () => textMessage("Reply to Sam first. Great week!");
    (client.beta.messages as unknown as { create: typeof create }).create = create;

    expect(await aiMorningNote(client, { today: "2026-10-18", items: [], isExampleData: true, profitLast7Days: 100, profitPrevious7Days: 90 })).toBe(
      "Reply to Sam first. Great week!",
    );
  });
});
