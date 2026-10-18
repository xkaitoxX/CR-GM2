import type { Metadata } from "next";
import ProfitCalculator from "@/components/profit-calculator";

export const metadata: Metadata = { title: "Profit calculator · Seller Assistant" };

export default function CalculatorPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profit calculator</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          The assistant uses this same calculator for you. Use it yourself to try your own numbers: change
          any number and the result updates straight away.
        </p>
      </header>

      <ProfitCalculator />

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
        Estimates only. Amazon changes its fees, so check the exact fees in Amazon&apos;s Revenue
        Calculator before buying.
      </p>
    </main>
  );
}
