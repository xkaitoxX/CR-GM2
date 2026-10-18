// What happens to each customer message: reply automatically, or open a ticket for the owner.
import type Anthropic from "@anthropic-ai/sdk";
import { logActivity } from "@/lib/activity";
import { draftCustomerReply, type DraftedReply } from "@/lib/ai/helpers/customers";
import { decideReply, holdingReply } from "@/lib/customers/reply-policy";
import {
  DEFAULT_SETTINGS,
  FACTS,
  INBOX,
  REPLY_WITHIN_HOURS,
  SETTINGS,
  TICKETS,
  categoryLabel,
  type FactSheet,
  type IncomingMessage,
  type InboxMessage,
  type Settings,
  type Ticket,
} from "@/lib/customers/types";
import { newId, type Store, type StoredRecord } from "@/lib/store/store";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /** Message-ID of the email being replied to. */
  inReplyTo?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export interface InboxDeps {
  store: Store;
  client: Anthropic;
  /** Null when email isn't connected: replies are written but not sent. */
  mailer: Mailer | null;
  /** Where ticket alerts go. */
  ownerEmail?: string;
  /** The website's address, for links in alerts. */
  appUrl?: string;
  shopName: string;
}

export async function getSettings(store: Store): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await store.get<Settings>(SETTINGS, "main"))?.data };
}

export function saveSettings(store: Store, settings: Settings) {
  return store.put(SETTINGS, "main", settings);
}

export async function allFacts(store: Store): Promise<FactSheet[]> {
  return (await store.list<FactSheet>(FACTS)).map((r) => r.data);
}

const ticketLink = (deps: InboxDeps, id: string) => `${(deps.appUrl ?? "").replace(/\/$/, "")}/tickets/${id}`;

async function draftSafely(deps: InboxDeps, incoming: IncomingMessage): Promise<DraftedReply> {
  try {
    return await draftCustomerReply(deps.client, incoming, await allFacts(deps.store));
  } catch (error) {
    console.error(error);
    return { category: "other", summary: "The AI couldn't read this message, so it needs you.", reply: "", confident: false };
  }
}

export async function handleIncoming(
  deps: InboxDeps,
  incoming: IncomingMessage,
): Promise<{ message: StoredRecord<InboxMessage>; ticket?: StoredRecord<Ticket> }> {
  const { store, mailer } = deps;
  const settings = await getSettings(store);
  const draft = await draftSafely(deps, incoming);
  const decision = decideReply(draft, incoming.text, incoming.kind, settings.autoReply);
  const id = newId();
  const canEmailCustomer = incoming.kind === "customer_message" && mailer !== null && Boolean(incoming.replyTo);
  const subject = `Re: ${incoming.subject ?? "Your message"}`;

  if (decision.autoSend) {
    if (canEmailCustomer) {
      await mailer!.send({ to: incoming.replyTo!, subject, text: draft.reply, inReplyTo: incoming.emailMessageId });
    }
    const status = canEmailCustomer ? "auto_replied" : "ready";
    const where =
      incoming.kind === "feedback"
        ? " Post it as a public reply on your Seller Central feedback page."
        : canEmailCustomer
          ? ""
          : " Email isn't connected yet, so copy it into Amazon's Buyer-Seller Messages.";
    const message = await store.put<InboxMessage>(INBOX, id, {
      ...incoming,
      category: draft.category,
      reply: draft.reply,
      status,
      reason: decision.reason + where,
    });
    await logActivity(store, {
      actor: "ai",
      title: status === "auto_replied" ? `Replied to ${incoming.from} automatically` : `Wrote a reply for ${incoming.from}`,
      detail: categoryLabel(draft.category),
      link: "/inbox",
    });
    return { message };
  }

  const ticketId = newId();
  const title = `${categoryLabel(draft.category)} from ${incoming.from}`;
  const deadline = new Date(Date.parse(incoming.receivedAt) + REPLY_WITHIN_HOURS * 3_600_000).toISOString();
  const notes: Ticket["notes"] = [{ at: new Date().toISOString(), by: "ai", text: decision.reason }];

  let holding: string | undefined;
  if (canEmailCustomer && settings.autoReply) {
    holding = holdingReply(incoming.from, deps.shopName);
    await mailer!.send({ to: incoming.replyTo!, subject, text: holding, inReplyTo: incoming.emailMessageId });
    notes.push({ at: new Date().toISOString(), by: "ai", text: "Sent a holding reply so the customer knows you're on it." });
  }

  const ticket = await store.put<Ticket>(TICKETS, ticketId, {
    title,
    messageId: id,
    customer: incoming.from,
    kind: incoming.kind,
    priority: decision.priority,
    status: "open",
    summary: draft.summary,
    suggestedReply: draft.reply,
    deadline,
    notes,
  });
  const message = await store.put<InboxMessage>(INBOX, id, {
    ...incoming,
    category: draft.category,
    reply: draft.reply,
    status: "escalated",
    reason: decision.reason,
    ticketId,
    holdingReply: holding,
  });

  if (mailer && deps.ownerEmail) {
    await mailer.send({
      to: deps.ownerEmail,
      subject: `[${decision.priority.toUpperCase()}] New ticket: ${title}`,
      text: [
        `${draft.summary}`,
        "",
        `Why it needs you: ${decision.reason}`,
        `Reply by: ${new Date(deadline).toUTCString()}`,
        "",
        `Open the ticket: ${ticketLink(deps, ticketId)}`,
      ].join("\n"),
    });
  }
  await logActivity(store, { actor: "ai", title: `Opened a ticket: ${title}`, detail: decision.reason, link: `/tickets/${ticketId}` });
  return { message, ticket };
}

/** The owner replies to a ticket: by email when connected, or they send it themselves and mark it. */
export async function replyToTicket(deps: Pick<InboxDeps, "store" | "mailer">, ticketId: string, reply: string) {
  const { store, mailer } = deps;
  const ticket = await store.get<Ticket>(TICKETS, ticketId);
  if (!ticket) throw new Error("Ticket not found");
  const message = await store.get<InboxMessage>(INBOX, ticket.data.messageId);

  const viaEmail =
    ticket.data.kind === "customer_message" && mailer !== null && Boolean(message?.data.replyTo);
  if (viaEmail) {
    await mailer!.send({
      to: message!.data.replyTo!,
      subject: `Re: ${message!.data.subject ?? "Your message"}`,
      text: reply,
      inReplyTo: message!.data.emailMessageId,
    });
  }
  const note = viaEmail ? "Reply sent by email." : "Reply sent by the owner.";
  const updated = await store.put<Ticket>(TICKETS, ticketId, {
    ...ticket.data,
    status: "waiting",
    suggestedReply: reply,
    notes: [...ticket.data.notes, { at: new Date().toISOString(), by: "owner", text: `${note}\n\n${reply}` }],
  });
  if (message) await store.put<InboxMessage>(INBOX, message.id, { ...message.data, reply, status: "sent" });
  await logActivity(store, { actor: "owner", title: `Replied to ticket: ${ticket.data.title}`, link: `/tickets/${ticketId}` });
  return { ticket: updated, viaEmail };
}

export async function updateTicket(store: Store, ticketId: string, change: { status?: Ticket["status"]; note?: string }) {
  const ticket = await store.get<Ticket>(TICKETS, ticketId);
  if (!ticket) throw new Error("Ticket not found");
  const notes = change.note?.trim()
    ? [...ticket.data.notes, { at: new Date().toISOString(), by: "owner" as const, text: change.note.trim() }]
    : ticket.data.notes;
  const updated = await store.put<Ticket>(TICKETS, ticketId, { ...ticket.data, status: change.status ?? ticket.data.status, notes });
  if (change.status === "resolved" && ticket.data.status !== "resolved") {
    await logActivity(store, { actor: "owner", title: `Resolved ticket: ${ticket.data.title}`, link: `/tickets/${ticketId}` });
  }
  return updated;
}

/** The owner sent or posted a reply that was waiting. */
export async function markMessageSent(store: Store, messageId: string, reply?: string) {
  const message = await store.get<InboxMessage>(INBOX, messageId);
  if (!message) throw new Error("Message not found");
  return store.put<InboxMessage>(INBOX, messageId, { ...message.data, reply: reply ?? message.data.reply, status: "sent" });
}
