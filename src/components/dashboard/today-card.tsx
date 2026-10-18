"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { card, Chip } from "@/components/ui";
import { rulesSummary, type TodayItem } from "@/lib/ai/morning";
import { toDay } from "@/lib/business/dates";
import type { DashboardSummary } from "@/lib/business/summary";
import { api } from "@/lib/client-api";
import { upcomingSeasons } from "@/lib/seasons";

const LABEL: Record<TodayItem["tone"], string> = {
  critical: "Urgent",
  warning: "To do",
  info: "Coming up",
  good: "Good news",
};

/** Today's plan: worked out straight away from the numbers, then updated with tickets and the manager's note. */
export default function TodayCard({ summary }: { summary: DashboardSummary }) {
  const [plan, setPlan] = useState<{ items: TodayItem[]; note: string | null; complete: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Worked out in the browser, so the dates are today's rather than the day the site was built.
    const today = toDay(new Date());
    const quick = rulesSummary(summary, null, upcomingSeasons(today), today);
    queueMicrotask(() => !cancelled && setPlan((p) => p ?? { items: quick, note: null, complete: false }));
    api<{ items: TodayItem[]; note: string | null }>("/api/morning")
      .then((r) => !cancelled && setPlan({ items: r.items, note: r.note, complete: true }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [summary]);

  return (
    <section className={card} aria-labelledby="today-title">
      <h2 id="today-title" className="font-semibold">
        Today
      </h2>
      {!plan ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Working out today&apos;s plan…</p>
      ) : (
        <>
          {plan.note && (
            <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:bg-sky-950 dark:text-sky-100">
              <span className="font-medium">From your manager: </span>
              {plan.note}
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {plan.items.map((item) => (
              <li key={item.text} className="flex flex-wrap items-center gap-2 text-sm">
                <Chip tone={item.tone}>{LABEL[item.tone]}</Chip>
                {item.link ? (
                  <Link href={item.link} className="underline-offset-2 hover:underline">
                    {item.text}
                  </Link>
                ) : (
                  <span>{item.text}</span>
                )}
              </li>
            ))}
          </ul>
          {!plan.complete && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Open the Inbox and enter the website password to include tickets and the manager&apos;s note.
            </p>
          )}
        </>
      )}
    </section>
  );
}
