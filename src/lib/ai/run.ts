import type {
  BetaMessage,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";

export type StatusFn = (text: string) => void;

/** The parts of the SDK's tool runner the agents use. */
export interface AgentRunner extends AsyncIterable<BetaMessage> {
  pushMessages(...messages: BetaMessageParam[]): void;
  done(): Promise<BetaMessage>;
}

/**
 * Runs a tool runner to the end and returns the final text.
 * Calls `onMessage` for every assistant message so callers can report progress.
 */
export async function runToText(
  runner: AgentRunner,
  onMessage?: (message: BetaMessage) => void,
): Promise<string> {
  for await (const message of runner) {
    onMessage?.(message);
    // The runner doesn't resume a long server-tool turn (like web search) by itself.
    if (message.stop_reason === "pause_turn") {
      runner.pushMessages({ role: "assistant", content: message.content });
    }
  }

  const final = await runner.done();
  if (final.stop_reason === "refusal") {
    return "Sorry, I can't help with that request.";
  }

  const text = final.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  if (final.stop_reason === "max_tokens") {
    return `${text}\n\n_(My answer was cut off. Ask me to continue.)_`;
  }
  return text || "I couldn't come up with an answer. Please try asking in a different way.";
}
