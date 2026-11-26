import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, supabaseServer } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/settings";

async function signedIn() {
  if (!authConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

const noStore = { "Cache-Control": "no-store" };

/** A signed-in reader's settings: language, country and default list view. Anyone else keeps them in cookies only. */
export async function GET() {
  const session = await signedIn();
  if (!session) return NextResponse.json({ signed_in: false }, { headers: noStore });
  const { data, error } = await session.supabase.from("user_state").select("value, updated_at").eq("kind", "settings").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not read your settings." }, { status: 500, headers: noStore });
  const parsed = settingsSchema.safeParse(data?.value);
  return NextResponse.json({ signed_in: true, value: parsed.success ? parsed.data : null, updated_at: data?.updated_at ?? null }, { headers: noStore });
}

export async function PUT(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 2_000) return NextResponse.json({ error: "Too large to save." }, { status: 413 });
  let json: unknown = null;
  try { json = JSON.parse(raw); } catch { /* Rejected below. */ }
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Send a language, a country or a list view." }, { status: 400 });
  const session = await signedIn();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { error } = await session.supabase.from("user_state").upsert({ user_id: session.user.id, kind: "settings", value: parsed.data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save your settings." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
