"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

const schema = z.object({ currency: z.enum(["EUR", "CHF", "GBP", "USD"]), preferred_market: z.enum(["europe"]) });

export async function savePreferences(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const values = schema.parse(Object.fromEntries(form));
  const supabase = await supabaseServer();
  const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, ...values, updated_at: new Date().toISOString() });
  if (error) throw new Error("Preferences could not be saved.");
  redirect("/profile?saved=1");
}
