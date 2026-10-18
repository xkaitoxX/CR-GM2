"use client";

import Link from "next/link";
import { useState } from "react";
import ProductImage from "@/components/dashboard/product-image";
import PasswordForm from "@/components/password-form";
import { button, card, Chip, CopyButton, input, Notice, quietButton, Tabs, type Tone } from "@/components/ui";
import type { Activity } from "@/lib/activity";
import { ApiError, send, useApi } from "@/lib/client-api";
import { formatWhen, timeLeft } from "@/lib/customers/time";
import { categoryLabel, REPLY_WITHIN_HOURS, type InboxMessage, type Settings } from "@/lib/customers/types";
import type { StoredRecord } from "@/lib/store/store";

interface InboxData {
  messages: StoredRecord<InboxMessage>[];
  settings: Settings;
  saved: boolean;
  emailConnected: boolean;
  aiConnected: boolean;
}

type Tab = "messages" | "facts" | "activity";

export default function InboxView() {
  const [tab, setTab] = useState<Tab>("messages");
  const inbox = useApi<InboxData>("/api/inbox");

  if (inbox.needsPassword) return <PasswordForm onSaved={inbox.reload} />;
  if (inbox.error) return <Notice>Couldn&apos;t load the inbox. Please refresh the page.</Notice>;
  if (!inbox.data) return <p className="text-sm text-zinc-500">Loading…</p>;
  const { settings, saved, emailConnected, aiConnected } = inbox.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Chip tone={emailConnected ? "good" : "warning"}>{emailConnected ? "Email connected" : "Email not connected"}</Chip>
        <Chip tone={aiConnected ? "good" : "warning"}>{aiConnected ? "AI switched on" : "AI not switched on"}</Chip>
        <Chip tone={saved ? "good" : "warning"}>{saved ? "Saved to your database" : "Not saved yet (no database)"}</Chip>
      </div>

      <AutoReplySwitch settings={settings} onChange={inbox.reload} />
      {emailConnected && <CheckEmailButton onChecked={inbox.reload} />}

      <Tabs
        label="Inbox sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "messages", label: "Messages" },
          { value: "facts", label: "Fact sheets" },
          { value: "activity", label: "What the AI did" },
        ]}
      />

      {tab === "messages" && (
        <>
          <PasteForm onAdded={inbox.reload} aiConnected={aiConnected} />
          {inbox.data.messages.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No messages yet. {emailConnected ? "New customer emails appear here automatically." : "Paste one above to try it."}
            </p>
          ) : (
            <ul className="space-y-3">
              {inbox.data.messages.map((m) => (
                <MessageCard key={m.id} record={m} onChange={inbox.reload} />
              ))}
            </ul>
          )}
        </>
      )}
      {tab === "facts" && <FactSheets />}
      {tab === "activity" && <ActivityLog />}
    </div>
  );
}

function AutoReplySwitch({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const [on, setOn] = useState(settings.autoReply);
  const [busy, setBusy] = useState(false);
  return (
    <label className={`${card} flex cursor-pointer items-start gap-3`}>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-zinc-900 dark:accent-zinc-100"
        checked={on}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.checked;
          setOn(next);
          setBusy(true);
          try {
            await send("/api/settings", "PUT", { autoReply: next });
            onChange();
          } catch {
            setOn(!next);
          } finally {
            setBusy(false);
          }
        }}
      />
      <span className="text-sm">
        <span className="font-medium">Reply to simple messages automatically</span>
        <span className="block text-zinc-600 dark:text-zinc-400">
          Delivery questions, how-to questions, thank-yous and normal feedback get a polite reply straight away. Refunds,
          damage, complaints, safety issues and negative feedback always come to you as a ticket, with a holding reply sent
          so you keep within Amazon&apos;s 24 hours.
        </span>
      </span>
    </label>
  );
}

interface SyncResult {
  newEmails: number;
  customerMessages: number;
  repliedAutomatically: number;
  ticketsOpened: number;
  supplierEmails: number;
}

function CheckEmailButton({ onChecked }: { onChecked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={quietButton}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult("");
          try {
            const r = await send<SyncResult>("/api/email/sync", "POST", {});
            setResult(
              r.newEmails
                ? `${r.newEmails} new: ${r.customerMessages} from customers (${r.repliedAutomatically} answered, ${r.ticketsOpened} to Tickets), ${r.supplierEmails} from suppliers.`
                : "No new emails.",
            );
            onChecked();
          } catch {
            setResult("Couldn't check email. Check the email address and app password in the website's settings.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking email…" : "Check email now"}
      </button>
      <span className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        {result}
      </span>
    </div>
  );
}

function PasteForm({ onAdded, aiConnected }: { onAdded: () => void; aiConnected: boolean }) {
  const [kind, setKind] = useState<InboxMessage["kind"]>("customer_message");
  const [from, setFrom] = useState("");
  const [productName, setProductName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  return (
    <form
      className={`${card} space-y-3`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setProblem("");
        try {
          await send("/api/inbox", "POST", { kind, from, productName, text });
          setText("");
          setFrom("");
          onAdded();
        } catch (error) {
          setProblem(
            error instanceof ApiError && error.status === 503
              ? "The AI isn't switched on yet. Add ANTHROPIC_API_KEY in the website's settings."
              : "Something went wrong. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold">Add a message or feedback</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        For messages that didn&apos;t come by email, or seller feedback you want a reply for.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Type</span>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as InboxMessage["kind"])}>
            <option value="customer_message">Customer message</option>
            <option value="feedback">Seller feedback</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Customer name</span>
          <input className={input} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Optional" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Item</span>
          <input className={input} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Optional" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Message</span>
        <textarea className={`${input} min-h-24`} value={text} onChange={(e) => setText(e.target.value)} required />
      </label>
      {problem && <Notice>{problem}</Notice>}
      <button type="submit" className={button} disabled={busy || !text.trim() || !aiConnected}>
        {busy ? "The AI is writing a reply…" : "Write a reply"}
      </button>
    </form>
  );
}

function statusChip(m: InboxMessage): { tone: Tone; label: string } {
  switch (m.status) {
    case "auto_replied":
      return { tone: "good", label: "Replied automatically" };
    case "ready":
      return { tone: "info", label: m.kind === "feedback" ? "Ready to post" : "Ready to send" };
    case "sent":
      return { tone: "neutral", label: "Sent" };
    case "escalated":
      return { tone: "critical", label: "Needs you" };
  }
}

function MessageCard({ record, onChange }: { record: StoredRecord<InboxMessage>; onChange: () => void }) {
  const m = record.data;
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(m.reply);
  const [busy, setBusy] = useState(false);
  const chip = statusChip(m);
  const deadline = new Date(Date.parse(m.receivedAt) + REPLY_WITHIN_HOURS * 3_600_000).toISOString();
  const due = m.status === "ready" && m.kind === "customer_message" ? timeLeft(deadline) : null;

  return (
    <li className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{m.from}</span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{formatWhen(m.receivedAt)}</span>
        <Chip tone={chip.tone}>{chip.label}</Chip>
        <Chip tone="neutral">{m.kind === "feedback" ? "Feedback" : categoryLabel(m.category)}</Chip>
        {due && <Chip tone={due.urgent ? "warning" : "neutral"}>{due.text}</Chip>}
      </div>
      {m.productName && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Item: {m.productName}</p>}
      <blockquote className="mt-3 border-l-2 border-zinc-200 pl-3 text-sm whitespace-pre-wrap text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        {m.text}
      </blockquote>

      {m.status === "escalated" ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">{m.reason}</p>
          {m.holdingReply && <p className="text-zinc-600 dark:text-zinc-400">A holding reply was sent to the customer.</p>}
          {m.ticketId && (
            <Link href={`/tickets/${m.ticketId}`} className="font-medium underline underline-offset-2">
              Open the ticket
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Reply</p>
          {editing ? (
            <textarea className={`${input} min-h-28`} value={reply} onChange={(e) => setReply(e.target.value)} />
          ) : (
            <p className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap dark:bg-zinc-800/60">{reply}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{m.reason}</p>
          {m.status === "ready" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={reply} />
              <button type="button" className={quietButton} onClick={() => setEditing((e) => !e)}>
                {editing ? "Done editing" : "Edit"}
              </button>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await send(`/api/inbox/${record.id}`, "PATCH", { reply }).catch(() => {});
                  setBusy(false);
                  onChange();
                }}
              >
                {m.kind === "feedback" ? "I've posted it" : "I've sent it"}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

interface FactItem {
  id: string;
  name: string;
  imageUrl?: string;
  facts: string;
}

function FactSheets() {
  const facts = useApi<{ items: FactItem[] }>("/api/facts");
  if (!facts.data) return <p className="text-sm text-zinc-500">Loading…</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        The AI only answers customers from these facts, so it never guesses. Write what customers ask about: size,
        materials, how to use it, care and cleaning, what&apos;s in the box and any warranty.
      </p>
      <ul className="space-y-3">
        {facts.data.items.map((item) => (
          <FactSheetRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function FactSheetRow({ item }: { item: FactItem }) {
  const [text, setText] = useState(item.facts);
  const [savedText, setSavedText] = useState(item.facts);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <li className={`${card} flex gap-3`}>
      <ProductImage name={item.name} src={item.imageUrl} size={48} />
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor={`facts-${item.id}`} className="block font-medium">
          {item.name}
        </label>
        <textarea
          id={`facts-${item.id}`}
          className={`${input} min-h-24`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setState("idle");
          }}
          placeholder="e.g. Stainless steel. 18 cm long. Dishwasher safe. Comes with a cleaning brush."
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={button}
            disabled={state === "saving" || text === savedText}
            onClick={async () => {
              setState("saving");
              try {
                await send("/api/facts", "PUT", { productId: item.id, productName: item.name, facts: text });
                setSavedText(text);
                setState("saved");
              } catch {
                setState("error");
              }
            }}
          >
            Save
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {state === "saved" ? "Saved" : state === "error" ? "Couldn't save" : ""}
          </span>
        </div>
      </div>
    </li>
  );
}

function ActivityLog() {
  const log = useApi<{ activity: StoredRecord<Activity>[] }>("/api/activity");
  if (!log.data) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (log.data.activity.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing yet.</p>;
  return (
    <ul className={`${card} divide-y divide-zinc-100 dark:divide-zinc-800`}>
      {log.data.activity.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm first:pt-0 last:pb-0">
          <Chip tone={a.data.actor === "ai" ? "info" : "neutral"}>{a.data.actor === "ai" ? "AI" : "You"}</Chip>
          <span className="font-medium">
            {a.data.link ? (
              <Link href={a.data.link} className="underline-offset-2 hover:underline">
                {a.data.title}
              </Link>
            ) : (
              a.data.title
            )}
          </span>
          {a.data.detail && <span className="text-zinc-600 dark:text-zinc-400">{a.data.detail}</span>}
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{formatWhen(a.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
