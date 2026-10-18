import { describe, expect, it } from "vitest";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { MODEL } from "./config";
import { runManager } from "./manager";
import { fakeClient, fakeMessage, textMessage } from "./test-helpers";

const toolNames = (tools: unknown[]) => tools.map((t) => (t as { name: string }).name);

describe("runManager", () => {
  it("sends the conversation to the manager with its tools on the cheap model", async () => {
    const { client, calls } = fakeClient([textMessage("Hello! What should I check?")]);

    const reply = await runManager(client, [{ role: "user", text: "Hi" }]);

    expect(reply).toBe("Hello! What should I check?");
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe(MODEL);
    expect(calls[0].output_config).toEqual({ effort: "medium" });
    expect(toolNames(calls[0].tools)).toEqual([
      "ask_deals_helper",
      "ask_marketing_helper",
      "ask_suppliers_helper",
      "ask_customers_helper",
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
      "Asking the Deals helper",
      "Deals helper searched: garlic press amazon uk price",
    ]);
  });

  it("hands supplier work to the Suppliers helper with its comparison tool", async () => {
    const { client, calls } = fakeClient([textMessage("Done.")], [textMessage("Pick Good Co.")]);
    const statuses: string[] = [];

    await runManager(client, [{ role: "user", text: "Compare these suppliers" }], (s) => statuses.push(s));
    const askSuppliers = calls[0].tools.find(
      (t) => (t as { name: string }).name === "ask_suppliers_helper",
    ) as BetaRunnableTool<{ task: string }>;

    expect(await askSuppliers.run({ task: "Compare Good Co and Risky Ltd" })).toBe("Pick Good Co.");
    expect(toolNames(calls[1].tools)).toEqual(["web_search", "compare_suppliers", "calculate_profit"]);
    expect(statuses).toEqual(["Asking the Suppliers helper"]);
  });

  it("hands what-to-sell questions to the Marketing helper with its basket tools", async () => {
    const { client, calls } = fakeClient([textMessage("Done.")], [textMessage("Buy 10 garlic presses.")]);

    await runManager(client, [{ role: "user", text: "Suggest a basket for £200" }]);
    const askMarketing = calls[0].tools.find(
      (t) => (t as { name: string }).name === "ask_marketing_helper",
    ) as BetaRunnableTool<{ task: string }>;

    expect(await askMarketing.run({ task: "Basket for £200" })).toBe("Buy 10 garlic presses.");
    expect(toolNames(calls[1].tools)).toEqual([
      "web_search",
      "plan_basket",
      "restock_basket",
      "get_season_calendar",
      "check_listing",
      "suggest_ad_budget",
      "suggest_price",
      "calculate_profit",
    ]);
  });
});
