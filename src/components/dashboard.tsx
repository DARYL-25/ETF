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

/** Questions about the reader's own portfolio, answered from its computed figures. */
export function Copilot({ portfolio, watch }: { portfolio: Portfolio; watch: Watchlist[] }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ q: string; lines: string[]; text: string | null; aiUsed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = async (q: string) => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await fetch("/api/v1/portfolio/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, positions: portfolio.positions.map((x) => ({ key: x.key, quantity: x.quantity })), watch: watch.flatMap((l) => l.items).filter((i) => i.seen).slice(0, 300) }) });
      const b = await r.json();
      setAnswer(r.ok ? { q, lines: b.lines, text: b.text, aiUsed: b.aiUsed } : { q, lines: [b.error ?? t("Something went wrong. Try again.")], text: null, aiUsed: false });
    } catch {
      setAnswer({ q, lines: [t("Something went wrong. Try again.")], text: null, aiUsed: false });
    } finally { setBusy(false); }
  };
  return (
    <section className="panel p-4" aria-label={t("Ask about your portfolio")}>
      <h2 className="text-[1.15rem]">{t("Ask about your portfolio")}</h2>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
        <input aria-label={t("Your question")} className="field" placeholder={t("Am I overexposed to the United States?")} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
        <button type="submit" className="btn btn-primary" disabled={busy}><Send size={15} aria-hidden /><span className="sr-only">{t("Ask")}</span></button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">{COPILOT_EXAMPLES.map((q) => <button key={q} type="button" className="chip h-auto max-w-full whitespace-normal py-1 text-left" onClick={() => { setQuestion(t(q)); ask(t(q)); }}>{t(q)}</button>)}</div>
      {busy ? <p className="mt-3 text-muted" role="status">{t("Working it out…")}</p> : null}
      {answer && !busy ? (
        <div className="mt-3 rounded-xl bg-sunken p-3.5" aria-live="polite">
          <p className="text-[0.85rem] text-muted">{answer.q}</p>
          {answer.text ? <p className="mt-1 whitespace-pre-wrap">{answer.text}</p> : <ul className="mt-1 space-y-1">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
          <p className="mt-2 text-[0.8rem] text-muted">{answer.aiUsed ? t("Written by AI from the figures below the answer, which we computed from your positions.") : t("Computed from your positions and the data we hold.")}</p>
          {answer.text ? <details className="mt-1 text-[0.85rem]"><summary className="cursor-pointer text-muted">{t("The computed figures")}</summary><ul className="mt-1 space-y-0.5">{answer.lines.map((l) => <li key={l}>{l}</li>)}</ul></details> : null}
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
