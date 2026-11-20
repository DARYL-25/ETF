import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { decodeShared } from "@/lib/portfolio/share";
import { getEtfs } from "@/lib/etfs/queries";
import { lookThrough } from "@/lib/etfs/holdings";
import { readXRay } from "@/lib/etfs/xray";
import { PageTitle, EtfName, Fee } from "@/components/etf-bits";
import { Mosaic } from "@/components/mosaic";
import { CopyShared } from "@/components/copy-shared";

export const metadata: Metadata = { title: "Shared portfolio", robots: { index: false } };
export const dynamic = "force-dynamic";

/** A portfolio someone shared as a link: each fund's share, what it holds underneath and its blended fee. No amounts exist in the link. */
export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const t = await getT();
  const shared = decodeShared((await searchParams).c);
  if (!shared) return <div><PageTitle title={t("Shared portfolio")}>{t("This link is not a valid shared portfolio. Ask the person who sent it for a new one.")}</PageTitle><Link className="btn btn-primary" href="/portfolio">{t("Build your own portfolio")}</Link></div>;
  const rows = await getEtfs(shared.weights.map(([k]) => k));
  const total = shared.weights.reduce((s, [, w]) => s + w, 0);
  const funds = shared.weights.map(([k, w]) => ({ key: k, weight_pct: (w / total) * 100, row: rows.find((r) => r.etf_key?.toUpperCase() === k.toUpperCase()) ?? null })).sort((a, b) => b.weight_pct - a.weight_pct);
  const look = await lookThrough(Object.fromEntries(funds.filter((f) => f.row).map((f) => [f.row!.etf_key!, f.weight_pct])));
  const xray = readXRay(look, funds.length);
  const feeKnown = funds.filter((f) => f.row?.headline_fee_pct !== null && f.row?.headline_fee_pct !== undefined);
  const knownShare = feeKnown.reduce((s, f) => s + f.weight_pct, 0);
  const fee = knownShare ? feeKnown.reduce((s, f) => s + f.weight_pct * f.row!.headline_fee_pct!, 0) / knownShare : null;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={shared.name}>{t("A portfolio shared as a link. It shows each fund's share only, not how much anyone invested.")}</PageTitle>
      {shared.note ? <blockquote className="max-w-[72ch] border-l-4 border-pine pl-4 whitespace-pre-wrap">{shared.note}</blockquote> : null}
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>{t("ETF")}</th><th className="num">{t("Share")}</th><th className="num">{t("Yearly fee")}</th></tr></thead>
          <tbody>{funds.map((f) => <tr key={f.key}><td className="min-w-[16rem]">{f.row ? <EtfName row={f.row} /> : <span className="text-muted">{f.key} ({t("not in our database")})</span>}</td><td className="num">{f.weight_pct.toFixed(1)}%</td><td className="num">{f.row ? <Fee row={f.row} /> : "—"}</td></tr>)}</tbody>
        </table>
      </div>
      <p>{t("Blended yearly fee")}: <strong className="data">{fee !== null ? `${fee.toFixed(2)}%` : "—"}</strong>{xray.insights.map((i) => <span key={i.text} className="block">{t(i.text, i.vars)}</span>)}</p>
      {look.covered_pct > 0 ? <div><h2 className="mb-2 text-[1.2rem]">{t("What it holds underneath")}</h2><Mosaic items={look.holdings.map((h) => ({ holding_key: h.holding_key, name: h.label, ticker: h.ticker, weight_pct: h.weight_pct }))} label={t("What it holds underneath")} restLabel={(pct) => t("Everything else, {pct}%", { pct })} /><p className="mt-1 text-[0.85rem] text-muted">{t("Seen through for {pct}% of the portfolio, from issuers' holdings files.", { pct: look.covered_pct.toFixed(0) })}</p></div> : null}
      <CopyShared name={shared.name} funds={funds.map((f) => ({ key: f.row?.etf_key ?? f.key, weight_pct: f.weight_pct, nav: f.row?.nav ?? null }))} />
      <p className="text-[0.85rem] text-muted">{t("Shared by a reader, not by ETF Intelligence. It is not a recommendation.")}</p>
    </div>
  );
}
