// A log of everything the AI (and the owner) did, so the owner can always check.
import { newId, type Store, type StoredRecord } from "@/lib/store/store";

export const ACTIVITY = "activity";

export interface Activity {
  actor: "ai" | "owner";
  /** e.g. "Replied to a customer", "Opened a ticket". */
  title: string;
  detail?: string;
  /** Page in the website this is about, e.g. /tickets/abc. */
  link?: string;
}

export function logActivity(store: Store, activity: Activity): Promise<StoredRecord<Activity>> {
  return store.put(ACTIVITY, newId(), activity);
}

export function recentActivity(store: Store, limit = 100) {
  return store.list<Activity>(ACTIVITY, limit);
}
