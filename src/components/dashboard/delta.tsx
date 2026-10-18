/** A signed change with an arrow, green when up and red when down (up is always good here). */
export default function Delta({ value, unit = "%" }: { value: number | null; unit?: "%" | " pts" }) {
  if (value === null) return <span className="text-zinc-500 dark:text-zinc-400">new</span>;
  const up = value >= 0;
  return (
    <span className={`font-medium whitespace-nowrap ${up ? "text-[var(--delta-good)]" : "text-[var(--delta-bad)]"}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span> {up ? "+" : "−"}
      {Math.abs(value).toFixed(0)}
      {unit}
    </span>
  );
}
