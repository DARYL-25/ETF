"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { useLocal } from "./local-store";
import type { Portfolio } from "./portfolio-tools";
import type { FullReview } from "@/lib/portfolio/review-server";
import type { Finding, Severity } from "@/lib/portfolio/doctor";

/** The reader's saved portfolios and the one picked, from ?p= in the address or the first one. */
export function usePickedPortfolio() {
  const [portfolios] = useLocal<Portfolio[]>("portfolios", []);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(new URLSearchParams(window.location.search).get("p")); }, []);
  const current = portfolios.find((p) => p.id === picked) ?? portfolios.find((p) => p.positions.length) ?? null;
  const pick = (id: string) => {
    setPicked(id);
    const url = new URL(window.location.href); url.searchParams.set("p", id); window.history.replaceState(null, "", url);
  };
  return { portfolios, current, pick };
}

export function PortfolioPicker({ portfolios, current, pick }: ReturnType<typeof usePickedPortfolio>) {
  const t = useT();
  if (portfolios.length < 2) return null;
  return (
    <label className="block max-w-sm text-[0.9rem] text-muted">{t("Portfolio")}
      <select className="field mt-1" value={current?.id ?? ""} onChange={(e) => pick(e.target.value)}>{portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    </label>
  );
}

export function useReview(current: Portfolio | null, costs: { spreadPct: number; orderFeeEur: number } = { spreadPct: 0.1, orderFeeEur: 2 }) {
  const [data, setData] = useState<FullReview | null>(null);
  const [loading, setLoading] = useState(false);
  const positions = (current?.positions ?? []).map((x) => ({ key: x.key, quantity: x.quantity }));
  const signature = JSON.stringify([positions, costs]);
  useEffect(() => {
    if (!positions.length) { setData(null); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/v1/portfolio/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ positions, ...costs }), signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null)).then((b) => { setData(b); setLoading(false); }).catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return { data, loading };
}

const ICON: Record<Severity, typeof AlertTriangle> = { high: ShieldAlert, medium: AlertTriangle, low: Info };
const TONE: Record<Severity, string> = { high: "bg-down/10 text-down", medium: "bg-warn-bg text-warn-ink", low: "bg-sunken text-muted" };
const SEVERITY: Record<Severity, string> = { high: "Important", medium: "Worth a look", low: "For information" };
const AREA: Record<Finding["area"], string> = { diversification: "Diversification", risk: "Risk", costs: "Costs", overlap: "Overlap", allocation: "Allocation", efficiency: "Efficiency", data: "Data" };

export function FindingCard({ f }: { f: Finding }) {
  const t = useT();
  const Icon = ICON[f.severity];
  return (
    <li className="panel flex gap-3 p-3.5">
      <span className={`mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full ${TONE[f.severity]}`}><Icon size={15} aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-[0.8rem] text-muted">{t(AREA[f.area])} · {t(SEVERITY[f.severity])}</p>
        <p className="font-semibold">{t(f.title)}</p>
        <p className="mt-0.5">{t(f.detail, f.vars)}</p>
      </div>
    </li>
  );
}

const money = (v: number, lang: string) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

/** Portfolio Doctor: the review of one saved portfolio, its options to simplify and their costs. */
export function PortfolioDoctor() {
  const t = useT();
  const picked = usePickedPortfolio();
  const [costs, setCosts] = useState({ spreadPct: 0.1, orderFeeEur: 2 });
  const { data, loading } = useReview(picked.current, costs);
  if (!picked.portfolios.some((p) => p.positions.length)) return (
    <div className="panel max-w-[68ch] p-5">
      <p>{t("Add a portfolio with at least one position first, or import one from your broker's file.")}</p>
      <p className="mt-3"><Link className="btn btn-primary" href="/portfolio">{t("Go to portfolios")}</Link></p>
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <PortfolioPicker {...picked} />
      {loading && !data ? <p className="text-muted" role="status">{t("Reviewing…")}</p> : null}
      {data ? (
        <>
          <section className="panel grid grid-cols-2 gap-x-6 gap-y-4 p-5 lg:grid-cols-4" aria-label={t("Summary")}>
            <div><p className="text-[0.85rem] text-muted">{t("Value")}</p><p className="stat-value">{money(data.review.summary.value_eur, t.lang)}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Funds")}</p><p className="stat-value">{data.review.summary.funds}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Blended yearly fee")}</p><p className="stat-value">{data.review.summary.fee_pct !== null ? `${data.review.summary.fee_pct.toFixed(2)}%` : "—"}</p></div>
            <div><p className="text-[0.85rem] text-muted">{t("Seen through to holdings")}</p><p className="stat-value">{data.review.summary.covered_pct.toFixed(0)}%</p></div>
          </section>

          <section>
            <h2 className="text-[1.3rem]">{t("The three biggest weaknesses")}</h2>
            {data.review.weaknesses.length ? <ol className="mt-3 grid gap-3 lg:grid-cols-3">{data.review.weaknesses.map((f) => <FindingCard key={f.id} f={f} />)}</ol> : <p className="mt-2">{t("The review found no weakness worth flagging in what we can see.")}</p>}
          </section>

          <section>
            <h2 className="text-[1.3rem]">{t("Simplify without changing the strategy")}</h2>
            <p className="mt-1 max-w-[72ch] text-muted">{t("Where two funds hold largely the same companies or follow the same index, one of them adds little. These are options to look at, with what moving would cost; whether to act is your decision.")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="text-[0.85rem] text-muted">{t("Spread you pay, %")}<input className="field mt-1 w-24" type="number" step={0.05} min={0} max={5} value={costs.spreadPct} onChange={(e) => setCosts({ ...costs, spreadPct: Math.max(0, Number(e.target.value)) })} /></label>
              <label className="text-[0.85rem] text-muted">{t("Broker fee per order, €")}<input className="field mt-1 w-24" type="number" step={0.5} min={0} max={100} value={costs.orderFeeEur} onChange={(e) => setCosts({ ...costs, orderFeeEur: Math.max(0, Number(e.target.value)) })} /></label>
            </div>
            {data.review.options.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("Option")}</th><th className="num">{t("Amount moved")}</th><th className="num">{t("Cost to switch")}</th><th className="num">{t("Fees per year after")}</th></tr></thead>
                  <tbody>
                    {data.review.options.map((o) => (
                      <tr key={o.keep + o.drop}>
                        <td className="min-w-[18rem]">{t(o.detail, o.vars)}</td>
                        <td className="num">{money(o.moved_eur, t.lang)}</td>
                        <td className="num">{money(o.switching_cost_eur, t.lang)}</td>
                        <td className="num">{o.yearly_fee_change_eur === null ? "—" : `${o.yearly_fee_change_eur <= 0 ? "−" : "+"}${money(Math.abs(o.yearly_fee_change_eur), t.lang)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-2">{t("No two of your funds overlap by 60% or more or share an index, so we see no fund that folds neatly into another.")}</p>}
            <p className="mt-2 text-[0.85rem] text-muted">{t("Switching cost counts the spread on the sale and the purchase and two broker orders. Selling can also realise a taxable gain outside a PEA or an assurance-vie: see the tax notes for your country.")} <Link className="prose-link" href="/tax">{t("Tax notes")}</Link></p>
          </section>

          {Object.values(data.alternatives).some((a) => a.length) ? (
            <section>
              <h2 className="text-[1.3rem]">{t("Cheaper funds on the same index")}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("Your ETF")}</th><th className="num">{t("Its fee")}</th><th>{t("Same index, lower fee")}</th><th className="num">{t("Fee")}</th></tr></thead>
                  <tbody>
                    {data.insight.funds.filter((f) => data.alternatives[f.key]?.length).map((f) => data.alternatives[f.key].slice(0, 2).map((a, i) => (
                      <tr key={f.key + a.key}>
                        <td className="min-w-[12rem]">{i === 0 ? <Link className="no-underline hover:underline" href={`/etfs/${f.key}`}>{f.name}</Link> : null}</td>
                        <td className="num">{i === 0 && f.headline_fee_pct !== null ? `${f.headline_fee_pct.toFixed(2)}%` : ""}</td>
                        <td className="min-w-[12rem]"><Link className="no-underline hover:underline" href={`/etfs/${a.key}`}>{a.name}</Link>{a.same_fund ? <span className="block text-[0.8rem] text-muted">{t("Another share class of the same fund")}</span> : null}</td>
                        <td className="num">{a.fee_pct.toFixed(2)}%</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[0.85rem] text-muted">{t("Same index, same income policy and same currency hedging. A lower fee is not the whole cost: compare tracking, size and where each fund trades.")} <Link className="prose-link" href="/tools/true-cost">{t("True cost calculator")}</Link></p>
            </section>
          ) : null}

          <section>
            <h2 className="text-[1.3rem]">{t("Every finding")}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">{data.review.findings.map((f) => <FindingCard key={f.id} f={f} />)}</ul>
          </section>

          {data.lessons.length ? (
            <section>
              <h2 className="text-[1.3rem]">{t("Lessons that match this portfolio")}</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">{data.lessons.map((l) => <li key={l.slug} className="panel p-3.5"><Link className="font-semibold no-underline hover:underline" href={`/academy/${l.slug}`}>{t(l.title)}</Link><p className="mt-0.5 text-muted">{t(l.reason)}</p></li>)}</ul>
            </section>
          ) : null}
          <p className="max-w-[72ch] text-[0.85rem] text-muted">{t("This review applies fixed rules to the figures we hold and is general information, not investment advice. It does not know your goals, your other savings or your tax position. How each rule works is on the methodology page.")} <Link className="prose-link" href="/methodology">{t("Methodology")}</Link></p>
        </>
      ) : null}
    </div>
  );
}
