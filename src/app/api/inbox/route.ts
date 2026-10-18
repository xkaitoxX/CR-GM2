import { z } from "zod";
import { denied, readBody } from "@/lib/api";
import { inboxDeps } from "@/lib/customers/deps";
import { getSettings, handleIncoming } from "@/lib/customers/inbox";
import { INBOX, type InboxMessage } from "@/lib/customers/types";
import { emailConfig } from "@/lib/email/config";
import { getStore } from "@/lib/store/store";

export const maxDuration = 60;

export async function GET(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const store = getStore();
  const [messages, settings] = await Promise.all([store.list<InboxMessage>(INBOX), getSettings(store)]);
  return Response.json({
    messages,
    settings,
    saved: store.persistent,
    emailConnected: emailConfig() !== null,
    aiConnected: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

const pasted = z.object({
  kind: z.enum(["customer_message", "feedback"]),
  from: z.string().trim().max(200).optional(),
  text: z.string().trim().min(1).max(10000),
  productName: z.string().trim().max(200).optional(),
  orderId: z.string().trim().max(100).optional(),
});

/** The owner pastes a message or feedback that didn't arrive by email. */
export async function POST(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not_configured" }, { status: 503 });
  const body = await readBody(request, pasted);
  if (body instanceof Response) return body;

  const result = await handleIncoming(inboxDeps(), {
    ...body,
    from: body.from || "Customer",
    productName: body.productName || undefined,
    orderId: body.orderId || undefined,
    receivedAt: new Date().toISOString(),
    source: "pasted",
  });
  return Response.json(result);
}
