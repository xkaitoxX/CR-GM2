import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorised } from "./auth";
import { PASSWORD_HEADER } from "./chat";

const request = (password?: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: password === undefined ? {} : { [PASSWORD_HEADER]: password },
  });

afterEach(() => vi.unstubAllEnvs());

describe("isAuthorised", () => {
  it("needs the right password when one is set", () => {
    vi.stubEnv("APP_PASSWORD", "open-sesame");

    expect(isAuthorised(request("open-sesame"))).toBe(true);
    expect(isAuthorised(request("wrong"))).toBe(false);
    expect(isAuthorised(request())).toBe(false);
  });

  it("refuses everyone on the live site when no password is set", () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(isAuthorised(request())).toBe(false);
  });

  it("allows local development without a password", () => {
    vi.stubEnv("APP_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(isAuthorised(request())).toBe(true);
  });
});
