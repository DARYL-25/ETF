"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import type { PortfolioInsight as Insight } from "@/lib/etfs/portfolio";
import { Mosaic } from "./mosaic";
import { ExposurePanel } from "./exposure-panel";
import { normalise, providerViews } from "@/lib/geo/exposure";

export const ASSET: Record<string, string> = { equity: "Shares", fixed_income: "Bonds", money_market: "Money market", commodities: "Commodities" };
const eur = (v: number, lang = "en") => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function Bars({ title, rows }: { title: string; rows: { label: string; weight_pct: number }[] }) {
  if (rows.length < 2) return null;
  const top = Math.max(...rows.map((r) => r.weight_pct));
  return (
    <div>
      <h4 className="mb-1 font-semibold">{title}</h4>
      <ul>
        {rows.slice(0, 8).map((r) => (
          <li key={r.label} className="py-1">
            <div className="flex justify-between gap-3 text-[0.92rem]"><span className="truncate">{r.label}</span><span className="data">{r.weight_pct.toFixed(1)}%</span></div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-pine" style={{ width: `${(r.weight_pct / top) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What a portfolio adds up to underneath its ETFs. Computed on the server from the positions, never stored. */
export function PortfolioInsight({ positions }: { positions: { key: string; quantity: number }[] }) {
  const t = useT();
  const [data, setData] = useState<Insight | null>(null);
  const signature = JSON.stringify(positions);
  useEffect(() => {
    if (!positions.length) { setData(null); return; }
    const controller = new AbortController();
    fetch("/api/v1/portfolio/insight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ positions }), signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  if (!data || !data.weights.length) return null;
  const name = (key: string) => data.weights.find((w) => w.key === key)?.name ?? key;
  return (
    <div className="panel mt-3 p-4" aria-label={t("What this portfolio holds")}>
      <h3 className="text-[1.1rem]">{t("What this portfolio adds up to")}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        <div><dt className="text-[0.85rem] text-muted">{t("Value")}</dt><dd className="stat-value mt-0.5">{eur(data.total_eur, t.lang)}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">{t("Blended yearly fee")}</dt><dd className="stat-value mt-0.5">{data.fee_pct !== null ? `${data.fee_pct.toFixed(2)}%` : "—"}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">{t("Fees per year")}</dt><dd className="stat-value mt-0.5">{data.yearly_cost_eur !== null ? eur(data.yearly_cost_eur, t.lang) : "—"}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">{t("Seen through to holdings")}</dt><dd className="stat-value mt-0.5">{data.look.covered_pct.toFixed(0)}%</dd></div>
        {data.look.covered_pct > 0 ? <div><dt className="text-[0.85rem] text-muted">{t("Ten largest companies")}</dt><dd className="stat-value mt-0.5">{data.xray.top10_pct.toFixed(1)}%</dd></div> : null}
        {data.xray.us_pct !== null ? <div><dt className="text-[0.85rem] text-muted">{t("United States")}</dt><dd className="stat-value mt-0.5">{data.xray.us_pct.toFixed(0)}%</dd></div> : null}
        {data.xray.tech_pct !== null ? <div><dt className="text-[0.85rem] text-muted">{t("Technology sectors")}</dt><dd className="stat-value mt-0.5">{data.xray.tech_pct.toFixed(0)}%</dd></div> : null}
        {data.allocation.length ? <div><dt className="text-[0.85rem] text-muted">{t("Asset classes")}</dt><dd className="mt-0.5 text-[0.95rem]">{data.allocation.map((a) => `${t(ASSET[a.label] ?? "Not classified")} ${a.weight_pct.toFixed(0)}%`).join(" · ")}</dd></div> : null}
      </dl>
      {data.fee_known_pct < 99.5 && data.fee_pct !== null ? <p className="mt-2 text-[0.85rem] text-muted">{t("The fee covers the ")}{data.fee_known_pct.toFixed(0)}{t("% of the portfolio whose funds have a fee on file.")}</p> : null}
      {data.unvalued.length ? <p className="mt-2 text-[0.85rem] text-muted">{t("Left out, because no NAV is on file: ")}{data.unvalued.join(", ")}.</p> : null}
      {data.overlaps.length ? (
        <div className="mt-4 rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">
          <p className="font-semibold">{t("Funds that largely hold the same things")}</p>
          <ul className="mt-1 space-y-0.5">{data.overlaps.map((o) => <li key={o.a + o.b}>{name(o.a)}{t(" and ")}{name(o.b)}: {o.overlap_pct.toFixed(0)}{t("% overlap")}</li>)}</ul>
        </div>
      ) : null}
      {data.xray.insights.length ? (
        <ul className="mt-4 space-y-1.5" aria-label={t("What stands out")}>
          {data.xray.insights.map((i) => <li key={i.text} className="rounded-xl bg-sunken px-3.5 py-2">{t(i.text, i.vars)}</li>)}
        </ul>
      ) : null}
      {data.look.covered_pct > 0 ? (
        <div className="mt-5">
          <h4 className="mb-2 font-semibold">{t("Your portfolio as one basket")}</h4>
          <Mosaic items={data.look.holdings.map((h) => ({ holding_key: h.holding_key, name: h.label, ticker: h.ticker, weight_pct: h.weight_pct }))} label={t("Your portfolio as one basket")} restLabel={(pct) => t("Everything else, {pct}%", { pct })} />
        </div>
      ) : null}
      <div className="mt-6 rounded-2xl border border-line p-4">
        <ExposurePanel title={t("Where your money goes")} data={{
          countries: normalise(data.look.countries), sectors: normalise(data.look.sectors),
          currencies: data.xray.currencies.map((c) => ({ label: c.label, weight_pct: c.weight_pct })),
          ...providerViews(data.funds.map((f) => ({ name: f.name, domicile: f.domicile, weight_pct: f.weight_pct }))),
          note: data.look.covered_pct > 0 ? t("Countries, sectors and currencies cover the {pct}% of the portfolio whose holdings are on file, rescaled to 100%. Providers and domiciles cover every fund.", { pct: data.look.covered_pct.toFixed(0) }) : t("None of these funds has a holdings file on record yet, so countries and sectors are not shown. Providers and domiciles cover every fund."),
        }} />
      </div>
      {data.look.covered_pct > 0 ? <div className="mt-5 max-w-xl"><Bars title={t("Largest holdings")} rows={data.look.holdings.map((h) => ({ label: h.label, weight_pct: h.weight_pct }))} /></div> : null}
      <p className="mt-3 text-[0.82rem] text-muted">{t("Values use each fund's latest NAV, converted to euro at European Central Bank rates. Holdings come from issuers' files, and percentages are of the whole portfolio.")}</p>
    </div>
  );
}
