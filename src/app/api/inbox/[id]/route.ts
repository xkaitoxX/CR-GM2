import { z } from "zod";
import { denied, notFound, readBody } from "@/lib/api";
import { markMessageSent } from "@/lib/customers/inbox";
import { INBOX } from "@/lib/customers/types";
import { getStore } from "@/lib/store/store";

/** The owner sent or posted a waiting reply, possibly after editing it. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/inbox/[id]">) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const body = await readBody(request, z.object({ reply: z.string().trim().min(1).max(10000).optional() }));
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.get(INBOX, id))) return notFound();
  return Response.json(await markMessageSent(store, id, body.reply));
}
