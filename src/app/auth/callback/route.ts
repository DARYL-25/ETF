import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, supabaseServer } from "@/lib/supabase/server";

/** Finishes email confirmation and Google sign-in. */
export async function GET(request: NextRequest) {
  const url = new URL("/profile", request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (code && authConfigured()) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(url);
  }
  url.pathname = "/login";
  url.searchParams.set("message", "That sign-in link did not work. Request a new one.");
  return NextResponse.redirect(url);
}
