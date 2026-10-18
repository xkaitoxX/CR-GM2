import { timingSafeEqual } from "node:crypto";
import { PASSWORD_HEADER } from "@/lib/chat";

/**
 * The site is private: AI requests must carry APP_PASSWORD, so strangers can't spend the
 * owner's AI credit. Without APP_PASSWORD set, only local development is allowed.
 */
export function isAuthorised(request: Request): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production";

  const given = Buffer.from(request.headers.get(PASSWORD_HEADER) ?? "");
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
