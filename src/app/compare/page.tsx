import type { Metadata } from "next";
import Link from "next/link";
import { Change, Fee, PageTitle } from "@/components/etf-bits";
import { PriceChart } from "@/components/price-chart";
import { getEtfs, getExposures, getPriceSeries, type EtfRow, type Exposure } from "@/lib/etfs/queries";
import { MISSING, assetClassLabel, countryName, distributionLabel, formatDate, formatMoney, formatPct, replicationLabel, styleLabel, yesNoUnknown } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF Comparison" };

type Row = { label: string; render: (r: EtfRow) => React.ReactNode };

const groups: { title: string; rows: Row[] }[] = [
  { title: "General", rows: [
    { label: "Issuer", render: (r) => r.issuer_name },
    { label: "ISIN", render: (r) => r.isin },
    { label: "Ticker", render: (r) => r.ticker ?? MISSING },
    { label: "Index", render: (r) => r.index_name ?? MISSING },
    { label: "Asset class", render: (r) => assetClassLabel(r.asset_class) },
    { label: "Domicile", render: (r) => countryName(r.domicile) },
    { label: "Share class launched", render: (r) => formatDate(r.share_class_launch_date) },
    { label: "Fund size", render: (r) => formatMoney(r.fund_aum, r.fund_aum_currency) },
    { label: "Fund size date", render: (r) => r.fund_aum ? (r.fund_aum_as_of ? formatDate(r.fund_aum_as_of) : "Not published") : MISSING },
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
  const requested = ((await searchParams).isins ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const etfs = await getEtfs(requested);

  if (etfs.length < 2) {
    return (
      <div>
        <PageTitle title="ETF Comparison">Compare 2 to 5 ETFs side by side.</PageTitle>
        <p className="max-w-[68ch]">Select at least two ETFs with the plus button in the <Link className="prose-link" href="/screener">screener</Link> or on an <Link className="prose-link" href="/indices">index page</Link>, then choose Compare.</p>
        <h2 className="mb-2 mt-8 text-[1.3rem]">Or start from a common question</h2>
        <ul className="flex flex-col gap-1.5">
          <li><Link className="prose-link" href="/compare?isins=IE00B5BMR087,IE00BFMXXD54,IE00B3YCGJ38">Physical or synthetic S&amp;P 500</Link></li>
          <li><Link className="prose-link" href="/compare?isins=IE00B4L5Y983,IE00BK5BQT80">MSCI World or FTSE All-World</Link></li>
          <li><Link className="prose-link" href="/compare?isins=IE00BK5BQT80,IE00B3RBWM25">Accumulating or distributing share class of one fund</Link></li>
        </ul>
      </div>
    );
  }

  const [exposures, prices] = await Promise.all([
    Promise.all(etfs.map((e) => getExposures(e.fund_key))),
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
      <PageTitle title="ETF Comparison">A dash means we have no verified figure, not that the value is zero. Holdings overlap needs full holdings lists, which are not loaded yet.</PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-paper" aria-label="Attribute" />
              {etfs.map((e) => (
                <th key={e.isin} className="min-w-[11rem] whitespace-normal align-bottom text-ink">
                  <Link href={`/etfs/${e.isin}`} className="no-underline hover:underline">{e.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          {[...groups, { title: "Allocation", rows: allRenders }].map((group) => (
            <tbody key={group.title}>
              <tr><th colSpan={etfs.length + 1} className="sticky left-0 bg-paper pt-5 text-left text-[1.05rem] text-ink">{group.title}</th></tr>
              {group.rows.map((row) => (
                <tr key={row.label}>
                  <td className="sticky left-0 z-10 min-w-[8rem] bg-paper text-muted">{row.label}</td>
                  {etfs.map((e) => <td key={e.isin}>{row.render(e)}</td>)}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <section className="mt-10 max-w-5xl">
        <h2 className="mb-3 text-[1.5rem]">Price history</h2>
        {charted.length ? (
          <>
            <PriceChart series={charted.map((s) => ({ label: s.ticker, currency: s.currency, points: s.points }))} />
            <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
              Monthly market closes from {charted[0].source}, in each listing&apos;s trading currency: {charted.map((s) => `${s.ticker} in ${s.currency}`).join(", ")}. With several funds, the chart starts when all of them have data.
              {unpriced.length ? ` No price history yet for: ${unpriced.map((e) => e.ticker ?? e.isin).join(", ")}.` : ""}
            </p>
          </>
        ) : <p className="max-w-[68ch] text-muted">We have no price history for these ETFs yet.</p>}
      </section>
    </div>
  );
}
