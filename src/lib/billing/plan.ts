import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { billingConfigured, isPremium, type Plan } from "./stripe";

/** The signed-in user's plan. While payments are off, everyone has every feature. */
export async function currentPlan(): Promise<{ plan: Plan; locked: boolean; customerId: string | null }> {
  if (!billingConfigured()) return { plan: "premium", locked: false, customerId: null };
  const user = await currentUser();
  if (!user) return { plan: "free", locked: true, customerId: null };
  const supabase = await supabaseServer();
  const { data } = await supabase.from("subscriptions").select("status, stripe_customer_id").eq("user_id", user.id).maybeSingle();
  return { plan: isPremium(data?.status) ? "premium" : "free", locked: true, customerId: data?.stripe_customer_id ?? null };
}
