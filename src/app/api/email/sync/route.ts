import { isAuthorised, isScheduledJob } from "@/lib/auth";
import { inboxDeps } from "@/lib/customers/deps";
import { emailConfig } from "@/lib/email/config";
import { readRecentEmails } from "@/lib/email/reader";
import { syncEmail } from "@/lib/email/sync";

// Reading email and writing replies can take a while.
export const maxDuration = 300;

/** Checks the inbox for new emails. Called on a schedule, or by the "Check email now" button. */
async function check(request: Request) {
  if (!isScheduledJob(request) && !isAuthorised(request)) {
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }
  const config = emailConfig();
  if (!config) return Response.json({ error: "email_not_configured" }, { status: 503 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  try {
    const emails = await readRecentEmails(config);
    return Response.json(await syncEmail(inboxDeps(), emails, config.user));
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "email_failed", detail: "Couldn't read the inbox. Check the email address and app password." },
      { status: 502 },
    );
  }
}

export const GET = check;
export const POST = check;
