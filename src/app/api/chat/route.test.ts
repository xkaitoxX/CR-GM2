import { afterEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_HEADER } from "@/lib/chat";
import { POST } from "./route";

const post = (body: unknown, password = "pw") =>
  POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", [PASSWORD_HEADER]: password },
      body: JSON.stringify(body),
    }),
  );

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/chat", () => {
  it("rejects a wrong password", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");

    expect((await post({ messages: [] }, "nope")).status).toBe(401);
  });

  it("says when the AI isn't switched on", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const response = await post({ messages: [{ role: "user", text: "Hi" }] });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not_configured" });
  });

  it("rejects a conversation that doesn't end with the owner's message", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const response = await post({
      messages: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ],
    });
    expect(response.status).toBe(400);
  });
});
