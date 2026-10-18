import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, MODEL, modelParams, webSearchTool } from "./config";

describe("AI model settings", () => {
  it("uses the cheapest Claude model unless AI_MODEL says otherwise", () => {
    expect(DEFAULT_MODEL).toBe("claude-haiku-5-5");
    expect(MODEL).toBe(process.env.AI_MODEL || DEFAULT_MODEL);
  });

  it("only asks for a refusal fallback on models that have one", () => {
    expect(modelParams("low", "claude-haiku-5-5")).toEqual({ model: "claude-haiku-5-5", output_config: { effort: "low" } });
    expect(modelParams("medium", "claude-sonnet-5-5")).toEqual({
      model: "claude-sonnet-5-5",
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  });

  it("picks the web search version the model supports", () => {
    expect(webSearchTool(5, "claude-haiku-5-5").type).toBe("web_search_20250305");
    expect(webSearchTool(5, "claude-sonnet-5-5").type).toBe("web_search_20260209");
    expect(webSearchTool(5, "claude-opus-5-5")).toMatchObject({ max_uses: 5, user_location: { country: "GB" } });
  });
});
