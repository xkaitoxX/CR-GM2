"use client";

import Link from "next/link";
import { useState } from "react";
import { BarList, ColumnChart, StackedBar, type SegmentDatum } from "@/components/dashboard/charts";
import Delta from "@/components/dashboard/delta";
import ItemsSection from "@/components/dashboard/items";
import ProductImage from "@/components/dashboard/product-image";
import { formatDay } from "@/lib/business/dates";
import {
  PERIODS,
  type BreakdownKey,
  type DashboardSummary,
  type Insight,
  type PeriodDays,
  type ProductRow,
} from "@/lib/business/summary";
import { money, moneyAxis, percent, units } from "@/lib/format";

type Metric = "profit" | "sales" | "units";

const METRICS: { key: Metric; label: string; format: (n: number) => string; axis: (n: number) => string }[] = [
  { key: "profit", label: "Profit", format: money, axis: moneyAxis },
  { key: "sales", label: "Sales", format: money, axis: moneyAxis },
  { key: "units", label: "Items sold", format: units, axis: units },
];

/** Colour follows the part, so it never changes when a part is missing. */
const BREAKDOWN_COLORS: Record<BreakdownKey, string> = {
  profit: "var(--series-1)",
  productCost: "var(--series-2)",
  amazonFees: "var(--series-3)",
  vatOnFees: "var(--series-4)",
  vatOnSales: "var(--series-4)",
  shippingPrep: "var(--series-5)",
  ads: "var(--series-6)",
};

const card = "rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800";

export default function Dashboard({ summaries }: { summaries: Record<PeriodDays, DashboardSummary> }) {
  const [days, setDays] = useState<PeriodDays>(30);
  const [metric, setMetric] = useState<Metric>("profit");
  const s = summaries[days];
  const m = METRICS.find((x) => x.key === metric)!;
  const vs = `vs previous ${days} days`;
  const productsById = new Map(s.products.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      {s.isExample && (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-100">
          <strong className="font-semibold">Example data.</strong> These numbers are made up so you can see how the
          dashboard works. Your real sales appear here once your Amazon seller account is connected.
        </p>
      )}

      {/* One filter row scopes everything below it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Period" className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className="rounded-full px-3 py-1.5 text-sm text-zinc-600 aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-zinc-900 aria-pressed:shadow-sm dark:text-zinc-400 dark:aria-pressed:bg-zinc-950 dark:aria-pressed:text-zinc-100"
            >
              Last {d} days
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDay(s.from)} – {formatDay(s.to)}
        </p>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Profit" value={money(s.totals.profit)} change={change(s.totals.profit, s.previous.profit)} vs={vs} hero />
        <StatTile label="Sales" value={money(s.totals.sales)} change={change(s.totals.sales, s.previous.sales)} vs={vs} />
        <StatTile label="Items sold" value={units(s.totals.units)} change={change(s.totals.units, s.previous.units)} vs={vs} />
        <StatTile
          label="Profit per item"
          value={money(s.totals.profitPerItem)}
          change={change(s.totals.profitPerItem, s.previous.profitPerItem)}
          vs={vs}
        />
        <StatTile
          label="Return on money"
          value={percent(s.totals.roiPercent)}
          change={s.previous.moneySpent > 0 ? { points: s.totals.roiPercent - s.previous.roiPercent } : null}
          vs={vs}
        />
        <StatTile label="Stock at Amazon" value={`${units(s.stockUnits)} items`} note={`Cost ${money(s.stockValue)} to buy`} />
      </section>

      {s.insights.length > 0 && (
        <section className={card} aria-labelledby="insights-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="insights-title" className="font-semibold">
              What needs your attention
            </h2>
            <Link href="/" className="text-sm font-medium underline underline-offset-2">
              Ask the manager about these
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {s.insights.map((insight) => (
              <InsightRow
                key={insight.title}
                insight={insight}
                product={insight.productId ? productsById.get(insight.productId) : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      <section className={card} aria-labelledby="trend-title">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="trend-title" className="font-semibold">
            {m.label} {s.bucketSize === "week" ? "per week" : "per day"}
          </h2>
          <div role="group" aria-label="Show" className="inline-flex rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
            {METRICS.map((x) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={metric === x.key}
                onClick={() => setMetric(x.key)}
                className="rounded-full px-3 py-1 text-zinc-600 aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-zinc-900 aria-pressed:shadow-sm dark:text-zinc-400 dark:aria-pressed:bg-zinc-950 dark:aria-pressed:text-zinc-100"
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <ColumnChart
          title={`${m.label} ${s.bucketSize === "week" ? "per week" : "per day"}`}
          format={m.format}
          formatAxis={m.axis}
          data={s.buckets.map((b) => ({
            key: b.start,
            label: b.label,
            detail: b.start === b.end ? formatDay(b.start) : `${formatDay(b.start)} – ${formatDay(b.end)}`,
            value: b[metric],
          }))}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="by-product-title">
          <h2 id="by-product-title" className="font-semibold">
            Profit by item
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">After Amazon fees, costs and ads</p>
          <BarList
            format={money}
            data={s.products.map((p) => ({
              key: p.id,
              label: p.name,
              value: p.profit,
              note: p.profit < 0 ? "loss" : undefined,
              image: <ProductImage name={p.name} src={p.imageUrl} size={32} />,
            }))}
          />
        </section>

        <section className={card} aria-labelledby="money-title">
          <h2 id="money-title" className="font-semibold">
            Where the money goes
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Out of {money(s.totals.sales)} in sales
          </p>
          <StackedBar
            format={money}
            data={s.breakdown.map<SegmentDatum>((part) => ({
              key: part.key,
              label: part.label,
              value: part.amount,
              color: BREAKDOWN_COLORS[part.key],
            }))}
          />
        </section>
      </div>

      <ItemsSection rows={s.products} />
    </div>
  );
}

type Change = { percent: number } | { points: number } | null;

function change(now: number, before: number): Change {
  return before > 0 ? { percent: ((now - before) / before) * 100 } : null;
}

function StatTile({
  label,
  value,
  change,
  vs,
  note,
  hero,
}: {
  label: string;
  value: string;
  change?: Change;
  vs?: string;
  note?: string;
  hero?: boolean;
}) {
  return (
    <div className={`${card} ${hero ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 font-semibold ${hero ? "text-4xl" : "text-2xl"}`}>{value}</p>
      {change && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {"percent" in change ? <Delta value={change.percent} /> : <Delta value={change.points} unit=" pts" />} {vs}
        </p>
      )}
      {note && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</p>}
    </div>
  );
}

const SEVERITY: Record<Insight["severity"], { label: string; color: string; icon: React.ReactNode }> = {
  critical: { label: "Urgent", color: "var(--status-critical)", icon: <path d="M8 4.5v4M8 11h.01" /> },
  warning: { label: "Check", color: "var(--status-warning)", icon: <path d="M8 5v3.5M8 11h.01" /> },
  good: { label: "Good news", color: "var(--status-good)", icon: <path d="m5 8.2 2 2 4-4.2" /> },
  info: { label: "Note", color: "var(--viz-muted)", icon: <path d="M8 7.5V11M8 5h.01" /> },
};

function InsightRow({ insight, product }: { insight: Insight; product?: ProductRow }) {
  const severity = SEVERITY[insight.severity];
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <svg viewBox="0 0 16 16" className="mt-0.5 size-5 shrink-0" aria-hidden>
        <circle cx="8" cy="8" r="7.5" fill={severity.color} />
        <g stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {severity.icon}
        </g>
      </svg>
      <div className="text-sm">
        <p>
          <span className="sr-only">{severity.label}: </span>
          <span className="font-medium">{insight.title}</span>
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">{insight.text}</p>
      </div>
      {product && (
        <div className="ml-auto">
          <ProductImage name={product.name} src={product.imageUrl} size={36} />
        </div>
      )}
    </li>
  );
}
