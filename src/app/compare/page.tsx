import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Change, Fee, PageTitle } from "@/components/etf-bits";
import { PriceChart } from "@/components/price-chart";
import { getEtfs, getExposures, getPriceSeries, type EtfRow, type Exposure } from "@/lib/etfs/queries";
import { currentPlan } from "@/lib/billing/plan";
import { getOverlaps, getSharedHoldings } from "@/lib/etfs/holdings";
import { query } from "@/lib/db/client";
import { PLANS } from "@/lib/billing/stripe";
import { MISSING, assetClassLabel, countryName, distributionLabel, formatDate, formatMoney, formatPct, replicationLabel, styleLabel, yesNoUnknown } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare" };

type Row = { label: string; render: (r: EtfRow) => React.ReactNode };

const groups: { title: string; rows: Row[] }[] = [
  { title: "General", rows: [
    { label: "Issuer", render: (r) => r.issuer_name },
    { label: "ISIN", render: (r) => r.isin ?? MISSING },
    { label: "Ticker", render: (r) => r.ticker ?? MISSING },
    { label: "Index", render: (r) => r.index_name ?? MISSING },
    { label: "Asset class", render: (r) => assetClassLabel(r.asset_class) },
    { label: "Domicile", render: (r) => countryName(r.domicile) },
    { label: "Share class launched", render: (r) => formatDate(r.share_class_launch_date) },
    { label: "Size", render: (r) => <>{formatMoney(r.fund_aum ?? r.class_aum, r.fund_aum_currency ?? r.class_aum_currency)}{(r.aum_level === "share_class" || (r.fund_aum === null && r.class_aum !== null)) ? <span className="block text-[0.75rem] text-muted">Share class</span> : null}</> },
    { label: "Size date", render: (r) => formatDate(r.fund_aum_as_of ?? r.class_aum_as_of) },
    { label: "Share class currency", render: (r) => r.currency ?? MISSING },
  ] },
  { title: "Structure", rows: [
    { label: "Approach", render: (r) => styleLabel(r.management_style) },
    { label: "Replication", render: (r) => replicationLabel(r.replication) },
    { label: "Income", render: (r) => distributionLabel(r.distribution_policy) },
    { label: "Currency hedged", render: (r) => yesNoUnknown(r.hedged) },
    { label: "UCITS", render: (r) => yesNoUnknown(r.ucits) },
  ] },
  { title: "Fees", rows: [
    { label: "Yearly fee", render: (r) => <Fee row={r} /> },
    { label: "TER", render: (r) => formatPct(r.ter_pct) },
    { label: "OCF", render: (r) => formatPct(r.ocf_pct) },
    { label: "Transaction costs", render: () => MISSING },
  ] },
  { title: "Official NAV return", rows: [
    { label: "1 year", render: (r) => <Change value={r.nav_return_1y} /> },
    { label: "3 years, per year", render: (r) => <Change value={r.nav_return_3y} /> },
    { label: "5 years, per year", render: (r) => <Change value={r.nav_return_5y} /> },
    { label: "Since launch, per year", render: (r) => <Change value={r.nav_return_si} /> },
    { label: "Calculated to", render: (r) => formatDate(r.nav_return_as_of) },
    { label: "Return currency", render: (r) => r.nav_currency ?? r.currency ?? "—" },
  ] },
  { title: "Market price change", rows: [
    { label: "1 year", render: (r) => <Change value={r.market_return_1y} /> },
    { label: "3 years, per year", render: (r) => <Change value={r.market_return_3y} /> },
    { label: "5 years, per year", render: (r) => <Change value={r.market_return_5y} /> },
    { label: "Calculated to", render: (r) => formatDate(r.market_return_as_of) },
  ] },
  { title: "Holdings and income", rows: [
    { label: "Number of holdings", render: (r) => r.holdings_count?.toLocaleString("en-GB") ?? MISSING },
    { label: "Trailing 12-month yield", render: (r) => formatPct(r.trailing_yield_pct) },
  ] },
];

const topLines = (items: Exposure[]) =>
  items.length ? (
    <ul>{items.map((x) => <li key={x.label} className="flex justify-between gap-3"><span>{x.label}</span><span>{x.weight_pct.toFixed(1)}%</span></li>)}</ul>
  ) : MISSING;

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ isins?: string }> }) {
  const t = await getT();
  const requested = ((await searchParams).isins ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const { plan, locked } = await currentPlan();
  const limit = PLANS[plan].compare;
  const etfs = await getEtfs(requested.slice(0, limit));
  const cut = locked && requested.length > limit;
  const keys = etfs.map((e) => e.etf_key!);
  const [overlaps, shared, withHoldings] = await Promise.all([
    getOverlaps(keys), getSharedHoldings(keys, 12),
    keys.length ? query<{ etf_key: string }>("select etf_key from public.holdings_summary where etf_key = any($1::text[])", [keys]) : [],
  ]);
  const hasHoldings = new Set(withHoldings.map((w) => w.etf_key));
  const label = (k: string) => { const e = etfs.find((x) => x.etf_key === k)!; return e.ticker ?? e.name; };
  const fees = etfs.map((e) => e.headline_fee_pct).filter((f): f is number => f !== null);
  const lowest = fees.length > 1 ? Math.min(...fees) : null;

  if (etfs.length < 2) {
    return (
      <div>
        <PageTitle title={t("Compare")}>{t("Put 2 to 5 ETFs side by side.")}</PageTitle>
        <p className="max-w-[68ch]">{t("Select at least two ETFs with the plus button in the ")}<Link className="prose-link" href="/screener">{t("screener")}</Link>{t(" or on an ")}<Link className="prose-link" href="/indices">{t("index page")}</Link>{t(", then choose Compare.")}</p>
        <h2 className="mb-2 mt-8 text-[1.3rem]">{t("Or start from a common question")}</h2>
        <ul className="flex flex-col gap-1.5">
          <li><Link className="prose-link" href="/compare?isins=IE00B5BMR087,IE00BFMXXD54,IE00B3YCGJ38">{t("Physical or synthetic S&P 500")}</Link></li>
          <li><Link className="prose-link" href="/compare?isins=IE00B4L5Y983,IE00BK5BQT80">{t("MSCI World or FTSE All-World")}</Link></li>
          <li><Link className="prose-link" href="/compare?isins=IE00BK5BQT80,IE00B3RBWM25">{t("Accumulating or distributing share class of one fund")}</Link></li>
        </ul>
      </div>
    );
  }

  const [exposures, prices] = await Promise.all([
    Promise.all(etfs.map((e) => getExposures(e.fund_key ?? ""))),
    Promise.all(etfs.map((e) => getPriceSeries(e.isin))),
  ]);
  const charted = prices.filter((p): p is NonNullable<typeof p> => Boolean(p));
  const unpriced = etfs.filter((_, i) => !prices[i]);
  const allRenders: Row[] = [
    { label: "Top sectors", render: (r) => topLines(exposures[etfs.indexOf(r)].filter((x) => x.dimension === "sector")) },
    { label: "Top countries", render: (r) => topLines(exposures[etfs.indexOf(r)].filter((x) => x.dimension === "country")) },
  ];

  return (
    <div>
      <PageTitle title={t("Compare")}>{t("A dash means we hold no figure, not that the value is zero. The lowest yearly fee is marked.")}</PageTitle>
      {cut ? <p className="mb-4 max-w-[70ch] rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">{t("Showing the first ")}{limit}{t(" of ")}{requested.length}{t(" ETFs. ")}<Link className="underline" href="/pricing">{t("Premium compares up to 5")}</Link>.</p> : null}
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface" aria-label={t("Attribute")} />
              {etfs.map((e) => (
                <th key={e.etf_key} className="min-w-[11rem] whitespace-normal align-bottom text-ink">
                  <Link href={`/etfs/${e.etf_key}`} className="no-underline hover:underline">{e.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          {[...groups, { title: "Allocation", rows: allRenders }].map((group) => (
            <tbody key={group.title}>
              <tr><th colSpan={etfs.length + 1} className="sticky left-0 bg-surface pt-5 text-left text-[1.05rem] text-ink">{group.title}</th></tr>
              {group.rows.map((row) => (
                <tr key={row.label}>
                  <td className="sticky left-0 z-10 min-w-[8rem] bg-surface text-muted">{row.label}</td>
                  {etfs.map((e) => <td key={e.etf_key} className={row.label === "Yearly fee" && lowest !== null && e.headline_fee_pct === lowest ? "bg-sunken font-semibold" : undefined}>{row.render(e)}</td>)}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {etfs.length >= 2 ? (
        <section className="mt-10">
          <h2 className="mb-2 text-[1.3rem]">{t("Overlap")}</h2>
          {hasHoldings.size >= 2 ? (
            <>
              <p className="mb-4 max-w-[72ch] text-muted">{t("How much of two funds is the same investment: for every security both hold, we add the smaller of the two weights. 100% means identical funds, so owning both adds little.")}</p>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {keys.flatMap((a, i) => keys.slice(i + 1).map((b) => [a, b] as const)).filter(([a, b]) => hasHoldings.has(a) && hasHoldings.has(b)).map(([a, b]) => {
                  const o = overlaps.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
                  const pct = Math.min(100, o?.overlap_pct ?? 0);
                  return (
                    <li key={`${a}-${b}`} className="panel p-4">
                      <p className="data text-[0.9rem] text-muted">{label(a)}{t(" and ")}{label(b)}</p>
                      <p className="stat-value mt-1">{pct.toFixed(0)}%</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-pine" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-2 text-[0.85rem] text-muted">{o?.shared ?? 0}{t(" shared holdings")}</p>
                    </li>
                  );
                })}
              </ul>
              {shared.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="table-data">
                    <thead><tr><th>{t("Largest shared holdings")}</th>{keys.filter((k) => hasHoldings.has(k)).map((k) => <th key={k} className="num">{label(k)}</th>)}</tr></thead>
                    <tbody>
                      {shared.map((h) => (
                        <tr key={h.name}><td>{h.name}</td>{keys.filter((k) => hasHoldings.has(k)).map((k) => <td key={k} className="num">{h.weights[k] !== undefined ? `${Number(h.weights[k]).toFixed(2)}%` : MISSING}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {hasHoldings.size < keys.length ? <p className="mt-3 text-[0.85rem] text-muted">{t("No holdings file on record for ")}{keys.filter((k) => !hasHoldings.has(k)).map(label).join(", ")}{t(", so it is left out.")}</p> : null}
              <p className="mt-3 max-w-[72ch] text-[0.85rem] text-muted">{t("Based on issuers' holdings files. Securities are matched by ISIN, or by ticker and name where the file has no ISIN, so a few matches can be missed.")}</p>
            </>
          ) : (
            <p className="max-w-[72ch] text-muted">{t("Overlap needs a holdings file for at least two of these funds. We hold them for iShares and State Street funds so far")}{hasHoldings.size ? `, here only for ${[...hasHoldings].map(label).join(", ")}` : ""}.</p>
          )}
        </section>
      ) : null}

      <section className="mt-10 max-w-5xl">
        <h2 className="mb-3 text-[1.3rem]">{t("Price history")}</h2>
        {charted.length ? (
          <>
            <PriceChart series={charted.map((s) => ({ label: s.ticker, currency: s.currency, points: s.points }))} />
            <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
              {t("Monthly market closes from ")}{charted[0].source}{t(", in each listing's trading currency: ")}{charted.map((s) => `${s.ticker} in ${s.currency}`).join(", ")}{t(". With several funds, the chart starts when all of them have data.")}
              {unpriced.length ? ` No price history yet for: ${unpriced.map((e) => e.ticker ?? e.isin).join(", ")}.` : ""}
            </p>
          </>
        ) : <p className="max-w-[68ch] text-muted">{t("We have no price history for these ETFs yet.")}</p>}
      </section>
    </div>
  );
}
