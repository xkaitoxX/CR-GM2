import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { INBOX, TICKETS, type InboxMessage, type Ticket } from "@/lib/customers/types";
import { getStore, type Store } from "@/lib/store/store";

/** Tickets and messages waiting on the owner, soonest deadline first. */
export async function inboxOverview(store: Store, now = new Date()) {
  const [tickets, messages] = await Promise.all([store.list<Ticket>(TICKETS), store.list<InboxMessage>(INBOX)]);
  const open = tickets.filter((t) => t.data.status !== "resolved");
  const hoursLeft = (deadline: string) => Math.round((Date.parse(deadline) - now.getTime()) / 3_600_000);

  return {
    openTickets: open
      .map((t) => ({
        id: t.id,
        title: t.data.title,
        priority: t.data.priority,
        status: t.data.status,
        hoursLeftToReply: hoursLeft(t.data.deadline),
        link: `/tickets/${t.id}`,
      }))
      .sort((a, b) => a.hoursLeftToReply - b.hoursLeftToReply),
    repliesWaitingToBeSent: messages.filter((m) => m.data.status === "ready").length,
    repliedAutomatically: messages.filter((m) => m.data.status === "auto_replied").length,
    savedPermanently: store.persistent,
  };
}

export const inboxOverviewTool = betaZodTool({
  name: "get_inbox_overview",
  description:
    "Open customer tickets (with priority and hours left to reply within Amazon's 24 hours), replies waiting to be sent, and how many messages were answered automatically.",
  inputSchema: z.object({}),
  run: async () => JSON.stringify(await inboxOverview(getStore())),
});
