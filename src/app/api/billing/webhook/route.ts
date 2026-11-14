import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { billingConfigured, subscriptionFromEvent, verifySignature } from "@/lib/billing/stripe";

/** Stripe calls this when a subscription starts, changes or ends. Only a signed call is accepted. */
export async function POST(request: NextRequest) {
  if (!billingConfigured()) return NextResponse.json({ error: "Payments are not switched on." }, { status: 503 });
  const body = await request.text();
  if (!verifySignature(body, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }
  const change = subscriptionFromEvent(JSON.parse(body));
  if (!change) return NextResponse.json({ received: true });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { match, ...row } = change;
  const stamped = { ...row, updated_at: new Date().toISOString() };
  const result = match === "user" || row.user_id
    ? await admin.from("subscriptions").upsert(stamped, { onConflict: "user_id" })
    : await admin.from("subscriptions").update(stamped).eq("stripe_subscription_id", row.stripe_subscription_id!);
  if (result.error) return NextResponse.json({ error: "Could not store the subscription." }, { status: 500 });
  return NextResponse.json({ received: true });
}
