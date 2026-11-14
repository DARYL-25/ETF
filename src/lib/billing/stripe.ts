import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe through its HTTP API, with no SDK. Payments stay off until the keys are set:
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY and
 * SUPABASE_SERVICE_ROLE_KEY. While they are off, nothing on the site is locked.
 */
export const billingConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_MONTHLY && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);

export const PLANS = {
  free: { name: "Free", compare: 2 },
  premium: { name: "Premium", compare: 5 },
} as const;
export type Plan = keyof typeof PLANS;

/** Nested objects in the bracket form Stripe expects, e.g. line_items[0][price]. */
export function formEncode(value: unknown, prefix = "", out = new URLSearchParams()): URLSearchParams {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) value.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  else if (typeof value === "object") for (const [k, v] of Object.entries(value)) formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
  else out.set(prefix, String(value));
  return out;
}

async function stripe<T>(path: string, body: unknown, fetchFn: typeof fetch = fetch): Promise<T> {
  const res = await fetchFn(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: formEncode(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe answered ${res.status}`);
  return json as T;
}

export function createCheckout(input: { userId: string; email: string | undefined; yearly: boolean; site: string }, fetchFn: typeof fetch = fetch) {
  const price = input.yearly && process.env.STRIPE_PRICE_YEARLY ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
  return stripe<{ url: string }>("checkout/sessions", {
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${input.site}/profile?subscribed=1`,
    cancel_url: `${input.site}/pricing`,
    client_reference_id: input.userId,
    customer_email: input.email,
    allow_promotion_codes: true,
    subscription_data: { metadata: { user_id: input.userId } },
  }, fetchFn);
}

export const createPortal = (customerId: string, site: string, fetchFn: typeof fetch = fetch) =>
  stripe<{ url: string }>("billing_portal/sessions", { customer: customerId, return_url: `${site}/profile` }, fetchFn);

/** Checks the Stripe-Signature header: HMAC-SHA256 of "timestamp.body", within five minutes. */
export function verifySignature(body: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const given = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !given.length || Math.abs(nowSeconds - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"));
  return given.some((sig) => { const b = Buffer.from(sig); return b.length === expected.length && timingSafeEqual(b, expected); });
}

export type SubscriptionRow = { user_id: string; stripe_customer_id: string; stripe_subscription_id: string | null; status: string; current_period_end: string | null };

type StripeEvent = { type: string; data: { object: Record<string, unknown> } };

/** Turns a webhook event into the row to store, or null when the event does not concern us. */
export function subscriptionFromEvent(event: StripeEvent): Partial<SubscriptionRow> & { match: "user" | "subscription" } | null {
  const o = event.data.object;
  if (event.type === "checkout.session.completed" && o.client_reference_id && o.customer) {
    return { match: "user", user_id: String(o.client_reference_id), stripe_customer_id: String(o.customer), stripe_subscription_id: o.subscription ? String(o.subscription) : null, status: "active" };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const items = (o.items as { data?: { current_period_end?: number }[] } | undefined)?.data ?? [];
    const end = (o.current_period_end as number | undefined) ?? items[0]?.current_period_end;
    const meta = (o.metadata as { user_id?: string } | undefined)?.user_id;
    return { match: "subscription", user_id: meta, stripe_customer_id: String(o.customer), stripe_subscription_id: String(o.id), status: event.type.endsWith("deleted") ? "canceled" : String(o.status), current_period_end: end ? new Date(end * 1000).toISOString() : null };
  }
  return null;
}

export const isPremium = (status: string | null | undefined) => status === "active" || status === "trialing";
