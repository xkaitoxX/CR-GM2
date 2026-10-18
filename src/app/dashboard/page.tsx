import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/dashboard";
import { getBusinessData } from "@/lib/business/example-data";
import { PERIODS, summarise, type DashboardSummary, type PeriodDays } from "@/lib/business/summary";

export const metadata: Metadata = { title: "Dashboard · Seller Assistant" };

export default function DashboardPage() {
  const data = getBusinessData();
  const summaries = Object.fromEntries(PERIODS.map((days) => [days, summarise(data, days)])) as Record<
    PeriodDays,
    DashboardSummary
  >;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
      <Dashboard summaries={summaries} />
    </main>
  );
}
