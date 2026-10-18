import { describe, expect, it } from "vitest";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { MODEL } from "./config";
import { runManager } from "./manager";
import { fakeClient, fakeMessage, textMessage } from "./test-helpers";

const toolNames = (tools: unknown[]) => tools.map((t) => (t as { name: string }).name);

describe("runManager", () => {
  it("sends the conversation to the manager with its tools and the refusal fallback", async () => {
    const { client, calls } = fakeClient([textMessage("Hello! What should I check?")]);

    const reply = await runManager(client, [{ role: "user", text: "Hi" }]);

    expect(reply).toBe("Hello! What should I check?");
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe(MODEL);
    expect(calls[0].fallbacks).toBe("default");
    expect(calls[0].betas).toContain("server-side-fallback-2026-07-01");
    expect(toolNames(calls[0].tools)).toEqual([
      "ask_deals_helper",
      "get_sales_report",
      "suggest_price",
      "calculate_profit",
    ]);
    expect(calls[0].messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("hands research to the Deals helper and reports its progress", async () => {
    const helperSearch = fakeMessage(
      [{ type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "garlic press amazon uk price" } }],
      "tool_use",
    );
    const { client, calls } = fakeClient(
      [textMessage("Buy it.")],
      [helperSearch, textMessage("Good deal: £3.99 profit per item.")],
    );
    const statuses: string[] = [];

    await runManager(client, [{ role: "user", text: "Check a garlic press" }], (s) => statuses.push(s));
    const askHelper = calls[0].tools.find(
      (t) => (t as { name: string }).name === "ask_deals_helper",
    ) as BetaRunnableTool<{ task: string }>;
    const report = await askHelper.run({ task: "Check the Joseph Joseph garlic press" });

    expect(report).toBe("Good deal: £3.99 profit per item.");
    expect(calls[1].messages).toEqual([{ role: "user", content: "Check the Joseph Joseph garlic press" }]);
    expect(toolNames(calls[1].tools)).toEqual(["web_search", "suggest_price", "calculate_profit"]);
    expect(statuses).toEqual([
      "Asking the Deals and Trends helper",
      "Deals helper searched: garlic press amazon uk price",
    ]);
  });
});
