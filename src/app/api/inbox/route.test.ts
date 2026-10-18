import { afterEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_HEADER } from "@/lib/chat";
import { GET, POST } from "./route";

const request = (method: string, body?: unknown, password = "pw") =>
  new Request("http://localhost/api/inbox", {
    method,
    headers: { "Content-Type": "application/json", [PASSWORD_HEADER]: password },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

afterEach(() => vi.unstubAllEnvs());

describe("/api/inbox", () => {
  it("needs the website password", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");

    expect((await GET(request("GET", undefined, "wrong"))).status).toBe(401);
    expect((await POST(request("POST", { kind: "feedback", text: "Hi" }, "wrong"))).status).toBe(401);
  });

  it("reports what's connected", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");
    vi.stubEnv("EMAIL_USER", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const body = await (await GET(request("GET"))).json();
    expect(body).toMatchObject({ messages: [], settings: { autoReply: true }, saved: false, emailConnected: false, aiConnected: false });
  });

  it("says when the AI isn't switched on, and rejects empty messages", async () => {
    vi.stubEnv("APP_PASSWORD", "pw");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect((await POST(request("POST", { kind: "customer_message", text: "Hello" }))).status).toBe(503);

    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect((await POST(request("POST", { kind: "customer_message", text: "  " }))).status).toBe(400);
  });
});
