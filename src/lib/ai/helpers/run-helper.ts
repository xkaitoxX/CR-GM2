import type Anthropic from "@anthropic-ai/sdk";
import type { BetaToolRunnerParams } from "@anthropic-ai/sdk/lib/tools/BetaToolRunner";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { modelParams, type Effort } from "@/lib/ai/config";
import { runToText, type StatusFn } from "@/lib/ai/run";

export interface HelperSpec {
  /** Shown in progress messages, e.g. "Deals helper". */
  name: string;
  system: string;
  tools: BetaToolRunnerParams["tools"];
  effort: Effort;
  maxIterations: number;
  /** Progress text when the helper uses a tool, by tool name. */
  toolStatus: Record<string, string>;
}

function reportProgress(spec: HelperSpec, message: BetaMessage, onStatus: StatusFn) {
  for (const block of message.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const query = typeof block.input.query === "string" ? block.input.query : "";
      onStatus(query ? `${spec.name} searched: ${query}` : `${spec.name} is searching the web`);
    } else if (block.type === "tool_use") {
      onStatus(`${spec.name} ${spec.toolStatus[block.name] ?? `is using ${block.name}`}`);
    }
  }
}

/** Runs one helper on one job and returns its report. */
export function runHelper(client: Anthropic, spec: HelperSpec, task: string, onStatus: StatusFn = () => {}) {
  const runner = client.beta.messages.toolRunner({
    ...modelParams(spec.effort),
    max_tokens: 16000,
    max_iterations: spec.maxIterations,
    system: spec.system,
    tools: spec.tools,
    messages: [{ role: "user", content: task }],
  });
  return runToText(runner, (message) => reportProgress(spec, message, onStatus));
}
