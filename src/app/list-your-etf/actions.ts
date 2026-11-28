"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { authConfigured, supabaseServer } from "@/lib/supabase/server";

const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);

const request = z.object({
  company: z.string().trim().min(2).max(200),
  contact_name: z.string().trim().min(2).max(200),
  email: z.email().max(254),
  website: optional(500),
  funds: optional(4000),
  message: optional(4000),
});

const back = (lang: string, params: string): never => redirect(`${lang === "fr" ? "/fr" : ""}/list-your-etf?${params}`);

/** Saves an issuer's request in listing_requests. The table accepts inserts only, so nothing can be read back. */
export async function sendListingRequest(form: FormData) {
  const { lang } = await getT();
  // A hidden field people never see. Bots fill it in; they are thanked and nothing is stored.
  if (String(form.get("fax") ?? "").trim()) back(lang, "sent=1");
  const parsed = request.safeParse(Object.fromEntries(form));
  if (!parsed.success) back(lang, "error=fields");
  if (!authConfigured()) back(lang, "error=offline");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("listing_requests").insert({ ...parsed.data!, lang: lang === "fr" ? "fr" : "en" });
  if (error) back(lang, "error=save");
  back(lang, "sent=1");
}
