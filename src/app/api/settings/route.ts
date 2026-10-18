import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { denied, readBody } from "@/lib/api";
import { saveSettings } from "@/lib/customers/inbox";
import { getStore } from "@/lib/store/store";

export async function PUT(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const body = await readBody(request, z.object({ autoReply: z.boolean() }));
  if (body instanceof Response) return body;
  const store = getStore();
  const saved = await saveSettings(store, body);
  await logActivity(store, {
    actor: "owner",
    title: body.autoReply ? "Switched automatic replies on" : "Switched automatic replies off",
  });
  return Response.json(saved.data);
}
