"use client";

import { useState } from "react";

/** Round axis steps (1, 2, 2.5 or 5 × a power of ten) covering min..max, always including zero. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0, 1];
  const rough = (hi - lo) / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t < hi + step / 2; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }
  if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export interface ColumnDatum {
  key: string;
  label: string;
  /** Longer description for the tooltip and table, e.g. a date range. */
  detail: string;
  value: number;
}

const PLOT_HEIGHT = 200;
const MAX_X_LABELS = 6;

/** Single-series column chart with a hover tooltip and a table view. */
export function ColumnChart({
  data,
  format,
  formatAxis,
  title,
}: {
  data: ColumnDatum[];
  format: (n: number) => string;
  formatAxis: (n: number) => string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const ticks = niceTicks(Math.min(...data.map((d) => d.value)), Math.max(...data.map((d) => d.value)));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const zero = pos(0);
  const labelEvery = Math.ceil(data.length / MAX_X_LABELS);

  return (
    <figure>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-medium text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
        >
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <th scope="row" className="py-1.5 text-left font-normal text-zinc-600 dark:text-zinc-400">
                    {d.detail}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2" onMouseLeave={() => setActive(null)}>
          {/* y-axis */}
          <div className="relative w-11 shrink-0 text-right text-[11px] text-[var(--viz-muted)] tabular-nums" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${pos(t)}%` }}>
                {formatAxis(t)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: PLOT_HEIGHT }}>
              {ticks.map((t) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 h-px ${t === 0 ? "bg-[var(--viz-axis)]" : "bg-[var(--viz-grid)]"}`}
                  style={{ bottom: `${pos(t)}%` }}
                />
              ))}

              <div className="absolute inset-0 flex">
                {data.map((d, i) => {
                  const height = Math.abs(pos(d.value) - zero);
                  const positive = d.value >= 0;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      aria-label={`${d.detail}: ${format(d.value)}`}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className="relative h-full flex-1 outline-none"
                    >
                      <span
                        className={`absolute left-1/2 w-[70%] max-w-6 -translate-x-1/2 transition-opacity ${
                          positive ? "rounded-t-[4px]" : "rounded-b-[4px]"
                        } ${d.value < 0 ? "bg-[var(--status-critical)]" : "bg-[var(--series-1)]"} ${
                          active !== null && active !== i ? "opacity-40" : ""
                        }`}
                        style={positive ? { bottom: `${zero}%`, height: `${height}%` } : { top: `${100 - zero}%`, height: `${height}%` }}
                      />
                    </button>
                  );
                })}
              </div>

              {active !== null && (
                <div
                  role="status"
                  className={`pointer-events-none absolute -top-2 z-10 rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/10 dark:bg-zinc-800 dark:ring-white/10 ${
                    active < data.length / 3 ? "" : active > (data.length * 2) / 3 ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
                >
                  <p className="text-sm font-semibold tabular-nums">{format(data[active].value)}</p>
                  <p className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{data[active].detail}</p>
                </div>
              )}
            </div>

            {/* x-axis */}
            <div className="mt-1.5 flex text-[11px] text-[var(--viz-muted)]">
              {data.map((d, i) => (
                <span key={d.key} className="flex-1 text-center whitespace-nowrap">
                  {i % labelEvery === 0 ? d.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  note?: string;
}

/** Horizontal bars with the value at each bar's tip. Negative values extend left of zero. */
export function BarList({ data, format }: { data: BarDatum[]; format: (n: number) => string }) {
  const lo = Math.min(0, ...data.map((d) => d.value));
  const hi = Math.max(0, ...data.map((d) => d.value));
  const range = hi - lo || 1;
  const zero = (-lo / range) * 100;

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const width = (Math.abs(d.value) / range) * 100;
        const negative = d.value < 0;
        return (
          <li key={d.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{d.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {format(d.value)}
                {d.note && <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">{d.note}</span>}
              </span>
            </div>
            <div className="relative mt-1 h-3">
              {lo < 0 && <div className="absolute inset-y-[-2px] w-px bg-[var(--viz-axis)]" style={{ left: `${zero}%` }} />}
              <div
                className={`absolute inset-y-0 ${negative ? "rounded-l-[4px] bg-[var(--status-critical)]" : "rounded-r-[4px] bg-[var(--series-1)]"}`}
                style={negative ? { right: `${100 - zero}%`, width: `${width}%` } : { left: `${zero}%`, width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface SegmentDatum {
  key: string;
  label: string;
  value: number;
  /** CSS colour, e.g. var(--series-1). */
  color: string;
}

/** One 100% bar split into parts, with a legend that lists every value. */
export function StackedBar({ data, format }: { data: SegmentDatum[]; format: (n: number) => string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = data.reduce((n, d) => n + d.value, 0) || 1;

  return (
    <div>
      <div className="flex h-6 gap-[2px]" onMouseLeave={() => setActive(null)}>
        {data.map((d) => (
          <div
            key={d.key}
            title={`${d.label}: ${format(d.value)}`}
            onMouseEnter={() => setActive(d.key)}
            className={`h-full first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity ${
              active !== null && active !== d.key ? "opacity-40" : ""
            }`}
            style={{ flexGrow: d.value, flexBasis: 0, minWidth: 3, background: d.color }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {data.map((d) => (
          <li
            key={d.key}
            onMouseEnter={() => setActive(d.key)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center gap-2"
          >
            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="flex-1 text-zinc-600 dark:text-zinc-400">{d.label}</span>
            <span className="font-medium tabular-nums">{format(d.value)}</span>
            <span className="w-12 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
