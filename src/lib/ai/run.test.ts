import { describe, expect, it } from "vitest";
import type { BetaContentBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { runToText } from "./run";
import { FakeRunner, fakeMessage, textMessage } from "./test-helpers";

const text = (t: string) => ({ type: "text", text: t }) as BetaContentBlock;

describe("runToText", () => {
  it("returns the final message's text", async () => {
    const runner = new FakeRunner([fakeMessage([text("Buy "), text("6 of them.")])]);

    expect(await runToText(runner)).toBe("Buy 6 of them.");
  });

  it("resumes a paused web-search turn", async () => {
    const paused = fakeMessage([text("Searching…")], "pause_turn");
    const runner = new FakeRunner([paused, textMessage("Done")]);

    expect(await runToText(runner)).toBe("Done");
    expect(runner.pushed).toEqual([{ role: "assistant", content: paused.content }]);
  });

  it("reports every message to onMessage", async () => {
    const seen: string[] = [];
    const runner = new FakeRunner([textMessage("one"), textMessage("two")]);

    await runToText(runner, (m) => seen.push(m.stop_reason ?? ""));
    expect(seen).toEqual(["end_turn", "end_turn"]);
  });

  it("explains a refusal instead of returning nothing", async () => {
    const runner = new FakeRunner([fakeMessage([], "refusal")]);

    expect(await runToText(runner)).toMatch(/can't help/);
  });

  it("says when an answer was cut off", async () => {
    const runner = new FakeRunner([fakeMessage([text("Half an answer")], "max_tokens")]);

    expect(await runToText(runner)).toMatch(/^Half an answer[\s\S]*cut off/);
  });

  it("never returns an empty reply", async () => {
    const runner = new FakeRunner([textMessage("  ")]);

    expect(await runToText(runner)).toMatch(/couldn't come up with an answer/);
  });
});
