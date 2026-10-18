import { describe, expect, it } from "vitest";
import { recentActivity } from "@/lib/activity";
import { fakeParseClient } from "@/lib/ai/test-helpers";
import { createMemoryStore } from "@/lib/store/store";
import { handleIncoming, markMessageSent, replyToTicket, saveSettings, updateTicket, type Mail, type Mailer } from "./inbox";
import { FACTS, INBOX, type IncomingMessage, type InboxMessage } from "./types";

const fakeMailer = () => {
  const sent: Mail[] = [];
  const mailer: Mailer = { send: async (mail) => void sent.push(mail) };
  return { mailer, sent };
};

const fromEmail = (text: string): IncomingMessage => ({
  kind: "customer_message",
  from: "Sam Jones",
  subject: "Question about my order",
  text,
  receivedAt: "2026-10-18T09:00:00.000Z",
  source: "email",
  replyTo: "abc@marketplace.amazon.co.uk",
  emailMessageId: "<m1@amazon>",
});

const safeDraft = {
  category: "how_to_use",
  summary: "Sam asks if the garlic press is dishwasher safe.",
  reply: "Hi Sam, yes, it's dishwasher safe. Kind regards, Kitchen Corner",
  confident: true,
};
const refundDraft = {
  category: "refund_or_return",
  summary: "Sam wants a refund because the press arrived broken.",
  reply: "Hi Sam, I'm sorry it arrived broken. Kind regards, Kitchen Corner",
  confident: true,
};

const setup = (outputs: (object | null | Error)[], withMailer = true) => {
  const store = createMemoryStore();
  const { client, calls } = fakeParseClient(...outputs);
  const { mailer, sent } = fakeMailer();
  const deps = {
    store,
    client,
    mailer: withMailer ? mailer : null,
    ownerEmail: "owner@example.com",
    appUrl: "https://shop.example.com/",
    shopName: "Kitchen Corner",
  };
  return { store, deps, calls, sent };
};

describe("handleIncoming", () => {
  it("replies to simple messages by email by itself, using the fact sheets", async () => {
    const { store, deps, calls, sent } = setup([safeDraft]);
    await store.put(FACTS, "garlic-press", { productName: "Garlic press", facts: "Dishwasher safe. Stainless steel." });

    const { message, ticket } = await handleIncoming(deps, fromEmail("Is the garlic press dishwasher safe?"));

    expect(ticket).toBeUndefined();
    expect(message.data).toMatchObject({ status: "auto_replied", category: "how_to_use", reply: safeDraft.reply });
    expect(sent).toEqual([
      { to: "abc@marketplace.amazon.co.uk", subject: "Re: Question about my order", text: safeDraft.reply, inReplyTo: "<m1@amazon>" },
    ]);
    expect(JSON.stringify(calls[0].messages)).toContain("Dishwasher safe. Stainless steel.");
    expect((await recentActivity(store))[0].data.title).toBe("Replied to Sam Jones automatically");
  });

  it("opens a ticket, sends a holding reply and alerts the owner with a link when it needs them", async () => {
    const { deps, sent } = setup([refundDraft]);

    const { message, ticket } = await handleIncoming(deps, fromEmail("It arrived broken, I want a refund"));

    expect(message.data).toMatchObject({ status: "escalated", ticketId: ticket!.id });
    expect(message.data.holdingReply).toMatch(/^Hi Sam,[\s\S]*within 24 hours/);
    expect(ticket!.data).toMatchObject({
      title: "Refund or return from Sam Jones",
      priority: "high",
      status: "open",
      summary: refundDraft.summary,
      suggestedReply: refundDraft.reply,
      deadline: "2026-10-19T09:00:00.000Z",
    });
    expect(sent.map((m) => m.to)).toEqual(["abc@marketplace.amazon.co.uk", "owner@example.com"]);
    expect(sent[1].subject).toBe("[HIGH] New ticket: Refund or return from Sam Jones");
    expect(sent[1].text).toContain(`https://shop.example.com/tickets/${ticket!.id}`);
  });

  it("writes but doesn't send when email isn't connected", async () => {
    const { deps } = setup([safeDraft], false);

    const { message } = await handleIncoming(deps, { ...fromEmail("Is it dishwasher safe?"), source: "pasted", replyTo: undefined });

    expect(message.data.status).toBe("ready");
    expect(message.data.reason).toMatch(/copy it into Amazon's Buyer-Seller Messages/);
  });

  it("marks feedback replies ready to post, and escalates negative feedback", async () => {
    const positive = setup([{ category: "positive_feedback", summary: "Happy customer.", reply: "Thank you!", confident: true }]);
    const feedback = { ...fromEmail("Great seller, fast delivery"), kind: "feedback" as const };
    expect((await handleIncoming(positive.deps, feedback)).message.data).toMatchObject({
      status: "ready",
      reason: expect.stringMatching(/Seller Central feedback page/),
    });

    const negative = setup([{ category: "negative_feedback", summary: "Unhappy.", reply: "Sorry to hear that.", confident: true }]);
    const { ticket } = await handleIncoming(negative.deps, { ...feedback, text: "Slow delivery" });
    expect(ticket?.data.priority).toBe("high");
    expect(negative.sent.map((m) => m.to)).toEqual(["owner@example.com"]);
  });

  it("escalates instead of losing the message when the AI fails or refuses", async () => {
    const failed = setup([new Error("AI down")]);
    expect((await handleIncoming(failed.deps, fromEmail("Hello?"))).message.data.status).toBe("escalated");

    const refused = setup([null]);
    expect((await handleIncoming(refused.deps, fromEmail("Hello?"))).ticket?.data.summary).toMatch(/couldn't write a reply/);
  });

  it("holds every message, with no holding reply, when auto-replies are off", async () => {
    const { store, deps, sent } = setup([safeDraft]);
    await saveSettings(store, { autoReply: false });

    const { message } = await handleIncoming(deps, fromEmail("Is it dishwasher safe?"));

    expect(message.data.status).toBe("escalated");
    expect(sent.map((m) => m.to)).toEqual(["owner@example.com"]);
  });
});

describe("owner actions", () => {
  it("replies to a ticket by email and records it", async () => {
    const { store, deps, sent } = setup([refundDraft]);
    const { ticket, message } = await handleIncoming(deps, fromEmail("It arrived broken"));

    const result = await replyToTicket(deps, ticket!.id, "Sorry Sam, a replacement is on its way.");

    expect(result.viaEmail).toBe(true);
    expect(sent.at(-1)).toMatchObject({ to: "abc@marketplace.amazon.co.uk", text: "Sorry Sam, a replacement is on its way." });
    expect(result.ticket.data.status).toBe("waiting");
    expect((await store.get<InboxMessage>(INBOX, message.id))?.data.status).toBe("sent");
    expect((await recentActivity(store))[0].data.title).toBe("Replied to ticket: Refund or return from Sam Jones");
  });

  it("resolves tickets with a note, and marks waiting replies as sent", async () => {
    const { store, deps } = setup([refundDraft, safeDraft], false);
    const { ticket } = await handleIncoming(deps, fromEmail("It arrived broken"));
    const resolved = await updateTicket(store, ticket!.id, { status: "resolved", note: "Refunded in Seller Central." });
    expect(resolved.data.status).toBe("resolved");
    expect(resolved.data.notes.at(-1)).toMatchObject({ by: "owner", text: "Refunded in Seller Central." });

    const { message } = await handleIncoming(deps, { ...fromEmail("Is it dishwasher safe?"), replyTo: undefined });
    expect((await markMessageSent(store, message.id, "Edited reply")).data).toMatchObject({ status: "sent", reply: "Edited reply" });
  });
});
