// Fakes for testing the agents without calling the real AI.
import type Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { BetaToolRunnerParams } from "@anthropic-ai/sdk/lib/tools/BetaToolRunner";
import type { AgentRunner } from "@/lib/ai/run";

export function fakeMessage(
  content: Partial<BetaContentBlock>[],
  stop_reason: BetaMessage["stop_reason"] = "end_turn",
): BetaMessage {
  return { content, stop_reason } as BetaMessage;
}

export const textMessage = (text: string) => fakeMessage([{ type: "text", text } as BetaContentBlock]);

export class FakeRunner implements AgentRunner {
  pushed: BetaMessageParam[] = [];
  constructor(private messages: BetaMessage[]) {}
  async *[Symbol.asyncIterator]() {
    yield* this.messages;
  }
  pushMessages(...messages: BetaMessageParam[]) {
    this.pushed.push(...messages);
  }
  async done() {
    return this.messages[this.messages.length - 1];
  }
}

/** A client whose tool runner answers each call with the next list of messages. */
export function fakeClient(...replies: BetaMessage[][]) {
  const calls: BetaToolRunnerParams[] = [];
  const client = {
    beta: {
      messages: {
        toolRunner: (params: BetaToolRunnerParams) => {
          calls.push(params);
          return new FakeRunner(replies[calls.length - 1] ?? [textMessage("")]);
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}
