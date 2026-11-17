import { OG_SIZE, ogCard } from "@/lib/og/card";
import { getEtf } from "@/lib/etfs/queries";
import { formatMoney } from "@/lib/format";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ETF facts";

export default async function Image({ params }: { params: Promise<{ isin: string }> }) {
  const row = await getEtf((await params).isin);
  if (!row) return ogCard({ title: "ETF Intelligence" });
  const facts: [string, string][] = [];
  if (row.headline_fee_pct !== null) facts.push(["Yearly fee", `${row.headline_fee_pct.toFixed(2)}%`]);
  const size = row.fund_aum ?? row.class_aum;
  if (size !== null) facts.push(["Fund size", formatMoney(size, row.fund_aum_currency ?? row.class_aum_currency)]);
  if (row.index_name) facts.push(["Index", row.index_name.length > 22 ? `${row.index_name.slice(0, 21)}…` : row.index_name]);
  return ogCard({ eyebrow: [row.ticker, row.isin].filter(Boolean).join("  "), title: row.name, line: row.issuer_name && row.issuer_name !== "Not identified" ? row.issuer_name : undefined, facts });
}
