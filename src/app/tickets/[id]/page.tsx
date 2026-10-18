import type { Metadata } from "next";
import { Suspense } from "react";
import TicketView from "@/components/tickets/ticket-view";

export const metadata: Metadata = { title: "Ticket · Seller Assistant" };

export default function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        {params.then(({ id }) => (
          <TicketView id={id} />
        ))}
      </Suspense>
    </main>
  );
}
