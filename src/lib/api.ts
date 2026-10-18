// Small helpers shared by the API routes.
import type { ZodType } from "zod";
import { isAuthorised } from "@/lib/auth";

/** A 401 response when the request doesn't carry the website password, otherwise null. */
export function denied(request: Request): Response | null {
  return isAuthorised(request) ? null : Response.json({ error: "unauthorised" }, { status: 401 });
}

/** Parses and checks a JSON body. Returns the data, or a 400 response. */
export async function readBody<T>(request: Request, schema: ZodType<T>): Promise<T | Response> {
  const result = schema.safeParse(await request.json().catch(() => null));
  return result.success ? result.data : Response.json({ error: "bad_request" }, { status: 400 });
}

export const notFound = () => Response.json({ error: "not_found" }, { status: 404 });
