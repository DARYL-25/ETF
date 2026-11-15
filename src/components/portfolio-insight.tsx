"use client";

import { useEffect, useState } from "react";
import type { PortfolioInsight as Insight } from "@/lib/etfs/portfolio";

const eur = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

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
  const [data, setData] = useState<Insight | null>(null);
  const signature = JSON.stringify(positions);
  useEffect(() => {
    if (!positions.length) { setData(null); return; }
    const controller = new AbortController();
    fetch("/api/v1/portfolio/insight", { method: "POST", headers: { "content-type": "application/json" }, body: signature, signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  if (!data || !data.weights.length) return null;
  const name = (key: string) => data.weights.find((w) => w.key === key)?.name ?? key;
  return (
    <div className="panel mt-3 p-4" aria-label="What this portfolio holds">
      <h3 className="text-[1.1rem]">What this portfolio adds up to</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        <div><dt className="text-[0.85rem] text-muted">Value</dt><dd className="stat-value mt-0.5">{eur(data.total_eur)}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">Blended yearly fee</dt><dd className="stat-value mt-0.5">{data.fee_pct !== null ? `${data.fee_pct.toFixed(2)}%` : "—"}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">Fees per year</dt><dd className="stat-value mt-0.5">{data.yearly_cost_eur !== null ? eur(data.yearly_cost_eur) : "—"}</dd></div>
        <div><dt className="text-[0.85rem] text-muted">Seen through to holdings</dt><dd className="stat-value mt-0.5">{data.look.covered_pct.toFixed(0)}%</dd></div>
      </dl>
      {data.fee_known_pct < 99.5 && data.fee_pct !== null ? <p className="mt-2 text-[0.85rem] text-muted">The fee covers the {data.fee_known_pct.toFixed(0)}% of the portfolio whose funds have a fee on file.</p> : null}
      {data.unvalued.length ? <p className="mt-2 text-[0.85rem] text-muted">Left out, because no NAV is on file: {data.unvalued.join(", ")}.</p> : null}
      {data.overlaps.length ? (
        <div className="mt-4 rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">
          <p className="font-semibold">Funds that largely hold the same things</p>
          <ul className="mt-1 space-y-0.5">{data.overlaps.map((o) => <li key={o.a + o.b}>{name(o.a)} and {name(o.b)}: {o.overlap_pct.toFixed(0)}% overlap</li>)}</ul>
        </div>
      ) : null}
      {data.look.covered_pct > 0 ? (
        <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-3">
          <Bars title="Largest holdings" rows={data.look.holdings.map((h) => ({ label: h.label, weight_pct: h.weight_pct }))} />
          <Bars title="Sectors" rows={data.look.sectors} />
          <Bars title="Countries" rows={data.look.countries} />
        </div>
      ) : <p className="mt-4 text-muted">None of these funds has a holdings file on record yet, so we cannot look inside them.</p>}
      <p className="mt-3 text-[0.82rem] text-muted">Values use each fund&apos;s latest NAV, converted to euro at European Central Bank rates. Holdings come from issuers&apos; files, and percentages are of the whole portfolio.</p>
    </div>
  );
}
