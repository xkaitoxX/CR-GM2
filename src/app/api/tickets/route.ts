import { denied } from "@/lib/api";
import { TICKETS, type Ticket } from "@/lib/customers/types";
import { getStore } from "@/lib/store/store";

const STATUS_ORDER: Ticket["status"][] = ["open", "waiting", "resolved"];
const PRIORITY_ORDER: Ticket["priority"][] = ["urgent", "high", "normal"];

/** Open tickets first, then by priority, then soonest deadline. */
export async function GET(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const store = getStore();
  const tickets = (await store.list<Ticket>(TICKETS)).sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.data.status) - STATUS_ORDER.indexOf(b.data.status) ||
      PRIORITY_ORDER.indexOf(a.data.priority) - PRIORITY_ORDER.indexOf(b.data.priority) ||
      a.data.deadline.localeCompare(b.data.deadline),
  );
  return Response.json({ tickets, saved: store.persistent });
}
