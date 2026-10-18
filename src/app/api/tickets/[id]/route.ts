import { z } from "zod";
import { denied, notFound, readBody } from "@/lib/api";
import { SHOP_NAME } from "@/lib/ai/helpers/customers";
import { replyToTicket, updateTicket } from "@/lib/customers/inbox";
import { INBOX, TICKETS, type InboxMessage, type Ticket } from "@/lib/customers/types";
import { emailConfig } from "@/lib/email/config";
import { getMailer } from "@/lib/email/mailer";
import { getStore } from "@/lib/store/store";

export async function GET(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const store = getStore();
  const ticket = await store.get<Ticket>(TICKETS, id);
  if (!ticket) return notFound();
  const message = await store.get<InboxMessage>(INBOX, ticket.data.messageId);
  return Response.json({ ticket, message, emailConnected: emailConfig() !== null });
}

/** Change the status or add a note. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const body = await readBody(
    request,
    z.object({ status: z.enum(["open", "waiting", "resolved"]).optional(), note: z.string().max(5000).optional() }),
  );
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.get(TICKETS, id))) return notFound();
  return Response.json(await updateTicket(store, id, body));
}

/** Reply to the customer: sent by email when connected, otherwise recorded as sent by the owner. */
export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  const blocked = denied(request);
  if (blocked) return blocked;
  const body = await readBody(request, z.object({ reply: z.string().trim().min(1).max(10000) }));
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const store = getStore();
  if (!(await store.get(TICKETS, id))) return notFound();
  return Response.json(await replyToTicket({ store, mailer: getMailer(SHOP_NAME) }, id, body.reply));
}
