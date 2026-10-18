import { describe, expect, it } from "vitest";
import { fakeParseClient } from "@/lib/ai/test-helpers";
import type { Mail, Mailer } from "@/lib/customers/inbox";
import { INBOX, TICKETS } from "@/lib/customers/types";
import { createMemoryStore } from "@/lib/store/store";
import { emailConfig } from "./config";
import { customerText, sortEmail, type ParsedEmail } from "./sort";
import { syncEmail } from "./sync";

const email = (overrides: Partial<ParsedEmail>): ParsedEmail => ({
  messageId: "<1@x>",
  fromName: "",
  fromAddress: "someone@example.com",
  subject: "",
  text: "",
  date: "2026-10-18T09:00:00.000Z",
  ...overrides,
});

const buyer = email({
  messageId: "<buyer@amazon>",
  fromName: "Sam Jones - Amazon Marketplace",
  fromAddress: "abc123@marketplace.amazon.co.uk",
  subject: "Inquiry from Amazon customer (Order: 202-1234567-1234567)",
  text: "Is it dishwasher safe?\n\n------------------\nWas this email helpful?",
});

describe("emailConfig", () => {
  it("fills in Gmail's servers from the address alone", () => {
    expect(emailConfig({ EMAIL_USER: "me@gmail.com", EMAIL_PASSWORD: "abcd efgh ijkl mnop" })).toEqual({
      user: "me@gmail.com",
      password: "abcdefghijklmnop",
      imapHost: "imap.gmail.com",
      imapPort: 993,
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
    });
  });

  it("needs servers for other providers, and both address and password", () => {
    expect(emailConfig({ EMAIL_USER: "me@myshop.co.uk", EMAIL_PASSWORD: "x" })).toBeNull();
    expect(
      emailConfig({ EMAIL_USER: "me@myshop.co.uk", EMAIL_PASSWORD: "x", EMAIL_IMAP_HOST: "imap.myshop.co.uk", EMAIL_SMTP_HOST: "smtp.myshop.co.uk", EMAIL_SMTP_PORT: "587" }),
    ).toMatchObject({ smtpPort: 587 });
    expect(emailConfig({ EMAIL_USER: "me@gmail.com" })).toBeNull();
  });
});

describe("sortEmail", () => {
  it("recognises Amazon buyer messages and cleans the name and order number", () => {
    expect(sortEmail(buyer, "me@gmail.com")).toEqual({ kind: "customer_message", name: "Sam Jones", orderId: "202-1234567-1234567" });
  });

  it("recognises Amazon notices, suppliers, your own emails and everything else", () => {
    expect(sortEmail(email({ fromAddress: "seller-notification@amazon.co.uk" }), "me@gmail.com").kind).toBe("amazon_notice");
    expect(sortEmail(email({ fromAddress: "sales@shenzhen-goods.alibaba.com" }), "me@gmail.com").kind).toBe("supplier");
    expect(sortEmail(email({ subject: "Quotation for 500 garlic presses" }), "me@gmail.com").kind).toBe("supplier");
    expect(sortEmail(email({ fromAddress: "Me@Gmail.com" }), "me@gmail.com").kind).toBe("own");
    expect(sortEmail(email({ fromName: "Newsletter" }), "me@gmail.com")).toEqual({ kind: "other", name: "Newsletter" });
  });

  it("keeps only what the customer wrote", () => {
    expect(customerText(buyer.text)).toBe("Is it dishwasher safe?");
  });
});

describe("syncEmail", () => {
  const setup = (...outputs: object[]) => {
    const store = createMemoryStore();
    const sent: Mail[] = [];
    const mailer: Mailer = { send: async (m) => void sent.push(m) };
    const { client } = fakeParseClient(...outputs);
    return { store, sent, deps: { store, client, mailer, ownerEmail: "owner@example.com", shopName: "Kitchen Corner" } };
  };
  const safe = { category: "how_to_use", summary: "Asks about the dishwasher.", reply: "Yes, it's dishwasher safe.", confident: true };
  const refund = { category: "refund_or_return", summary: "Wants a refund.", reply: "Sorry to hear that.", confident: true };

  it("answers customer emails through Amazon's relay, once each", async () => {
    const { store, sent, deps } = setup(safe);

    const first = await syncEmail(deps, [buyer], "me@gmail.com");
    const again = await syncEmail(deps, [buyer], "me@gmail.com");

    expect(first).toEqual({ checked: 1, newEmails: 1, customerMessages: 1, repliedAutomatically: 1, ticketsOpened: 0, supplierEmails: 0 });
    expect(again.newEmails).toBe(0);
    expect(sent).toEqual([
      { to: "abc123@marketplace.amazon.co.uk", subject: `Re: ${buyer.subject}`, text: safe.reply, inReplyTo: "<buyer@amazon>" },
    ]);
    const [message] = await store.list<{ text: string; orderId: string; from: string }>(INBOX);
    expect(message.data).toMatchObject({ text: "Is it dishwasher safe?", orderId: "202-1234567-1234567", from: "Sam Jones" });
  });

  it("opens tickets for problems, logs supplier emails and ignores the rest", async () => {
    const { store, deps } = setup(refund);
    const emails = [
      email({ ...buyer, messageId: "<refund@amazon>", text: "It arrived broken, refund please" }),
      email({ messageId: "<s@x>", fromAddress: "sales@goods.alibaba.com", fromName: "Goods Co", subject: "Quotation" }),
      email({ messageId: "<n@x>", fromAddress: "no-reply@amazon.co.uk" }),
      email({ messageId: "<o@x>", fromAddress: "me@gmail.com" }),
    ];

    const r = await syncEmail(deps, emails, "me@gmail.com");

    expect(r).toEqual({ checked: 4, newEmails: 4, customerMessages: 1, repliedAutomatically: 0, ticketsOpened: 1, supplierEmails: 1 });
    expect(await store.list(TICKETS)).toHaveLength(1);
  });
});
