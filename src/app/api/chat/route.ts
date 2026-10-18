import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runManager } from "@/lib/ai/manager";
import { isAuthorised } from "@/lib/auth";
import type { ChatEvent } from "@/lib/chat";

// Product research with web searches can take a few minutes.
export const maxDuration = 300;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(20000) }))
    .min(1)
    .max(40)
    .refine((turns) => turns[0].role === "user" && turns[turns.length - 1].role === "user", {
      message: "The conversation must start and end with the owner's message",
    }),
});

export async function POST(request: Request) {
  if (!isAuthorised(request)) {
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const reply = await runManager(client, body.data.messages, (text) => send({ type: "status", text }));
        send({ type: "reply", text: reply });
      } catch (error) {
        send({ type: "error", text: describeError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key isn't valid. Check ANTHROPIC_API_KEY in the website's settings.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The AI is busy or the monthly spending limit was reached. Try again in a minute.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The AI service had a problem (error ${error.status ?? "unknown"}). Please try again.`;
  }
  console.error(error);
  return "Something went wrong. Please try again.";
}
