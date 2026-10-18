import type { Metadata } from "next";
import InboxView from "@/components/inbox/inbox-view";

export const metadata: Metadata = { title: "Inbox · Seller Assistant" };

export default function InboxPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Inbox</h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        Customer messages and feedback. The AI answers the simple ones and sends the rest to Tickets.
      </p>
      <InboxView />
    </main>
  );
}
