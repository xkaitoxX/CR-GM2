import { timingSafeEqual } from "node:crypto";
import { PASSWORD_HEADER } from "@/lib/chat";

/**
 * The site is private: AI requests must carry APP_PASSWORD, so strangers can't spend the
 * owner's AI credit. Without APP_PASSWORD set, only local development is allowed.
 */
export function isAuthorised(request: Request): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production";
  return sameText(request.headers.get(PASSWORD_HEADER) ?? "", expected);
}

/** Scheduled jobs (Vercel Cron or another pinger) send `Authorization: Bearer <CRON_SECRET>`. */
export function isScheduledJob(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && sameText(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

function sameText(given: string, wanted: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  return a.length === b.length && timingSafeEqual(a, b);
}
