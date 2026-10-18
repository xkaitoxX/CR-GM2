// Small building blocks shared by the Inbox and Tickets pages.
import type { ReactNode } from "react";

export const card = "rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800";

export const button =
  "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900";

export const quietButton =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800";

export const input =
  "w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-700 dark:focus:ring-zinc-100";

export type Tone = "good" | "warning" | "critical" | "info" | "neutral";

const DOT: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  info: "var(--series-1)",
  neutral: "var(--viz-muted)",
};

/** A label with a coloured dot. The word carries the meaning; the colour only helps. */
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      <span className="size-2 rounded-full" style={{ background: DOT[tone] }} aria-hidden />
      {children}
    </span>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-100">
      {children}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
          className="rounded-full px-3 py-1.5 text-zinc-600 aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-zinc-900 aria-pressed:shadow-sm dark:text-zinc-400 dark:aria-pressed:bg-zinc-950 dark:aria-pressed:text-zinc-100"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Copies text, and briefly says so. */
export function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className={quietButton}
      onClick={async (e) => {
        const el = e.currentTarget;
        try {
          await navigator.clipboard.writeText(text);
          el.textContent = "Copied";
        } catch {
          el.textContent = "Couldn't copy";
        }
        setTimeout(() => (el.textContent = "Copy"), 1500);
      }}
    >
      Copy
    </button>
  );
}
