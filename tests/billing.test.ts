import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { formEncode, isPremium, subscriptionFromEvent, verifySignature } from "@/lib/billing/stripe";

describe("Stripe helpers", () => {
  it("encodes nested values the way Stripe expects", () => {
    const text = decodeURIComponent(formEncode({ mode: "subscription", line_items: [{ price: "p_1", quantity: 1 }], subscription_data: { metadata: { user_id: "u" } } }).toString());
    expect(text).toBe("mode=subscription&line_items[0][price]=p_1&line_items[0][quantity]=1&subscription_data[metadata][user_id]=u");
  });

  it("accepts only a correctly signed, recent webhook", () => {
    const body = JSON.stringify({ type: "x" });
    const now = 1_800_000_000;
    const sign = (t: number, secret = "whsec_test") => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
    expect(verifySignature(body, sign(now), "whsec_test", now)).toBe(true);
    expect(verifySignature(body + " ", sign(now), "whsec_test", now)).toBe(false);
    expect(verifySignature(body, sign(now, "other"), "whsec_test", now)).toBe(false);
    expect(verifySignature(body, sign(now - 3600), "whsec_test", now)).toBe(false);
    expect(verifySignature(body, null, "whsec_test", now)).toBe(false);
    expect(verifySignature(body, "t=abc,v1=", "whsec_test", now)).toBe(false);
  });

  it("maps a completed checkout and a cancellation to subscription rows", () => {
    const start = subscriptionFromEvent({ type: "checkout.session.completed", data: { object: { client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1" } } });
    expect(start).toMatchObject({ match: "user", user_id: "user-1", stripe_customer_id: "cus_1", status: "active" });
    const end = subscriptionFromEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_1", status: "canceled", items: { data: [{ current_period_end: 1_800_000_000 }] } } } });
    expect(end).toMatchObject({ match: "subscription", status: "canceled", stripe_subscription_id: "sub_1" });
    expect(end!.current_period_end).toBe(new Date(1_800_000_000_000).toISOString());
    expect(subscriptionFromEvent({ type: "invoice.paid", data: { object: {} } })).toBeNull();
  });

  it("treats only active and trialing as premium", () => {
    expect([isPremium("active"), isPremium("trialing"), isPremium("past_due"), isPremium("canceled"), isPremium(null)]).toEqual([true, true, false, false, false]);
  });
});
