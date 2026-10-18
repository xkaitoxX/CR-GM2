import Anthropic from "@anthropic-ai/sdk";
import { SHOP_NAME } from "@/lib/ai/helpers/customers";
import type { InboxDeps } from "@/lib/customers/inbox";
import { getMailer } from "@/lib/email/mailer";
import { getStore } from "@/lib/store/store";

/** Everything the inbox needs, from the website's settings. */
export function inboxDeps(): InboxDeps {
  return {
    store: getStore(),
    client: new Anthropic(),
    mailer: getMailer(SHOP_NAME),
    ownerEmail: process.env.OWNER_EMAIL || undefined,
    appUrl: process.env.APP_URL || undefined,
    shopName: SHOP_NAME,
  };
}
