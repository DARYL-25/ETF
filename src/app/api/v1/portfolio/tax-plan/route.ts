import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { aiChat, aiConfig } from "@/lib/ai/provider";
import { pickLang } from "@/lib/i18n";

const body = z.object({
  account: z.string().max(80).nullable(),
  country: z.string().max(40).nullable(),
  points: z.array(z.string().max(600)).max(40),
  funds: z.array(z.object({ name: z.string().max(200), held_years: z.number().nullable(), gain: z.number().nullable(), currency: z.string().max(5).nullable() })).max(60),
});

const SYSTEM = `You write a short tax-aware plan for a private ETF investor, from facts computed by the website.
Rules: use only the FACTS and FUNDS given; never invent a rate, date or amount; keep every number exactly as given.
Never tell the reader to buy or sell. Say what each choice would change ("if you keep X until DATE, ...").
Write 3 to 6 short bullet points, most time-sensitive first, then one line saying this is general information and a tax adviser can confirm it.
Plain words, no jargon, no headings, no markdown other than "- " bullets.`;

/** An open-weight model rewrites the computed tax points into a short plan. Without a model, the points stand on their own. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send the computed points." }, { status: 400 });
  const config = aiConfig();
  if (!config || !parsed.data.points.length) return NextResponse.json({ text: null, model: null });
  const lang = pickLang(request.cookies.get("lang")?.value, request.headers.get("accept-language"));
  const reply = await aiChat({
    system: SYSTEM + (lang === "fr" ? "\nAnswer in French." : "\nAnswer in English."), config, maxTokens: 600,
    turns: [{ role: "user", text: `ACCOUNT: ${parsed.data.account ?? "not set"}\nCOUNTRY: ${parsed.data.country ?? "not set"}\nFACTS:\n${parsed.data.points.map((p) => `- ${p}`).join("\n")}\nFUNDS: ${JSON.stringify(parsed.data.funds)}` }],
  });
  if (!reply.ok || !reply.text) return NextResponse.json({ text: null, model: null });
  return NextResponse.json({ text: reply.text, model: config.model });
}
