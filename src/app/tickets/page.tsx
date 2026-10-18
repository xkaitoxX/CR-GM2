import type { Metadata } from "next";
import TicketsView from "@/components/tickets/tickets-view";

export const metadata: Metadata = { title: "Tickets · Seller Assistant" };

export default function TicketsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Tickets</h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">Problems the AI handed to you, most urgent first.</p>
      <TicketsView />
    </main>
  );
}
