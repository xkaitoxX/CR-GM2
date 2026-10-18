import ProfitCalculator from "@/components/profit-calculator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Seller Assistant</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Profit calculator</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Check whether an item makes money on Amazon UK before you buy it. Change any number and the
          result updates straight away.
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
