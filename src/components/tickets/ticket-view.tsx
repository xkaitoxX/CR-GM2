"use client";

import Link from "next/link";
import { useState } from "react";
import PasswordForm from "@/components/password-form";
import { PRIORITY, STATUS } from "@/components/tickets/tickets-view";
import { button, card, Chip, CopyButton, input, Notice, quietButton } from "@/components/ui";
import { send, useApi } from "@/lib/client-api";
import { formatWhen, timeLeft } from "@/lib/customers/time";
import type { InboxMessage, Ticket } from "@/lib/customers/types";
import type { StoredRecord } from "@/lib/store/store";

interface TicketData {
  ticket: StoredRecord<Ticket>;
  message: StoredRecord<InboxMessage> | null;
  emailConnected: boolean;
}

export default function TicketView({ id }: { id: string }) {
  const result = useApi<TicketData>(`/api/tickets/${id}`);

  if (result.needsPassword) return <PasswordForm onSaved={result.reload} />;
  if (result.error?.status === 404) return <Notice>This ticket doesn&apos;t exist (it may have been saved before the database was set up).</Notice>;
  if (result.error) return <Notice>Couldn&apos;t load this ticket. Please refresh the page.</Notice>;
  if (!result.data) return <p className="text-sm text-zinc-500">Loading…</p>;

  return <TicketDetail key={result.data.ticket.updatedAt} data={result.data} onChange={result.reload} />;
}

function TicketDetail({ data, onChange }: { data: TicketData; onChange: () => void }) {
  const { ticket, message, emailConnected } = data;
  const t = ticket.data;
  const [reply, setReply] = useState(t.suggestedReply);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const due = t.status === "open" ? timeLeft(t.deadline) : null;
  const canEmail = emailConnected && t.kind === "customer_message" && Boolean(message?.data.replyTo);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn().catch(() => {});
    setBusy(false);
    onChange();
  };

  return (
    <div className="space-y-4">
      <Link href="/tickets" className="text-sm underline underline-offset-2">
        ← All tickets
      </Link>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Chip>
          <Chip tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Chip>
          {due && <Chip tone={due.urgent ? "warning" : "neutral"}>{due.text}</Chip>}
        </div>
        <h1 className="mt-3 text-xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">{t.summary}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Reply due {formatWhen(t.deadline)}</p>
      </section>

      {message && (
        <section className={card}>
          <h2 className="font-semibold">What the customer said</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {message.data.from} · {formatWhen(message.data.receivedAt)}
            {message.data.productName ? ` · ${message.data.productName}` : ""}
          </p>
          <blockquote className="mt-3 border-l-2 border-zinc-200 pl-3 text-sm whitespace-pre-wrap dark:border-zinc-700">
            {message.data.text}
          </blockquote>
          {message.data.holdingReply && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              A holding reply was sent automatically, so the customer knows you&apos;re on it.
            </p>
          )}
        </section>
      )}

      {t.status !== "resolved" && (
        <section className={`${card} space-y-3`}>
          <h2 className="font-semibold">Your reply</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The AI wrote this; change anything you like. Decide refunds or replacements yourself in Seller Central.
          </p>
          <label htmlFor="ticket-reply" className="sr-only">
            Reply
          </label>
          <textarea id="ticket-reply" className={`${input} min-h-36`} value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {t.kind === "feedback" || !canEmail ? (
              <>
                <CopyButton text={reply} />
                <button type="button" className={button} disabled={busy || !reply.trim()} onClick={() => act(() => send(`/api/tickets/${ticket.id}`, "POST", { reply }))}>
                  {t.kind === "feedback" ? "I've posted it" : "I've sent it"}
                </button>
              </>
            ) : (
              <button type="button" className={button} disabled={busy || !reply.trim()} onClick={() => act(() => send(`/api/tickets/${ticket.id}`, "POST", { reply }))}>
                Send reply
              </button>
            )}
          </div>
          {!canEmail && t.kind === "customer_message" && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Email isn&apos;t connected, so copy the reply into Amazon&apos;s Buyer-Seller Messages, then press &quot;I&apos;ve sent it&quot;.
            </p>
          )}
        </section>
      )}

      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Notes</h2>
        <ul className="space-y-2">
          {t.notes.map((n, i) => (
            <li key={i} className="text-sm">
              <Chip tone={n.by === "ai" ? "info" : "neutral"}>{n.by === "ai" ? "AI" : "You"}</Chip>{" "}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatWhen(n.at)}</span>
              <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{n.text}</p>
            </li>
          ))}
        </ul>
        <label htmlFor="ticket-note" className="sr-only">
          Add a note
        </label>
        <textarea
          id="ticket-note"
          className={`${input} min-h-16`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note, e.g. what you decided"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={quietButton} disabled={busy || !note.trim()} onClick={() => act(() => send(`/api/tickets/${ticket.id}`, "PATCH", { note }))}>
            Add note
          </button>
          {t.status === "resolved" ? (
            <button type="button" className={quietButton} disabled={busy} onClick={() => act(() => send(`/api/tickets/${ticket.id}`, "PATCH", { status: "open" }))}>
              Reopen
            </button>
          ) : (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => act(() => send(`/api/tickets/${ticket.id}`, "PATCH", { status: "resolved", note: note || undefined }))}
            >
              Mark resolved
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
