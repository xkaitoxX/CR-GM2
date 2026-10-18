import { afterEach, describe, expect, it, vi } from "vitest";
import { logActivity, recentActivity } from "@/lib/activity";
import { createMemoryStore, createSupabaseStore, getStore, newId } from "./store";

const clock = () => {
  let t = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, t++)).toISOString();
};

afterEach(() => vi.unstubAllEnvs());

describe("memory store", () => {
  it("saves, updates, lists newest first and removes", async () => {
    const store = createMemoryStore(clock());

    await store.put("tickets", "a", { title: "First" });
    await store.put("tickets", "b", { title: "Second" });
    const updated = await store.put("tickets", "a", { title: "First, updated" });

    expect(updated.createdAt).not.toBe(updated.updatedAt);
    expect((await store.get<{ title: string }>("tickets", "a"))?.data.title).toBe("First, updated");
    expect((await store.list("tickets")).map((r) => r.id)).toEqual(["a", "b"]);
    expect(await store.list("tickets", 1)).toHaveLength(1);
    expect(await store.list("other")).toEqual([]);

    await store.remove("tickets", "a");
    expect(await store.get("tickets", "a")).toBeNull();
    expect(store.persistent).toBe(false);
  });
});

describe("newId", () => {
  it("makes unique ids that sort by time", async () => {
    const first = newId();
    await new Promise((r) => setTimeout(r, 2));
    const second = newId();

    expect(second > first).toBe(true);
    expect(new Set(Array.from({ length: 50 }, newId)).size).toBe(50);
  });
});

describe("Supabase store", () => {
  const row = { id: "a", data: { title: "Hi" }, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" };

  function fakeFetch(body: unknown, ok = true) {
    return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));
  }

  it("reads a record with the service key", async () => {
    const fetchFn = fakeFetch([row]);
    const store = createSupabaseStore("https://x.supabase.co/", "secret", fetchFn);

    expect(await store.get("tickets", "a")).toEqual({
      id: "a",
      data: { title: "Hi" },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/records?collection=eq.tickets&id=eq.a&select=*");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(store.persistent).toBe(true);
  });

  it("upserts with merge-duplicates", async () => {
    const fetchFn = fakeFetch([row]);
    const store = createSupabaseStore("https://x.supabase.co", "secret", fetchFn);

    await store.put("tickets", "a", { title: "Hi" });
    const [, init] = fetchFn.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Prefer).toContain("merge-duplicates");
    expect(JSON.parse(init?.body as string)[0]).toMatchObject({ collection: "tickets", id: "a", data: { title: "Hi" } });
  });

  it("lists newest first and reports database errors", async () => {
    const store = createSupabaseStore("https://x.supabase.co", "secret", fakeFetch([row]));
    await store.list("tickets", 5);

    const broken = createSupabaseStore("https://x.supabase.co", "secret", fakeFetch({}, false));
    await expect(broken.get("tickets", "a")).rejects.toThrow(/Database error 500/);
  });
});

describe("getStore", () => {
  it("uses memory when Supabase isn't set up, and the same store every time", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(getStore().persistent).toBe(false);
    expect(getStore()).toBe(getStore());
  });

  it("uses Supabase when it is set up", () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secret");

    expect(getStore().persistent).toBe(true);
  });
});

describe("activity log", () => {
  it("records what happened, newest first", async () => {
    const store = createMemoryStore(clock());

    await logActivity(store, { actor: "ai", title: "Replied to a customer" });
    await logActivity(store, { actor: "ai", title: "Opened a ticket", link: "/tickets/1" });

    expect((await recentActivity(store)).map((r) => r.data.title)).toEqual(["Opened a ticket", "Replied to a customer"]);
  });
});
