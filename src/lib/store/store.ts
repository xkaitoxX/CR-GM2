// A small document store: records grouped into collections, each with an id and JSON data.
// Uses Supabase when it's set up, otherwise keeps records in memory (lost on restart).

export interface StoredRecord<T> {
  id: string;
  data: T;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  /** False when records are only kept in memory. */
  readonly persistent: boolean;
  get<T>(collection: string, id: string): Promise<StoredRecord<T> | null>;
  /** Most recently updated first. */
  list<T>(collection: string, limit?: number): Promise<StoredRecord<T>[]>;
  put<T>(collection: string, id: string, data: T): Promise<StoredRecord<T>>;
  remove(collection: string, id: string): Promise<void>;
}

export const DEFAULT_LIST_LIMIT = 200;

let lastTime = 0;
let sameTimeCount = 0;

/** Sortable unique id: newer ids sort after older ones, even within the same millisecond. */
export function newId() {
  const now = Date.now();
  sameTimeCount = now === lastTime ? sameTimeCount + 1 : 0;
  lastTime = now;
  return `${now.toString(36).padStart(9, "0")}${sameTimeCount.toString(36).padStart(3, "0")}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createMemoryStore(now = () => new Date().toISOString()): Store {
  const collections = new Map<string, Map<string, StoredRecord<unknown>>>();
  // Order of saves, so records saved in the same millisecond still list newest first.
  const saveOrder = new Map<StoredRecord<unknown>, number>();
  let saves = 0;
  const records = (collection: string) => {
    let c = collections.get(collection);
    if (!c) collections.set(collection, (c = new Map()));
    return c;
  };

  return {
    persistent: false,
    async get<T>(collection: string, id: string) {
      return (records(collection).get(id) as StoredRecord<T> | undefined) ?? null;
    },
    async list<T>(collection: string, limit = DEFAULT_LIST_LIMIT) {
      return ([...records(collection).values()] as StoredRecord<T>[])
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || saveOrder.get(b)! - saveOrder.get(a)!)
        .slice(0, limit);
    },
    async put<T>(collection: string, id: string, data: T) {
      const existing = records(collection).get(id);
      const time = now();
      const record = { id, data, createdAt: existing?.createdAt ?? time, updatedAt: time };
      if (existing) saveOrder.delete(existing);
      saveOrder.set(record, saves++);
      records(collection).set(id, record);
      return record;
    },
    async remove(collection: string, id: string) {
      const existing = records(collection).get(id);
      if (existing) saveOrder.delete(existing);
      records(collection).delete(id);
    },
  };
}

interface Row {
  id: string;
  data: unknown;
  created_at: string;
  updated_at: string;
}

const toRecord = <T>(row: Row): StoredRecord<T> => ({
  id: row.id,
  data: row.data as T,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Supabase (PostgREST) store on the `records` table from supabase/schema.sql. */
export function createSupabaseStore(url: string, serviceKey: string, fetchFn: typeof fetch = fetch): Store {
  const base = `${url.replace(/\/$/, "")}/rest/v1/records`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const eq = (value: string) => `eq.${encodeURIComponent(value)}`;

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetchFn(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    if (!response.ok) throw new Error(`Database error ${response.status}: ${await response.text()}`);
    return response;
  }

  return {
    persistent: true,
    async get<T>(collection: string, id: string) {
      const rows: Row[] = await (await request(`?collection=${eq(collection)}&id=${eq(id)}&select=*`)).json();
      return rows[0] ? toRecord<T>(rows[0]) : null;
    },
    async list<T>(collection: string, limit = DEFAULT_LIST_LIMIT) {
      const rows: Row[] = await (
        await request(`?collection=${eq(collection)}&select=*&order=updated_at.desc,id.desc&limit=${limit}`)
      ).json();
      return rows.map((row) => toRecord<T>(row));
    },
    async put<T>(collection: string, id: string, data: T) {
      const rows: Row[] = await (
        await request("", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify([{ collection, id, data, updated_at: new Date().toISOString() }]),
        })
      ).json();
      return toRecord<T>(rows[0]);
    },
    async remove(collection: string, id: string) {
      await request(`?collection=${eq(collection)}&id=${eq(id)}`, { method: "DELETE" });
    },
  };
}

const globalStore = globalThis as unknown as { __sellerAssistantStore?: Store };

/** The store for this server: Supabase when configured, otherwise one shared in-memory store. */
export function getStore(): Store {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) return createSupabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return (globalStore.__sellerAssistantStore ??= createMemoryStore());
}
