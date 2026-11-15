import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authConfigured, supabaseServer } from "@/lib/supabase/server";

const kinds = z.enum(["watchlists", "portfolios"]);
const body = z.object({ kind: kinds, value: z.array(z.record(z.string(), z.unknown())).max(50) });

async function signedIn() {
  if (!authConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

/** A signed-in reader's saved lists. Anyone else is told they are not signed in, and the page keeps lists on the device. */
export async function GET(request: NextRequest) {
  const kind = kinds.safeParse(request.nextUrl.searchParams.get("kind"));
  if (!kind.success) return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
  const session = await signedIn();
  if (!session) return NextResponse.json({ signed_in: false }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await session.supabase.from("user_state").select("value, updated_at").eq("kind", kind.data).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not read your lists." }, { status: 500 });
  return NextResponse.json({ signed_in: true, value: data?.value ?? null, updated_at: data?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 180_000) return NextResponse.json({ error: "Too large to save." }, { status: 413 });
  let json: unknown = null;
  try { json = JSON.parse(raw); } catch { /* Rejected below. */ }
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Send a kind and a list." }, { status: 400 });
  const session = await signedIn();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { error } = await session.supabase.from("user_state").upsert({ user_id: session.user.id, kind: parsed.data.kind, value: parsed.data.value, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save your lists." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
