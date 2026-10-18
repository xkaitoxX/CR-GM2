"use client";

import Link from "next/link";
import PasswordForm from "@/components/password-form";
import { card, Chip, Notice, type Tone } from "@/components/ui";
import { useApi } from "@/lib/client-api";
import { formatWhen, timeLeft } from "@/lib/customers/time";
import type { Ticket } from "@/lib/customers/types";
import type { StoredRecord } from "@/lib/store/store";

export const PRIORITY: Record<Ticket["priority"], { tone: Tone; label: string }> = {
  urgent: { tone: "critical", label: "Urgent" },
  high: { tone: "warning", label: "High" },
  normal: { tone: "neutral", label: "Normal" },
};

export const STATUS: Record<Ticket["status"], { tone: Tone; label: string }> = {
  open: { tone: "critical", label: "Open" },
  waiting: { tone: "info", label: "Waiting for customer" },
  resolved: { tone: "good", label: "Resolved" },
};

export default function TicketsView() {
  const tickets = useApi<{ tickets: StoredRecord<Ticket>[] }>("/api/tickets");

  if (tickets.needsPassword) return <PasswordForm onSaved={tickets.reload} />;
  if (tickets.error) return <Notice>Couldn&apos;t load tickets. Please refresh the page.</Notice>;
  if (!tickets.data) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (tickets.data.tickets.length === 0) {
    return (
      <p className={`${card} text-sm text-zinc-600 dark:text-zinc-400`}>
        No tickets. When the AI can&apos;t sort out a customer&apos;s problem by itself, it opens a ticket here and emails you a link.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tickets.data.tickets.map(({ id, data: t }) => {
        const due = t.status === "open" ? timeLeft(t.deadline) : null;
        return (
          <li key={id}>
            <Link href={`/tickets/${id}`} className={`${card} block hover:ring-zinc-400 dark:hover:ring-zinc-600`}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Chip>
                <Chip tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Chip>
                {due && <Chip tone={due.urgent ? "warning" : "neutral"}>{due.text}</Chip>}
              </div>
              <p className="mt-2 font-medium">{t.title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.summary}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Reply due {formatWhen(t.deadline)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
