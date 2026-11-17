"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HORIZONS, trueCost, type CostInput } from "@/lib/tools/true-cost";
import { CostChart } from "./cost-chart";

type Fund = { key: string; name: string; fee: number; tracking: number; spread: number; currency: string | null; measured: number | null; gapAsOf: string | null };
type Facts = { key: string; name: string; fee_pct: number | null; currency: string | null; tracking_beyond_fee_pct: number | null; gap_as_of: string | null };

export function EtfSearch({ onPick, placeholder }: { onPick: (key: string, name: string) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ etf_key: string; name: string; ticker: string | null }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const timer = setTimeout(() => fetch(`/api/v1/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((b) => setHits(b.results ?? [])).catch(() => undefined), 150);
    return () => clearTimeout(timer);
  }, [q]);
  return (
    <div className="relative">
      <input aria-label={placeholder} placeholder={placeholder} className="field" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {hits.map((h) => <li key={h.etf_key}><button type="button" className="w-full cursor-pointer px-3 py-2 text-left hover:bg-sunken" onClick={() => { onPick(h.etf_key, h.name); setQ(""); setHits([]); }}>{h.name}{h.ticker ? <span className="ml-1 text-muted">{h.ticker}</span> : null}</button></li>)}
        </ul>
      ) : null}
    </div>
  );
}

async function loadFund(key: string): Promise<Fund | null> {
  try {
    const r = await fetch(`/api/v1/etfs/${encodeURIComponent(key)}/facts`);
    if (!r.ok) return null;
    const f = (await r.json()) as Facts;
    return { key: f.key, name: f.name, fee: f.fee_pct ?? 0.2, tracking: f.tracking_beyond_fee_pct !== null ? Number(f.tracking_beyond_fee_pct.toFixed(2)) : 0, spread: 0.1, currency: f.currency, measured: f.tracking_beyond_fee_pct, gapAsOf: f.gap_as_of };
  } catch { return null; }
}

const COLORS = ["var(--pine)", "var(--saffron)", "var(--ink)"];

/** True ETF cost: fee, tracking, spread, broker and currency conversion over 5 to 30 years, for up to three ETFs. */
export function TrueCostCalculator() {
  const t = useT();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [common, setCommon] = useState({ initial: 10000, monthly: 300, grossPct: 6, orderFee: 1, orderPct: 0, fxPct: 0, sellAtEnd: true, account: "EUR" });
  const [horizon, setHorizon] = useState<number>(20);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const keys = ["a", "b", "c"].map((k) => p.get(k)).filter((k): k is string => Boolean(k));
    if (keys.length) Promise.all(keys.map(loadFund)).then((fs) => setFunds(fs.filter((f): f is Fund => f !== null)));
  }, []);
  const add = async (key: string) => { if (funds.length >= 3 || funds.some((f) => f.key === key)) return; const f = await loadFund(key); if (f) setFunds([...funds, f]); };
  const set = (i: number, change: Partial<Fund>) => setFunds(funds.map((f, j) => (j === i ? { ...f, ...change } : f)));
  const money = (v: number) => new Intl.NumberFormat(t.lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: common.account, maximumFractionDigits: 0 }).format(v);
  const input = (f: Fund, years: number): CostInput => ({ initial: common.initial, monthly: common.monthly, years, grossPct: common.grossPct, feePct: f.fee, trackingPct: f.tracking, spreadPct: f.spread, orderFee: common.orderFee, orderPct: common.orderPct, fxPct: f.currency && f.currency !== common.account ? common.fxPct : 0, sellAtEnd: common.sellAtEnd });
  const results = funds.map((f) => ({ f, at: HORIZONS.map((y) => trueCost(input(f, y))), chosen: trueCost(input(f, horizon)) }));
  const best = results.length > 1 ? [...results].sort((a, b) => b.chosen.final - a.chosen.final)[0] : null;
  const lowestFee = results.length > 1 ? [...results].sort((a, b) => a.f.fee - b.f.fee)[0] : null;
  const num = "field mt-1 font-normal";

  return (
    <div className="flex flex-col gap-6">
      <section className="panel p-4">
        <h2 className="text-[1.1rem]">{t("Your plan")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-[0.85rem] text-muted">{t("Starting amount")}<input className={num} type="number" min={0} step={1000} value={common.initial} onChange={(e) => setCommon({ ...common, initial: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Each month")}<input className={num} type="number" min={0} step={50} value={common.monthly} onChange={(e) => setCommon({ ...common, monthly: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Index return a year, %")}<input className={num} type="number" step={0.5} min={-20} max={30} value={common.grossPct} onChange={(e) => setCommon({ ...common, grossPct: Number(e.target.value) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Account currency")}<select className={num} value={common.account} onChange={(e) => setCommon({ ...common, account: e.target.value })}>{["EUR", "CHF", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-[0.85rem] text-muted">{t("Broker fee per order")}<input className={num} type="number" min={0} step={0.5} value={common.orderFee} onChange={(e) => setCommon({ ...common, orderFee: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Broker fee, % of order")}<input className={num} type="number" min={0} step={0.05} value={common.orderPct} onChange={(e) => setCommon({ ...common, orderPct: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Currency conversion, %")}<input className={num} type="number" min={0} step={0.05} value={common.fxPct} onChange={(e) => setCommon({ ...common, fxPct: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="flex items-end gap-2 pb-2 text-[0.9rem]"><input type="checkbox" className="accent-(--pine)" checked={common.sellAtEnd} onChange={(e) => setCommon({ ...common, sellAtEnd: e.target.checked })} />{t("Sell everything at the end")}</label>
        </div>
        <p className="mt-2 text-[0.82rem] text-muted">{t("Currency conversion applies only to funds whose trading currency differs from your account. One order is counted per month you invest.")}</p>
      </section>

      <section>
        <h2 className="text-[1.1rem]">{t("ETFs to compare")}</h2>
        {funds.length < 3 ? <div className="mt-2 max-w-md"><EtfSearch onPick={(k) => add(k)} placeholder={t("Add an ETF by name, ticker or ISIN")} /></div> : null}
        {funds.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {funds.map((f, i) => (
              <div key={f.key} className="panel p-4" style={{ borderTop: `3px solid ${COLORS[i]}` }}>
                <div className="flex items-start justify-between gap-2"><Link className="font-semibold no-underline hover:underline" href={`/etfs/${f.key}`}>{f.name}</Link><button type="button" aria-label={t("Remove")} className="cursor-pointer p-1 text-muted" onClick={() => setFunds(funds.filter((_, j) => j !== i))}><X size={15} aria-hidden /></button></div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="text-[0.8rem] text-muted">{t("Fee, %")}<input className={num} type="number" step={0.01} min={0} value={f.fee} onChange={(e) => set(i, { fee: Math.max(0, Number(e.target.value)) })} /></label>
                  <label className="text-[0.8rem] text-muted">{t("Tracking, %")}<input className={num} type="number" step={0.01} value={f.tracking} onChange={(e) => set(i, { tracking: Number(e.target.value) })} /></label>
                  <label className="text-[0.8rem] text-muted">{t("Spread, %")}<input className={num} type="number" step={0.01} min={0} value={f.spread} onChange={(e) => set(i, { spread: Math.max(0, Number(e.target.value)) })} /></label>
                </div>
                <p className="mt-2 text-[0.8rem] text-muted">{f.measured !== null ? t("Tracking prefilled from one year of NAV returns against the best fund on the same index, to {date}. One year is noisy: adjust it.", { date: f.gapAsOf ?? "" }) : t("No measured tracking on file, so it starts at zero. The spread is a typical figure for a large ETF: check your broker's quote.")}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-muted">{t("Add one to three ETFs to see what they cost in money.")}</p>}
      </section>

      {results.length ? (
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-[1.1rem]">{t("What it costs")}</h2>
            {HORIZONS.map((y) => <button key={y} type="button" className={`chip ${horizon === y ? "chip-on" : ""}`} aria-pressed={horizon === y} onClick={() => setHorizon(y)}>{t("{n} years", { n: y })}</button>)}
          </div>
          {best && lowestFee && best.f.key !== lowestFee.f.key ? <p className="mt-2 rounded-xl bg-warn-bg px-3.5 py-2 text-warn-ink">{t("{best} ends ahead over {years} years, though {cheap} has the lower fee: tracking and trading costs outweigh the fee difference.", { best: best.f.name, cheap: lowestFee.f.name, years: horizon })}</p> : null}
          <div className="mt-3 overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>{t("ETF")}</th><th className="num">{t("Paid in")}</th><th className="num">{t("Without any cost")}</th><th className="num">{t("After every cost")}</th><th className="num">{t("Total cost")}</th><th className="num">{t("Fund fee")}</th><th className="num">{t("Tracking")}</th><th className="num">{t("Spread")}</th><th className="num">{t("Broker")}</th><th className="num">{t("Currency")}</th></tr></thead>
              <tbody>
                {results.map(({ f, chosen: r }) => (
                  <tr key={f.key}>
                    <td className="min-w-[12rem]">{f.name}</td>
                    <td className="num">{money(r.contributed)}</td>
                    <td className="num">{money(r.noCost)}</td>
                    <td className="num font-semibold">{money(r.final)}</td>
                    <td className="num">{money(r.total_cost)} <span className="block text-[0.78rem] text-muted">{r.cost_pct_of_no_cost.toFixed(1)}%</span></td>
                    <td className="num">{money(r.parts.fund_fee)}</td>
                    <td className="num">{money(r.parts.tracking)}</td>
                    <td className="num">{money(r.parts.spread)}</td>
                    <td className="num">{money(r.parts.broker)}</td>
                    <td className="num">{money(r.parts.fx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {results.map(({ f, chosen: r }, i) => (
              <figure key={f.key} className="panel p-3" style={{ borderTop: `3px solid ${COLORS[i]}` }}>
                <figcaption className="mb-1 text-[0.9rem] font-semibold">{f.name}</figcaption>
                <CostChart series={r.yearly.map((p) => ({ year: p.year, noCost: p.noCost, value: p.value, paid: common.initial + common.monthly * 12 * p.year }))} start={{ noCost: common.initial, value: common.initial, paid: common.initial }} money={money} />
                <p className="text-[0.8rem] text-muted">{t("Shaded: what fees, tracking, spreads, broker and currency costs take over the years. The thin line is what you paid in.")}</p>
              </figure>
            ))}
          </div>
          <h3 className="mt-5 font-semibold">{t("Total cost over each period")}</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>{t("ETF")}</th>{HORIZONS.map((y) => <th key={y} className="num">{t("{n} years", { n: y })}</th>)}</tr></thead>
              <tbody>{results.map(({ f, at }) => <tr key={f.key}><td className="min-w-[12rem]">{f.name}</td>{at.map((r, i) => <td key={i} className="num">{money(r.total_cost)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 max-w-[72ch] text-[0.82rem] text-muted">{t("Each cost is measured on its own, as the money it alone would take, so the parts can add up to slightly more than the total: costs compound on each other. Past tracking does not repeat exactly, and the index return is your assumption. An illustration, not a forecast. Tax is not included.")}</p>
        </section>
      ) : null}
    </div>
  );
}
