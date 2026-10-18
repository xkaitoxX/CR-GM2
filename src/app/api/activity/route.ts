import { recentActivity } from "@/lib/activity";
import { denied } from "@/lib/api";
import { getStore } from "@/lib/store/store";

export async function GET(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const store = getStore();
  return Response.json({ activity: await recentActivity(store), saved: store.persistent });
}
