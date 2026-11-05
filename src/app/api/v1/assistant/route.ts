import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/assistant/agent";

const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) })).min(1).max(20) });

// Basic cost protection per server process. Plan limits replace this when accounts are on.
const hits = new Map<string, { count: number; start: number }>();
const LIMIT = 30;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > 3_600_000) hits.set(ip, { count: 1, start: now });
  else if (++entry.count > LIMIT) return NextResponse.json({ error: "Too many questions this hour. Try again later." }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a question of up to 2,000 characters." }, { status: 400 });
  return NextResponse.json(await answer(parsed.data.messages));
}
