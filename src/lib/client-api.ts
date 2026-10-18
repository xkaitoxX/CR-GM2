"use client";

// Calls the website's own API from the browser, with the saved website password.
import { useCallback, useEffect, useState } from "react";
import { PASSWORD_HEADER } from "@/lib/chat";

const PASSWORD_KEY = "seller-assistant-password";

export function readPassword() {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePassword(password: string) {
  try {
    localStorage.setItem(PASSWORD_KEY, password);
  } catch {
    // Private browsing: the password lasts until the page is closed.
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", [PASSWORD_HEADER]: readPassword(), ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body.error ?? "error");
  return body as T;
}

export const send = <T>(path: string, method: "POST" | "PUT" | "PATCH", body: unknown) =>
  api<T>(path, { method, body: JSON.stringify(body) });

/** Loads data from the API, and says when the website password is needed. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<T>(path)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: unknown) => !cancelled && setError(e instanceof ApiError ? e : new ApiError(0, "network")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, needsPassword: error?.status === 401 };
}
