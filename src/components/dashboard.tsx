"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import { useLocal } from "./local-store";
import { PortfolioPicker, FindingCard, usePickedPortfolio, useReview } from "./portfolio-doctor";
import { useWatchChanges, WatchChanges, type Watchlist } from "./my-lists";
import { Mosaic } from "./mosaic";
import { drift } from "@/lib/portfolio/rebalance";
import { COPILOT_EXAMPLES } from "@/lib/assistant/copilot";
import { frequencyLabel } from "@/lib/format";
import type { Portfolio } from "./portfolio-tools";
import { netPositions } from "@/lib/portfolio/performance";

type Objectives = { goal?: "growth" | "income" | "preserve" | "retirement" | "other"; horizon_years?: number; risk?: "low" | "medium" | "high"; monthly_eur?: number; preferences?: string };
type Suggested = { key: string; isin: string; name: string; fee_pct: number | null; size: number | null; size_currency: string | null; income: string | null };
const GOALS: [NonNullable<Objectives["goal"]>, string][] = [["growth", "Grow my savings"], ["income", "Regular income (dividends)"], ["retirement", "Retirement"], ["preserve", "Protect what I have"], ["other", "Other"]];
const RISKS: [NonNullable<Objectives["risk"]>, string][] = [["low", "Low"], ["medium", "Medium"], ["high", "High"]];
const OBJECTIVE_EXAMPLES = ["Which ETFs could fit my objectives better?", "How could I turn this into a dividend income portfolio?", "Is my portfolio too risky for my horizon?"];

/** What the reader wants from their money, kept in this browser and sent with each question to the copilot. */
function ObjectivesForm({ value, onChange }: { value: Objectives; onChange: (o: Objectives) => void }) {
  const t = useT();
  const set = (patch: Partial<Objectives>) => onChange({ ...value, ...patch });
  return (
    <details className="mt-3 rounded-xl border border-line p-3" open={!value.goal}>
      <summary className="cursor-pointer font-semibold">{t("Your objectives")}{value.goal ? <span className="ml-2 font-normal text-muted">{t(GOALS.find(([g]) => g === value.goal)?.[1] ?? "")}{value.horizon_years ? ` · ${t("{n} years", { n: value.horizon_years })}` : ""}{value.risk ? ` · ${t("risk")} ${t(RISKS.find(([r]) => r === value.risk)?.[1] ?? "").toLowerCase()}` : ""}</span> : null}</summary>
      <p className="mt-1 text-[0.85rem] text-muted">{t("The copilot relates your portfolio to these. They stay in this browser.")}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-[0.9rem]">{t("Goal")}<select className="field mt-1" value={value.goal ?? ""} onChange={(e) => set({ goal: (e.target.value || undefined) as Objectives["goal"] })}><option value="">—</option>{GOALS.map(([g, l]) => <option key={g} value={g}>{t(l)}</option>)}</select></label>
        <label className="text-[0.9rem]">{t("Risk you accept")}<select className="field mt-1" value={value.risk ?? ""} onChange={(e) => set({ risk: (e.target.value || undefined) as Objectives["risk"] })}><option value="">—</option>{RISKS.map(([r, l]) => <option key={r} value={r}>{t(l)}</option>)}</select></label>
        <label className="text-[0.9rem]">{t("Horizon in years")}<input type="number" min={1} max={60} className="field mt-1" value={value.horizon_years ?? ""} onChange={(e) => set({ horizon_years: e.target.value ? Math.min(60, Math.max(1, Math.round(Number(e.target.value)))) : undefined })} /></label>
        <label className="text-[0.9rem]">{t("Monthly savings (EUR)")}<input type="number" min={0} className="field mt-1" value={value.monthly_eur ?? ""} onChange={(e) => set({ monthly_eur: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} /></label>
      </div>
      <label className="mt-2 block text-[0.9rem]">{t("Preferences (optional)")}<input className="field mt-1" maxLength={300} placeholder={t("e.g. ESG, halal, no US tech, PEA eligible")} value={value.preferences ?? ""} onChange={(e) => set({ preferences: e.target.value || undefined })} /></label>
    </details>
  );
}

/** Questions about the reader's own portfolio: figures computed here, explained by an open-weight AI against the reader's objectives. */
export function Copilot({ portfolio, watch }: { portfolio: Portfolio; watch: Watchlist[] }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [objectives, setObjectives] = useLocal<Objectives>("copilot-objectives", {});
  const [answer, setAnswer] = useState<{ q: string; lines: string[]; text: string | null; aiUsed: boolean; suggested: Suggested[]; disclaimer: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = async (q: string) => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await fetch("/api/v1/portfolio/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, positions: netPositions(portfolio.positions), watch: watch.flatMap((l) => l.items).filter((i) => i.seen).slice(0, 300), objectives: Object.keys(objectives).length ? objectives : null }) });
      const b = await r.json();
      setAnswer(r.ok ? { q, lines: b.lines, text: b.text, aiUsed: b.aiUsed, suggested: b.suggested ?? [], disclaimer: b.disclaimer ?? null } : { q, lines: [b.error ?? t("Something went wrong. Try again.")], text: null, aiUsed: false, suggested: [], disclaimer: null });
    } catch {
      setAnswer({ q, lines: [t("Something went wrong. Try again.")], text: null, aiUsed: false, suggested: [], disclaimer: null });
    } finally { setBusy(false); }
  };
  return (
    <section className="panel p-4" aria-label={t("Ask about your portfolio")}>
      <h2 className="text-[1.15rem]">{t("Ask about your portfolio")}</h2>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
        <input aria-label={t("Your question")} className="field" placeholder={t("Am I overexposed to the United States?")} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
        <button type="submit" className="btn btn-primary" disabled={busy}><Send size={15} aria-hidden /><span className="sr-only">{t("Ask")}</span></button>
      </form>
      <ObjectivesForm value={objectives} onChange={setObjectives} />
      <div className="mt-2 flex flex-wrap gap-1.5">{[...OBJECTIVE_EXAMPLES, ...COPILOT_EXAMPLES].map((q) => <button key={q} type="button" className="chip h-auto max-w-full whitespace-normal py-1 text-left" onClick={() => { setQuestion(t(q)); ask(t(q)); }}>{t(q)}</button>)}</div>
      {busy ? <p className="mt-3 text-muted" role="status">{t("Working it out…")}</p> : null}
      {answer && !busy ? (
        <div className="mt-3 rounded-xl bg-sunken p-3.5" aria-live="polite">
          <p className="text-[0.85rem] text-muted">{answer.q}</p>
          {answer.text ? <p className="mt-1 whitespace-pre-wrap">{answer.text}</p> : <ul className="mt-1 space-y-1">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
          <p className="mt-2 text-[0.8rem] text-muted">{answer.aiUsed ? t("Written by an open-weight AI from figures we computed from your positions and from our ETF database.") : t("Computed from your positions and the data we hold.")}</p>
          {answer.suggested.length ? (
            <div className="mt-3">
              <p className="text-[0.85rem] font-semibold">{t("ETFs mentioned, from our database")}</p>
              <ul className="mt-1 space-y-1">{answer.suggested.map((s) => (
                <li key={s.key} className="text-[0.9rem]"><Link className="prose-link" href={`/etfs/${encodeURIComponent(s.isin ?? s.key)}`}>{s.name}</Link><span className="data ml-2 text-muted">{s.fee_pct !== null ? `${s.fee_pct.toFixed(2)}%` : "—"}{s.size ? ` · ${new Intl.NumberFormat(t.lang === "fr" ? "fr-FR" : "en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(s.size)} ${s.size_currency ?? ""}` : ""}</span></li>
              ))}</ul>
            </div>
          ) : null}
          {answer.text ? <details className="mt-1 text-[0.85rem]"><summary className="cursor-pointer text-muted">{t("The computed figures")}</summary><ul className="mt-1 space-y-0.5">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul></details> : null}
          {answer.disclaimer ? <p className="mt-3 border-t border-line pt-2 text-[0.8rem] text-muted" role="note">{answer.disclaimer}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

const money = (v: number, lang: string) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

/** The dashboard: one portfolio at a glance, what needs attention, the copilot and what changed. */
export function Dashboard() {
  const t = useT();
  const picked = usePickedPortfolio();
  const [watch] = useLocal<Watchlist[]>("watchlists", []);
  const changes = useWatchChanges(watch);
  const { data, loading } = useReview(picked.current);
  const p = picked.current;
  if (!p) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/portfolio" className="panel p-5 no-underline hover:border-pine"><p className="text-[1.15rem] font-semibold">{t("Add your portfolio")}</p><p className="mt-1 text-muted">{t("Enter positions or import your broker's file. It stays on this device unless you sign in.")}</p></Link>
        <Link href="/assistant" className="panel p-5 no-underline hover:border-pine"><p className="text-[1.15rem] font-semibold">{t("Find an ETF")}</p><p className="mt-1 text-muted">{t("Describe what you are looking for in your own words.")}</p></Link>
        <Link href="/tools/simulator" className="panel p-5 no-underline hover:border-pine"><p className="text-[1.15rem] font-semibold">{t("Plan your savings")}</p><p className="mt-1 text-muted">{t("See what monthly saving could grow to, and the range around it.")}</p></Link>
        <div className="md:col-span-3"><WatchChanges changes={changes} /></div>
      </div>
    );
  }
  const holdings = data ? data.insight.funds.map((f) => ({ key: f.key, name: f.name, value: f.value_eur })) : [];
  const d = data && p.targets && Object.keys(p.targets).length ? drift(holdings, p.targets, p.threshold ?? 5) : null;
  const income = data ? data.insight.funds.filter((f) => f.distribution_policy === "distributing") : [];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><PortfolioPicker {...picked} /><p className="flex flex-wrap gap-2"><Link className="btn btn-quiet" href={`/portfolio`}>{t("Edit positions")}</Link><Link className="btn btn-quiet" href={`/portfolio/doctor?p=${p.id}`}>{t("Full review")}</Link><Link className="btn btn-quiet" href={`/tools/simulator?p=${p.id}`}>{t("Simulate")}</Link></p></div>
      {loading && !data ? <p className="text-muted" role="status">{t("Loading your portfolio…")}</p> : null}
      {data ? (
        <>
          <section className="panel grid grid-cols-2 gap-x-6 gap-y-4 p-5 lg:grid-cols-5" aria-label={t("Summary")}>
            <div><p className="text-[0.85rem] text-muted">{t("Value")}</p><p className="stat-value">{money(data.insight.total_eur, t.lang)}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Funds")}</p><p className="stat-value">{data.insight.funds.length}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Blended yearly fee")}</p><p className="stat-value">{data.insight.fee_pct !== null ? `${data.insight.fee_pct.toFixed(2)}%` : "—"}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Fees per year")}</p><p className="stat-value">{data.insight.yearly_cost_eur !== null ? money(data.insight.yearly_cost_eur, t.lang) : "—"}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Ten largest companies")}</p><p className="stat-value">{data.insight.look.covered_pct ? `${data.insight.xray.top10_pct.toFixed(0)}%` : "—"}</p></div>
          </section>

          <section>
            <h2 className="text-[1.3rem]">{t("Needs your attention")}</h2>
            <ul className="mt-3 grid gap-3 lg:grid-cols-3">
              {d?.breached ? <li className="panel p-3.5"><p className="font-semibold">{t("Off its target allocation")}</p><p className="mt-0.5">{t("A fund is {pts} points away from its target share, beyond your {threshold}-point alert.", { pts: d.max_drift_pts.toFixed(1), threshold: p.threshold ?? 5 })}</p><Link className="prose-link mt-1 inline-block" href="/portfolio">{t("See the trades back to target")}</Link></li> : null}
              {changes.length ? <li className="panel p-3.5"><p className="font-semibold">{t("Changes on your watchlists")}</p><p className="mt-0.5">{t(changes[0].text, changes[0].vars)}</p>{changes.length > 1 ? <p className="text-[0.85rem] text-muted">{t("And {n} more below.", { n: changes.length - 1 })}</p> : null}</li> : null}
              {data.review.weaknesses.slice(0, d?.breached || changes.length ? 1 : 3).map((f) => <FindingCard key={f.id} f={f} />)}
              {!d?.breached && !changes.length && !data.review.weaknesses.length ? <li className="panel p-3.5">{t("Nothing needs your attention. Most of the time, that is how a long-term portfolio should feel.")}</li> : null}
            </ul>
          </section>

          <Copilot portfolio={p} watch={watch} />

          {data.insight.look.covered_pct > 0 ? (
            <section>
              <h2 className="text-[1.3rem]">{t("What you really own")}</h2>
              <div className="mt-2"><Mosaic items={data.insight.look.holdings.map((h) => ({ holding_key: h.holding_key, name: h.label, ticker: h.ticker, weight_pct: h.weight_pct }))} label={t("Your portfolio as one basket")} restLabel={(pct) => t("Everything else, {pct}%", { pct })} /></div>
              <ul className="mt-2 space-y-1">{data.insight.xray.insights.map((i) => <li key={i.text}>{t(i.text, i.vars)}</li>)}</ul>
              <p className="mt-1 text-[0.85rem] text-muted">{t("Seen through for {pct}% of the portfolio, from issuers' holdings files.", { pct: data.insight.look.covered_pct.toFixed(0) })}</p>
            </section>
          ) : null}

          <WatchChanges changes={changes} />

          <section>
            <h2 className="text-[1.3rem]">{t("Distributions")}</h2>
            {income.length ? (
              <>
                <div className="mt-2 overflow-x-auto">
                  <table className="table-data">
                    <thead><tr><th>{t("ETF")}</th><th>{t("Pays out")}</th><th className="num">{t("Yield")}</th><th className="num">{t("Estimated a year")}</th></tr></thead>
                    <tbody>{income.map((f) => <tr key={f.key}><td className="min-w-[12rem]"><Link className="no-underline hover:underline" href={`/etfs/${f.key}`}>{f.name}</Link></td><td>{f.distribution_frequency ? t(frequencyLabel(f.distribution_frequency)) : t("Frequency not on file")}</td><td className="num">{f.trailing_yield_pct !== null ? `${f.trailing_yield_pct.toFixed(2)}%` : "—"}</td><td className="num">{f.trailing_yield_pct !== null ? money((f.value_eur * f.trailing_yield_pct) / 100, t.lang) : "—"}</td></tr>)}</tbody>
                  </table>
                </div>
                <p className="mt-1 text-[0.85rem] text-muted">{t("Payment dates are not in our data yet, so this shows how often each fund pays and, where known, its trailing yield. Check the issuer's distribution calendar for dates.")}</p>
              </>
            ) : <p className="mt-1 text-muted">{t("None of your funds pays out its income: they all reinvest it, or we do not know their policy.")}</p>}
          </section>

          {data.lessons.length ? (
            <section>
              <h2 className="text-[1.3rem]">{t("Lessons that match this portfolio")}</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">{data.lessons.map((l) => <li key={l.slug} className="panel p-3.5"><Link className="font-semibold no-underline hover:underline" href={`/academy/${l.slug}`}>{t(l.title)}</Link><p className="mt-0.5 text-muted">{t(l.reason)}</p></li>)}</ul>
            </section>
          ) : null}
          <p className="text-[0.85rem] text-muted"><Link className="prose-link" href="/launches">{t("New ETFs launched recently")}</Link> · <Link className="prose-link" href="/methodology">{t("How these figures are calculated")}</Link></p>
        </>
      ) : null}
    </div>
  );
}
