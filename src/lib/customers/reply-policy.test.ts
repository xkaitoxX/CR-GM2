import { describe, expect, it } from "vitest";
import { decideReply, holdingReply, priorityFor, type Draft } from "./reply-policy";

const safe: Draft = { category: "where_is_order", reply: "Hi Sam, your order is on its way and should arrive tomorrow.", confident: true };

describe("decideReply", () => {
  it("sends simple, confident, rule-following replies by itself", () => {
    expect(decideReply(safe, "Hi, where is my order?", "customer_message", true)).toEqual({
      autoSend: true,
      reason: "A simple message, answered from your facts.",
      priority: "normal",
    });
    expect(
      decideReply({ category: "positive_feedback", reply: "Thank you so much!", confident: true }, "Great seller, fast delivery", "feedback", true)
        .autoSend,
    ).toBe(true);
  });

  it("holds everything when auto-replies are off", () => {
    expect(decideReply(safe, "Where is my order?", "customer_message", false)).toMatchObject({
      autoSend: false,
      reason: "Auto-replies are switched off.",
    });
  });

  it("holds categories that need the owner", () => {
    for (const category of ["refund_or_return", "damaged_or_missing", "complaint", "safety", "negative_feedback", "other"] as const) {
      expect(decideReply({ ...safe, category }, "Hello", "customer_message", true).autoSend).toBe(false);
    }
  });

  it("holds when the customer mentions risky things, even if the AI called it safe", () => {
    for (const text of [
      "Where is my order? I want a refund",
      "It arrived damaged",
      "One part is missing",
      "It never arrived",
      "I'll open an A-to-z claim",
      "My son got hurt",
      "This is a fake product",
      "I want to return it",
    ]) {
      expect(decideReply(safe, text, "customer_message", true).autoSend, text).toBe(false);
    }
  });

  it("holds when the AI isn't sure or the reply breaks Amazon's rules", () => {
    expect(decideReply({ ...safe, confident: false }, "Question", "customer_message", true).autoSend).toBe(false);
    expect(decideReply({ ...safe, reply: "See https://example.com" }, "Question", "customer_message", true).autoSend).toBe(false);
    expect(decideReply({ ...safe, reply: "Please leave us a 5-star review!" }, "Question", "customer_message", true).autoSend).toBe(false);
    expect(decideReply({ ...safe, reply: "We'll give you a discount." }, "Question", "customer_message", true).autoSend).toBe(false);
    expect(decideReply({ ...safe, reply: "  " }, "Question", "customer_message", true).autoSend).toBe(false);
  });

  it("doesn't mistake ordinary words for risky ones", () => {
    expect(decideReply(safe, "Can I use it on the return trip? Is it fireproof?", "customer_message", true).autoSend).toBe(false);
    expect(decideReply(safe, "Is it dishwasher safe? Thanks!", "customer_message", true).autoSend).toBe(true);
  });
});

describe("priorityFor", () => {
  it("marks safety and legal issues urgent, refunds and complaints high", () => {
    expect(priorityFor("other", "It caught fire")).toBe("urgent");
    expect(priorityFor("safety", "Hello")).toBe("urgent");
    expect(priorityFor("complaint", "Not happy")).toBe("high");
    expect(priorityFor("product_question", "It's broken")).toBe("high");
    expect(priorityFor("product_question", "What size is it?")).toBe("normal");
  });
});

describe("holdingReply", () => {
  it("greets by first name and promises a reply within 24 hours", () => {
    expect(holdingReply("Sam Jones", "Kitchen Corner")).toBe(
      "Hi Sam,\n\nThank you for your message. We're looking into this and will get back to you within 24 hours.\n\nKind regards,\nKitchen Corner",
    );
    expect(holdingReply("abc123@marketplace.amazon.co.uk", "Kitchen Corner")).toMatch(/^Hello,/);
  });
});
