import { describe, expect, it } from "vitest";
import { TICKETS, INBOX } from "@/lib/customers/types";
import { createMemoryStore } from "@/lib/store/store";
import { inboxOverview } from "./inbox-tools";

describe("inboxOverview", () => {
  it("lists open tickets by deadline and counts waiting and automatic replies", async () => {
    const store = createMemoryStore();
    const ticket = (deadline: string, status = "open") => ({
      title: `Due ${deadline}`,
      priority: "high",
      status,
      deadline,
    });
    await store.put(TICKETS, "late", ticket("2026-10-18T20:00:00Z"));
    await store.put(TICKETS, "soon", ticket("2026-10-18T12:00:00Z"));
    await store.put(TICKETS, "done", ticket("2026-10-18T10:00:00Z", "resolved"));
    await store.put(INBOX, "a", { status: "ready" });
    await store.put(INBOX, "b", { status: "auto_replied" });
    await store.put(INBOX, "c", { status: "auto_replied" });

    const o = await inboxOverview(store, new Date("2026-10-18T09:00:00Z"));

    expect(o.openTickets.map((t) => [t.id, t.hoursLeftToReply, t.link])).toEqual([
      ["soon", 3, "/tickets/soon"],
      ["late", 11, "/tickets/late"],
    ]);
    expect(o).toMatchObject({ repliesWaitingToBeSent: 1, repliedAutomatically: 2, savedPermanently: false });
  });
});
