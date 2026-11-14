import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db/client";
import type { EtfRow } from "@/lib/etfs/queries";
import { buildScreenerWhere, parseScreenerParams } from "@/lib/etfs/screener-params";
import { currentPlan } from "@/lib/billing/plan";

const COLUMNS: [string, (r: EtfRow) => unknown][] = [
  ["name", (r) => r.name], ["isin", (r) => r.isin], ["ticker", (r) => r.ticker], ["issuer", (r) => r.issuer_name], ["index", (r) => r.index_name],
  ["yearly_fee_pct", (r) => r.headline_fee_pct], ["fee_type", (r) => r.headline_fee_type], ["size", (r) => r.fund_aum ?? r.class_aum], ["size_currency", (r) => r.fund_aum_currency ?? r.class_aum_currency],
  ["size_level", (r) => (r.fund_aum !== null || r.class_aum !== null ? r.aum_level ?? "fund" : null)], ["size_date", (r) => r.fund_aum_as_of ?? r.class_aum_as_of],
  ["nav_return_1y_pct", (r) => r.nav_return_1y], ["nav_return_3y_pct", (r) => r.nav_return_3y], ["nav_return_5y_pct", (r) => r.nav_return_5y], ["return_currency", (r) => (r.nav_return_1y !== null ? r.nav_currency ?? r.currency : null)], ["returns_date", (r) => r.nav_return_as_of],
  ["income", (r) => r.distribution_policy], ["replication", (r) => r.replication], ["domicile", (r) => r.domicile], ["ucits", (r) => r.ucits], ["currency", (r) => r.currency], ["source", (r) => r.source_url],
];
// A leading =, +, - or @ would run as a formula in a spreadsheet, so such text gets a quote in front.
const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const text = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The current screener search as a CSV file, up to 5,000 rows. A Premium feature once payments are on. */
export async function GET(request: NextRequest) {
  const { plan, locked } = await currentPlan();
  if (locked && plan !== "premium") return NextResponse.redirect(new URL("/pricing", request.nextUrl), 303);
  const { where, values } = buildScreenerWhere(parseScreenerParams(Object.fromEntries(request.nextUrl.searchParams)));
  const rows = await query<EtfRow>(`select * from public.etf_directory ${where} order by size_eur desc nulls last, name asc limit 5000`, values);
  const csv = [COLUMNS.map(([h]) => h).join(","), ...rows.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="etf-intelligence-export.csv"' } });
}
