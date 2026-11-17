"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ASSET_CLASSES, DEFAULT_ASSUMPTIONS, simulate, type AssetClass, type Assumption, type Mix, type SimResult } from "@/lib/tools/simulate";
import { useLocal } from "./local-store";
import type { Portfolio } from "./portfolio-tools";
import type { PortfolioInsight } from "@/lib/etfs/portfolio";
import { netPositions } from "@/lib/portfolio/performance";

const LABEL: Record<AssetClass, string> = { equity: "Shares", fixed_income: "Bonds", money_market: "Money market", commodities: "Commodities" };
type Strategy = { name: string; mix: Mix; fee: number };

function Fan({ a, b, initial, money }: { a: SimResult; b: SimResult | null; initial: number; money: (v: number) => string }) {
  const t = useT();
  const W = 640, H = 260, L = 70, R = 12, T = 12, B = 28;
  const start = { year: 0, p10: initial, p50: initial, p90: initial, contributed: initial };
  const pts = (s: SimResult) => [start, ...s.bands];
  const max = Math.max(...[...a.bands, ...(b?.bands ?? [])].map((x) => x.p90), 1);
  const years = a.bands.length;
  const x = (yr: number) => L + (yr / years) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (s: SimResult, k: "p50" | "contributed") => pts(s).map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = (s: SimResult) => [...pts(s).map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.p90).toFixed(1)}`), ...[...pts(s)].reverse().map((p) => `L${x(p.year).toFixed(1)},${y(p.p10).toFixed(1)}`), "Z"].join(" ");
  const step = years > 30 ? 10 : 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("Range of outcomes year by year")}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(f * max)} y2={y(f * max)} stroke="var(--line)" /><text x={L - 6} y={y(f * max) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{money(f * max)}</text></g>)}
      {Array.from({ length: Math.floor(years / step) + 1 }, (_, i) => i * step).map((yr) => <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{yr}</text>)}
      <path d={area(a)} fill="var(--pine)" opacity="0.16" />
      {b ? <path d={area(b)} fill="var(--saffron)" opacity="0.18" /> : null}
      <path d={line(a, "contributed")} fill="none" stroke="var(--muted)" strokeDasharray="4 4" />
      <path d={line(a, "p50")} fill="none" stroke="var(--pine)" strokeWidth="2.5" />
      {b ? <path d={line(b, "p50")} fill="none" stroke="var(--saffron)" strokeWidth="2.5" /> : null}
    </svg>
  );
}

function MixEditor({ s, onChange, color }: { s: Strategy; onChange: (s: Strategy) => void; color: string }) {
  const t = useT();
  const total = ASSET_CLASSES.reduce((sum, c) => sum + (s.mix[c] ?? 0), 0);
  return (
    <div className="panel p-4" style={{ borderTop: `3px solid ${color}` }}>
      <input aria-label={t("Strategy name")} className="field font-semibold" value={s.name} onChange={(e) => onChange({ ...s, name: e.target.value })} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ASSET_CLASSES.map((c) => <label key={c} className="text-[0.8rem] text-muted">{t(LABEL[c])}, %<input className="field mt-1" type="number" min={0} max={100} step={5} value={s.mix[c] ?? 0} onChange={(e) => onChange({ ...s, mix: { ...s.mix, [c]: Math.max(0, Number(e.target.value)) } })} /></label>)}
        <label className="text-[0.8rem] text-muted">{t("Blended fee, %")}<input className="field mt-1" type="number" min={0} step={0.01} value={s.fee} onChange={(e) => onChange({ ...s, fee: Math.max(0, Number(e.target.value)) })} /></label>
      </div>
      {Math.abs(total - 100) > 0.5 ? <p className="mt-1 text-[0.8rem] text-muted">{t("Adds up to {sum}%, scaled to 100%.", { sum: total.toFixed(0) })}</p> : null}
    </div>
  );
}

/** Portfolio simulator: saving and withdrawing, a range of outcomes from random paths, and two strategies side by side. */
export function Simulator() {
  const t = useT();
  const [portfolios] = useLocal<Portfolio[]>("portfolios", []);
  const [a, setA] = useState<Strategy>({ name: t("All shares"), mix: { equity: 100 }, fee: 0.2 });
  const [b, setB] = useState<Strategy | null>({ name: t("Shares and bonds, 80/20"), mix: { equity: 80, fixed_income: 20 }, fee: 0.2 });
  const [plan, setPlan] = useState({ initial: 5000, monthly: 500, years: 25, inflationPct: 2, withdrawMonthly: 0, withdrawYears: 0 });
  const [assumptions, setAssumptions] = useState<Record<AssetClass, Assumption>>(DEFAULT_ASSUMPTIONS);
  const [history, setHistory] = useState<PortfolioInsight["funds"] | null>(null);
  const fromPortfolio = async (id: string) => {
    const p = portfolios.find((x) => x.id === id);
    if (!p?.positions.length) return;
    const r = await fetch("/api/v1/portfolio/insight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ positions: netPositions(p.positions) }) });
    if (!r.ok) return;
    const ins = (await r.json()) as PortfolioInsight;
    const mix: Mix = {};
    for (const al of ins.allocation) { const c = (ASSET_CLASSES as string[]).includes(al.label) ? (al.label as AssetClass) : "equity"; mix[c] = (mix[c] ?? 0) + Math.round(al.weight_pct); }
    setA({ name: p.name, mix, fee: Number((ins.fee_pct ?? 0.2).toFixed(2)) });
    setPlan((x) => ({ ...x, initial: Math.round(ins.total_eur) }));
    setHistory(ins.funds);
  };
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("p");
    if (id && portfolios.some((p) => p.id === id)) fromPortfolio(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios.length]);
  const valid = plan.years >= 1 && plan.years <= 60 && plan.withdrawYears >= 0 && plan.withdrawYears <= 50;
  const ra = useMemo(() => (valid ? simulate({ ...plan, mix: a.mix, feePct: a.fee, assumptions, paths: 2000 }) : null), [plan, a, assumptions, valid]);
  const rb = useMemo(() => (valid && b ? simulate({ ...plan, mix: b.mix, feePct: b.fee, assumptions, paths: 2000, seed: 42 }) : null), [plan, b, assumptions, valid]);
  const money = (v: number) => new Intl.NumberFormat(t.lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", notation: v >= 1e6 ? "compact" : "standard", maximumFractionDigits: v >= 1e6 ? 1 : 0 }).format(v);
  const num = "field mt-1 font-normal";
  const rows: [string, (r: SimResult) => string][] = [
    ["Expected return a year, after fees", (r) => `${r.expectedPct.toFixed(1)}%`],
    ["Volatility a year", (r) => `${r.volPct.toFixed(1)}%`],
    ["Paid in", (r) => money(r.contributed)],
    ["Middle outcome", (r) => money(r.end.p50)],
    ["One in ten paths ends below", (r) => money(r.end.p10)],
    ["One in ten paths ends above", (r) => money(r.end.p90)],
    ["Middle outcome in today's money", (r) => money(r.end.p50Real)],
    ["Chance of ending below what you paid in", (r) => `${r.lossChancePct.toFixed(0)}%`],
    ["Typical largest fall along the way", (r) => `−${r.drawdown.median.toFixed(0)}%`],
    ["Largest fall, 1 in 10 bad case", (r) => `−${r.drawdown.p90.toFixed(0)}%`],
    ["Constant return, no ups and downs", (r) => money(r.deterministic)],
    ["Fund fees paid over the period", (r) => money(r.feeCost)],
  ];
  if (plan.withdrawYears > 0 && plan.withdrawMonthly > 0) rows.push(["Money lasts through the withdrawals", (r) => (r.lastsPct === null ? "—" : `${r.lastsPct.toFixed(0)}%`)]);

  return (
    <div className="flex flex-col gap-6">
      <section className="panel p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[1.1rem]">{t("Your plan")}</h2>
          {portfolios.some((p) => p.positions.length) ? <label className="text-[0.85rem] text-muted">{t("Start from one of my portfolios")}<select className="field mt-1" defaultValue="" onChange={(e) => e.target.value && fromPortfolio(e.target.value)}><option value="">—</option>{portfolios.filter((p) => p.positions.length).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <label className="text-[0.85rem] text-muted">{t("Starting amount")}<input className={num} type="number" min={0} step={1000} value={plan.initial} onChange={(e) => setPlan({ ...plan, initial: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Each month")}<input className={num} type="number" min={0} step={50} value={plan.monthly} onChange={(e) => setPlan({ ...plan, monthly: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Years of saving")}<input className={num} type="number" min={1} max={60} value={plan.years} onChange={(e) => setPlan({ ...plan, years: Math.round(Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Inflation a year, %")}<input className={num} type="number" min={0} max={20} step={0.5} value={plan.inflationPct} onChange={(e) => setPlan({ ...plan, inflationPct: Number(e.target.value) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("Then withdraw each month, today's money")}<input className={num} type="number" min={0} step={100} value={plan.withdrawMonthly} onChange={(e) => setPlan({ ...plan, withdrawMonthly: Math.max(0, Number(e.target.value)) })} /></label>
          <label className="text-[0.85rem] text-muted">{t("For how many years")}<input className={num} type="number" min={0} max={50} value={plan.withdrawYears} onChange={(e) => setPlan({ ...plan, withdrawYears: Math.max(0, Math.round(Number(e.target.value))) })} /></label>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <MixEditor s={a} onChange={setA} color="var(--pine)" />
        {b ? <div className="relative"><MixEditor s={b} onChange={setB} color="var(--saffron)" /><button type="button" className="btn btn-quiet mt-2" onClick={() => setB(null)}>{t("Remove the comparison")}</button></div> : <div><button type="button" className="btn btn-quiet" onClick={() => setB({ name: t("Strategy B"), mix: { equity: 60, fixed_income: 40 }, fee: 0.2 })}>{t("Compare with a second strategy")}</button></div>}
      </section>

      {ra ? (
        <section>
          <h2 className="text-[1.1rem]">{t("Range of outcomes")}</h2>
          <p className="mt-1 text-muted">{t("The line is the middle of 2,000 random paths, the band holds 8 paths in 10, and the dashed line is what you paid in.")}</p>
          <div className="panel mt-2 p-3"><Fan a={ra} b={rb} initial={plan.initial} money={money} /></div>
          <div className="mt-3 overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>{t("After {n} years of saving", { n: plan.years })}</th><th className="num" style={{ color: "var(--pine)" }}>{a.name}</th>{rb && b ? <th className="num" style={{ color: "var(--saffron)" }}>{b.name}</th> : null}</tr></thead>
              <tbody>{rows.map(([label, f]) => <tr key={label}><td>{t(label)}</td><td className="num">{f(ra)}</td>{rb ? <td className="num">{f(rb)}</td> : null}</tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : <p className="text-muted">{t("Enter 1 to 60 years of saving.")}</p>}

      <details className="panel p-4">
        <summary className="cursor-pointer font-semibold">{t("Assumptions behind the result")}</summary>
        <p className="mt-2 text-[0.9rem] text-muted">{t("Round long-run figures before fund fees, not forecasts. Change them to test your own view. Shares and bonds are assumed to move together a little; months are drawn at random from these figures.")}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>{t("Asset class")}</th><th className="num">{t("Return a year, %")}</th><th className="num">{t("Volatility a year, %")}</th></tr></thead>
            <tbody>{ASSET_CLASSES.map((c) => (
              <tr key={c}>
                <td>{t(LABEL[c])}</td>
                <td className="num"><input aria-label={t("Return for {c}", { c: t(LABEL[c]) })} className="field w-24 text-right" type="number" step={0.5} value={assumptions[c].returnPct} onChange={(e) => setAssumptions({ ...assumptions, [c]: { ...assumptions[c], returnPct: Number(e.target.value) } })} /></td>
                <td className="num"><input aria-label={t("Volatility for {c}", { c: t(LABEL[c]) })} className="field w-24 text-right" type="number" step={0.5} min={0} value={assumptions[c].volPct} onChange={(e) => setAssumptions({ ...assumptions, [c]: { ...assumptions[c], volPct: Math.max(0, Number(e.target.value)) } })} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>

      {history?.length ? (
        <section>
          <h2 className="text-[1.1rem]">{t("What these funds actually returned")}</h2>
          <p className="mt-1 max-w-[72ch] text-muted">{t("Official NAV returns published by the issuers, annualised, income reinvested. We do not yet hold the long daily price history a full backtest needs, so these are the past figures we can show.")}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>{t("ETF")}</th><th className="num">{t("Share")}</th><th className="num">{t("1 year")}</th><th className="num">{t("3 years, a year")}</th><th className="num">{t("5 years, a year")}</th><th>{t("To")}</th></tr></thead>
              <tbody>{history.map((f) => (
                <tr key={f.key}><td className="min-w-[12rem]"><Link className="no-underline hover:underline" href={`/etfs/${f.key}`}>{f.name}</Link></td><td className="num">{f.weight_pct.toFixed(0)}%</td><td className="num">{f.nav_return_1y?.toFixed(1) ?? "—"}</td><td className="num">{f.nav_return_3y?.toFixed(1) ?? "—"}</td><td className="num">{f.nav_return_5y?.toFixed(1) ?? "—"}</td><td>{f.nav_return_as_of ?? "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
      <p className="max-w-[72ch] text-[0.82rem] text-muted">{t("Simulations do not predict the future, and past returns do not guarantee future ones. Real markets have longer and deeper falls than random months suggest, and taxes are not included.")}</p>
    </div>
  );
}
