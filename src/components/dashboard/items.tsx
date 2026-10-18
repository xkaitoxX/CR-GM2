"use client";

import { useState } from "react";
import { Sparkline } from "@/components/dashboard/charts";
import Delta from "@/components/dashboard/delta";
import ProductImage from "@/components/dashboard/product-image";
import { LOW_STOCK_DAYS, VERY_LOW_STOCK_DAYS, type ProductRow, type ProductTag } from "@/lib/business/summary";
import { money, percent, price, units } from "@/lib/format";

type SortKey =
  | "name"
  | "units"
  | "sales"
  | "profit"
  | "profitPerItem"
  | "marginPercent"
  | "unitsChangePercent"
  | "daysOfStockLeft";
type Sort = { key: SortKey; desc: boolean };

const SORTS: { label: string; sort: Sort }[] = [
  { label: "Most popular", sort: { key: "units", desc: true } },
  { label: "Most profit", sort: { key: "profit", desc: true } },
  { label: "Profit per item", sort: { key: "profitPerItem", desc: true } },
  { label: "Trending up", sort: { key: "unitsChangePercent", desc: true } },
  { label: "Running out of stock", sort: { key: "daysOfStockLeft", desc: false } },
  { label: "Name A–Z", sort: { key: "name", desc: false } },
];

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Item", numeric: false },
  { key: "unitsChangePercent", label: "Trend", numeric: true },
  { key: "units", label: "Sold", numeric: true },
  { key: "sales", label: "Sales", numeric: true },
  { key: "profit", label: "Profit", numeric: true },
  { key: "profitPerItem", label: "Per item", numeric: true },
  { key: "marginPercent", label: "Margin", numeric: true },
  { key: "daysOfStockLeft", label: "Stock left", numeric: true },
];

type Status = "good" | "warning" | "critical";

/** Problems first, so they're the badges that show when space is short. */
const TAG_ORDER: ProductTag[] = ["adsLosing", "lowStock", "slowSeller", "topEarner", "bestSeller"];

function badge(tag: ProductTag, row: ProductRow): { label: string; status: Status } {
  switch (tag) {
    case "adsLosing":
      return { label: "Ads losing money", status: "critical" };
    case "lowStock":
      return { label: "Low stock", status: row.daysOfStockLeft! < VERY_LOW_STOCK_DAYS ? "critical" : "warning" };
    case "slowSeller":
      return { label: "Slow seller", status: "warning" };
    case "topEarner":
      return { label: "Top earner", status: "good" };
    case "bestSeller":
      return { label: "Best seller", status: "good" };
  }
}

const badgesFor = (row: ProductRow, max: number) =>
  [...row.tags].sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b)).slice(0, max).map((tag) => ({ tag, ...badge(tag, row) }));

function sortRows(rows: ProductRow[], { key, desc }: Sort) {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    // Missing values (nothing sold) always go last.
    if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1;
    const order = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
    return desc ? -order : order;
  });
}

const trendText = (row: ProductRow) =>
  row.unitsChangePercent === null
    ? "No sales in the previous period."
    : `Items sold ${row.unitsChangePercent >= 0 ? "up" : "down"} ${Math.abs(row.unitsChangePercent).toFixed(0)}% on the previous period.`;

const card = "rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800";
const switchButton =
  "rounded-full px-3 py-1 text-zinc-600 aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-zinc-900 aria-pressed:shadow-sm dark:text-zinc-400 dark:aria-pressed:bg-zinc-950 dark:aria-pressed:text-zinc-100";

export default function ItemsSection({ rows }: { rows: ProductRow[] }) {
  const [view, setView] = useState<"list" | "cards">("list");
  const [sort, setSort] = useState<Sort>(SORTS[0].sort);
  const sorted = sortRows(rows, sort);
  const sortIndex = SORTS.findIndex((s) => s.sort.key === sort.key && s.sort.desc === sort.desc);

  return (
    <section className={card} aria-labelledby="items-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="items-title" className="font-semibold">
            Your items
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Trend compares items sold with the previous period.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sort by
            <select
              value={sortIndex === -1 ? "" : sortIndex}
              onChange={(e) => setSort(SORTS[Number(e.target.value)].sort)}
              className="rounded-lg bg-white px-2 py-1.5 text-zinc-900 ring-1 ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700"
            >
              {sortIndex === -1 && <option value="">Custom</option>}
              {SORTS.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="View" className="inline-flex rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
            {(["list", "cards"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={switchButton}>
                {v === "list" ? "List" : "Cards"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "list" ? (
        <>
          <CompactList rows={sorted} />
          <ItemsTable rows={sorted} sort={sort} onSort={setSort} />
        </>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((row) => (
            <ItemCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Phone layout, like a crypto app: picture, name, mini chart, profit and change. */
function CompactList({ rows }: { rows: ProductRow[] }) {
  return (
    <ul className="divide-y divide-zinc-100 sm:hidden dark:divide-zinc-800">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <ProductImage name={row.name} src={row.imageUrl} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{row.name}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {price(row.price)} · {units(row.units)} sold
            </p>
          </div>
          <Sparkline values={row.trend} width={64} height={28} />
          <div className="w-20 shrink-0 text-right text-sm">
            <p className={`font-semibold tabular-nums ${row.profit < 0 ? "text-[var(--delta-bad)]" : ""}`}>{money(row.profit)}</p>
            <p className="text-xs">
              <Delta value={row.unitsChangePercent} />
            </p>
          </div>
          <span className="sr-only">{trendText(row)}</span>
        </li>
      ))}
    </ul>
  );
}

function ItemsTable({ rows, sort, onSort }: { rows: ProductRow[]; sort: Sort; onSort: (sort: Sort) => void }) {
  return (
    // `relative` keeps the hidden screen-reader labels inside the scroll box.
    <div className="relative -mx-5 hidden overflow-x-auto px-5 sm:block">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : undefined}
                className={`py-2 font-medium ${c.numeric ? "text-right" : "text-left"}`}
              >
                <button
                  type="button"
                  onClick={() => onSort({ key: c.key, desc: sort.key === c.key ? !sort.desc : c.numeric })}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {c.label}
                  {sort.key === c.key && <span aria-hidden> {sort.desc ? "↓" : "↑"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <div className="flex items-center gap-3">
                  <ProductImage name={row.name} src={row.imageUrl} size={40} />
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{price(row.price)} on Amazon</p>
                  </div>
                </div>
              </th>
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <Sparkline values={row.trend} width={72} height={28} />
                  <span className="w-14 text-right text-xs">
                    <Delta value={row.unitsChangePercent} />
                  </span>
                </div>
                <span className="sr-only">{trendText(row)}</span>
              </td>
              <td className="py-2.5 text-right">{units(row.units)}</td>
              <td className="py-2.5 text-right">{money(row.sales)}</td>
              <td className={`py-2.5 text-right ${row.profit < 0 ? "text-[var(--delta-bad)]" : ""}`}>{money(row.profit)}</td>
              <td className="py-2.5 text-right">{money(row.profitPerItem)}</td>
              <td className="py-2.5 text-right">{percent(row.marginPercent)}</td>
              <td className="py-2.5 text-right">
                <StockLeft row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shop-style card: big photo with badges, price, profit, sales and stock. */
function ItemCard({ row }: { row: ProductRow }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
      <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
        <ProductImage name={row.name} src={row.imageUrl} size="fill" />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {badgesFor(row, 2).map((b) => (
            <span
              key={b.tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-zinc-900 shadow-sm dark:bg-zinc-950/90 dark:text-zinc-100"
            >
              <span className="size-2 rounded-full" style={{ background: `var(--status-${b.status})` }} aria-hidden />
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{row.name}</p>
        <p className="text-lg font-semibold">{price(row.price)}</p>
        <p className={`text-xs ${row.profit < 0 ? "text-[var(--delta-bad)]" : "text-zinc-600 dark:text-zinc-400"}`}>
          {row.profit < 0 ? `${money(row.profit)} after ads` : `${money(row.profitPerItem)} profit each`}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          <span>
            {units(row.units)} sold · <Delta value={row.unitsChangePercent} />
          </span>
        </div>
        <Sparkline values={row.trend} width={120} height={32} />
        <span className="sr-only">{trendText(row)}</span>
        <p className="mt-auto pt-1 text-xs text-zinc-600 dark:text-zinc-400">
          <StockLeft row={row} />
        </p>
      </div>
    </li>
  );
}

function StockLeft({ row }: { row: ProductRow }) {
  const days = row.daysOfStockLeft;
  const status = days === null ? null : days < VERY_LOW_STOCK_DAYS ? "critical" : days < LOW_STOCK_DAYS ? "warning" : null;
  const daysText = days === null ? "no recent sales" : days > 365 ? "1 year+" : `${Math.round(days)} days`;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {status && <span className="size-2 rounded-full" style={{ background: `var(--status-${status})` }} aria-hidden />}
      {units(row.stockAtAmazon)} left <span className="text-zinc-500 dark:text-zinc-400">· {daysText}</span>
      {status && <span className="sr-only">{status === "critical" ? "(reorder now)" : "(reorder soon)"}</span>}
    </span>
  );
}
