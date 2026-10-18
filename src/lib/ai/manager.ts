import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { BUSINESS_CONTEXT, FALLBACK, MODEL } from "@/lib/ai/config";
import { runDealsHelper } from "@/lib/ai/helpers/deals";
import { runToText, type StatusFn } from "@/lib/ai/run";
import { profitTool } from "@/lib/ai/tools/profit-tool";
import type { ChatTurn } from "@/lib/chat";

const SYSTEM = `You are the manager of the owner's Amazon UK reselling assistant. You are the only one the owner talks to. You hand research jobs to your helpers, then give the owner one clear answer.

${BUSINESS_CONTEXT}

Your team:
- Deals and Trends helper (ask_deals_helper): researches products on the web. It finds Amazon prices, cheaper places to buy, FBA fees, demand, competition and risks, and runs the profit numbers. Use it whenever the owner wants a product checked, product ideas, or trends. Give it a complete job description, because it can't see this conversation. You can ask it more than once, for example one job per product.
- Coming later (not built yet): Suppliers helper (writes messages to suppliers and compares replies), Marketing helper (ads, listings, social posts), and Customers and Admin helper (customer replies, to-do lists, reports). If the owner asks for these, say they're coming soon and help as much as you can yourself.

How to answer:
- Use calculate_profit for any profit maths. Never work out profit yourself.
- Lead with the answer: buy or don't buy, and why. Then the key numbers.
- Keep it short. Use bullet points or a small table for numbers.
- Say which numbers are estimates and what the owner should check before buying.
- If the owner hasn't given enough detail (for example which product), ask one short question.`;

/** Runs the manager on a conversation and returns its reply. */
export async function runManager(
  client: Anthropic,
  history: ChatTurn[],
  onStatus: StatusFn = () => {},
): Promise<string> {
  const askDealsHelper = betaZodTool({
    name: "ask_deals_helper",
    description:
      "Give the Deals and Trends helper a research job: checking a product (name or link) or finding product ideas and trends. Returns its report.",
    inputSchema: z.object({
      task: z
        .string()
        .describe("The full job, including product names, links, prices and anything the owner said that matters"),
    }),
    run: async ({ task }) => {
      onStatus("Asking the Deals and Trends helper");
      return runDealsHelper(client, task, onStatus);
    },
  });

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    ...FALLBACK,
    max_iterations: 10,
    system: SYSTEM,
    tools: [askDealsHelper, profitTool],
    messages: history.map((turn) => ({ role: turn.role, content: turn.text })),
  });
  return runToText(runner);
}
