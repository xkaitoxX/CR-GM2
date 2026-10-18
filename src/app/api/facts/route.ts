import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { denied, readBody } from "@/lib/api";
import { getBusinessData } from "@/lib/business/example-data";
import { FACTS, type FactSheet } from "@/lib/customers/types";
import { getStore } from "@/lib/store/store";

/** Every item with its fact sheet (empty if not written yet). */
export async function GET(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const store = getStore();
  const sheets = new Map((await store.list<FactSheet>(FACTS)).map((r) => [r.id, r.data.facts]));
  const items = getBusinessData().products.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    facts: sheets.get(p.id) ?? "",
  }));
  return Response.json({ items, saved: store.persistent });
}

export async function PUT(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const body = await readBody(
    request,
    z.object({ productId: z.string().min(1).max(100), productName: z.string().min(1).max(200), facts: z.string().max(5000) }),
  );
  if (body instanceof Response) return body;
  const store = getStore();
  const saved = await store.put<FactSheet>(FACTS, body.productId, { productName: body.productName, facts: body.facts });
  await logActivity(store, { actor: "owner", title: `Updated the fact sheet for ${body.productName}` });
  return Response.json(saved);
}
