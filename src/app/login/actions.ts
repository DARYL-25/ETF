"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { authConfigured, supabaseServer } from "@/lib/supabase/server";

const credentials = z.object({ email: z.email(), password: z.string().min(8).max(200) });

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

const back = (message: string): never => redirect(`/login?message=${encodeURIComponent(message)}`);

export async function signIn(form: FormData) {
  if (!authConfigured()) back("Sign-in is not set up yet.");
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) back("Enter a valid email and a password of at least 8 characters.");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data!);
  if (error) back("That email and password do not match.");
  redirect("/profile");
}

export async function signUp(form: FormData) {
  if (!authConfigured()) back("Sign-in is not set up yet.");
  const parsed = credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) back("Enter a valid email and a password of at least 8 characters.");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    ...parsed.data!,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (error) back("The account could not be created. Check the email address and try again.");
  back("Check your email for a link to confirm your account.");
}

export async function signInWithGoogle() {
  if (!authConfigured()) back("Sign-in is not set up yet.");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (error || !data.url) back("Google sign-in is not available right now. Use your email instead.");
  redirect(data.url!);
}

export async function signOut() {
  if (authConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
