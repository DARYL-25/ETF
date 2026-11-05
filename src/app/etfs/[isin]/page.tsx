import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuerLogo } from "@/components/issuer-logo";
import { SaveToWatchlist } from "@/components/my-lists";
import { CompareToggle } from "@/components/compare-tray";
import { AsOf, Change, EtfName, Fee } from "@/components/etf-bits";
import { FeeRuler } from "@/components/fee-ruler";
import { PriceChart } from "@/components/price-chart";
import { getBondMetrics, getEtf, getExposures, getFeePoints, getListings, getPriceSeries, getSimilarEtfs, getTopHoldings, type EtfRow } from "@/lib/etfs/queries";
import { MISSING, assetClassLabel, countryName, distributionLabel, formatDate, formatMoney, formatPct, frequencyLabel, productLabel, replicationLabel, styleLabel, yesNoUnknown } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ isin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getEtf((await params).isin);
  return { title: row?.name ?? "ETF not found" };
}

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {items.map(([term, value]) => (
        <div key={term} className="flex justify-between gap-4 border-b border-line py-2">
          <dt className="text-muted">{term}</dt>
          <dd className="data text-right">{value ?? MISSING}</dd>
        </div>
      ))}
    </dl>
  );
}

function Bars({ rows }: { rows: { label: string; weight_pct: number }[] }) {
  const top = Math.max(...rows.map((r) => r.weight_pct));
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.label} className="py-1.5">
          <div className="flex justify-between gap-3"><span>{r.label}</span><span className="data">{r.weight_pct.toFixed(2)}%</span></div>
          <div className="mt-1 h-1.5 bg-sunken"><div className="h-full bg-pine" style={{ width: `${(r.weight_pct / top) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="mb-3 text-[1.5rem]">{title}</h2>
      {children}
    </section>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="max-w-[68ch] text-muted">{children}</p>;

function BasicRecord({ row }: { row: EtfRow }) {
  return (
    <article className="flex max-w-4xl flex-col gap-6">
      <header>
        <div className="mb-3"><IssuerLogo name={row.name} /></div>
        <h1 className="max-w-[30ch] text-[clamp(1.9rem,3.4vw,2.8rem)]">{row.name}</h1>
        <p className="data mt-2">{[row.ticker, row.isin].filter(Boolean).join(", ")}</p>
        <div className="mt-4 flex flex-wrap gap-2"><CompareToggle isin={row.etf_key!} wide /><SaveToWatchlist etfKey={row.etf_key!} /></div>
      </header>
      <p className="max-w-[68ch] rounded bg-warn-bg px-3 py-2 text-warn-ink">
        {row.headline_fee_pct !== null || row.fund_aum !== null
          ? "Identity comes from an official list, and the figures below were read automatically from the issuer. No person has checked them, so confirm them in the issuer's factsheet."
          : "This is a basic record from an official list. It confirms that the ETF exists and where it is identified. Fees, holdings and returns are not loaded for it yet, so check the issuer's factsheet."}
      </p>
      <Facts items={[
        ["ISIN", row.isin ?? MISSING],
        ["Yearly fee", <Fee key="f" row={row} />],
        ["Fee date", row.ter_as_of ? `Filed ${formatDate(row.ter_as_of)}` : MISSING],
        [row.aum_level === "share_class" ? "Share class size" : "Fund size", formatMoney(row.fund_aum ?? row.class_aum, row.fund_aum_currency ?? row.class_aum_currency)],
        ["Size date", formatDate(row.fund_aum_as_of)],
        ["Index, inferred from its name", row.index_slug ? <Link key="i" className="prose-link" href={`/indices/${row.index_slug}`}>{row.index_name}</Link> : MISSING],
        ["Labels, inferred from its name", row.category_slugs.length ? row.category_slugs.join(", ").replaceAll("-", " ") : MISSING],
        ["Income", distributionLabel(row.distribution_policy)],
        ["NAV", row.nav !== null ? `${row.nav.toFixed(2)} ${row.nav_currency} on ${formatDate(row.nav_as_of)}` : MISSING],
        ["NAV return, 1 year", <Change key="1" value={row.nav_return_1y} />],
        ["NAV return, 3 years per year", <Change key="3" value={row.nav_return_3y} />],
        ["NAV return, 5 years per year", <Change key="5" value={row.nav_return_5y} />],
        ["Returns calculated to", formatDate(row.nav_return_as_of)],
        ["Volatility, 3 years", row.volatility_3y ? formatPct(row.volatility_3y) : MISSING],
        ["Tracking error, 3 years", row.tracking_error_3y ? formatPct(row.tracking_error_3y) : MISSING],
        ["Ticker", row.ticker ? `${row.ticker}${row.ticker_exchange ? ` (${row.ticker_exchange})` : ""}` : MISSING],
        ["Issuer legal entity", row.issuer_name],
        ["Issuer's registered country", countryName(row.domicile)],
        ["Currency on the list", row.currency ?? MISSING],
        ["Trading venues on the list", row.venues ? String(row.venues) : MISSING],
        ["UCITS in its name", row.ucits ? "Yes" : MISSING],
        ["Asset class, inferred from its name", assetClassLabel(row.asset_class)],
        ["Source", row.source_url ? <a key="s" className="prose-link" href={row.source_url} rel="noreferrer" target="_blank">Official list</a> : MISSING],
        ["Read on", formatDate(row.source_retrieved_on)],
      ]} />
    </article>
  );
}

export default async function EtfPage({ params }: Props) {
  const row = await getEtf((await params).isin);
  if (!row) notFound();
  if (!row.fund_key) return <BasicRecord row={row} />;
  const fundKey = row.fund_key;
  const isin = row.isin!;

  const [listings, exposures, bond, series, similar, feePoints, topHoldings] = await Promise.all([
    getListings(isin), getExposures(fundKey), getBondMetrics(fundKey), getPriceSeries(isin), getSimilarEtfs(row), getFeePoints(), getTopHoldings(fundKey),
  ]);
  const sectors = exposures.filter((x) => x.dimension === "sector");
  const countries = exposures.filter((x) => x.dimension === "country");
  const metric = (name: string) => bond.find((b) => b.metric === name);
  const retrieved = row.source_retrieved_on;

  return (
    <article className="flex max-w-6xl flex-col gap-10">
      <header>
        <div className="flex items-center gap-2.5"><IssuerLogo name={row.name} /><p className="text-muted">{row.issuer_name}</p></div>
        <h1 className="mt-1 max-w-[30ch] text-[clamp(1.9rem,3.4vw,2.8rem)]">{row.name}</h1>
        <p className="data mt-2">{row.ticker ?? MISSING} on {listings.find((l) => l.is_display_ticker)?.exchange_name ?? MISSING}, ISIN {row.isin}</p>
        <div className="mt-4 flex flex-wrap gap-2"><CompareToggle isin={isin} wide /><SaveToWatchlist etfKey={isin} /><Link className="btn btn-quiet" href={`/assistant?q=${encodeURIComponent(`Find ETFs similar to ${row.name}`)}`}>Ask AI</Link></div>
        {row.verification === "extracted_unreviewed" ? (
          <p className="mt-4 max-w-[68ch] rounded bg-warn-bg px-3 py-2 text-warn-ink">
            These figures were read automatically from the issuer&apos;s {row.source_kind === "issuer_factsheet" ? "factsheet" : "website"} and have not yet been checked by a person.{" "}
            <a className="underline" href={row.source_url} rel="noreferrer" target="_blank">Open the source</a>.
          </p>
        ) : null}
      </header>

      <Section id="overview" title="Overview">
        <Facts items={[
          ["Tracks", row.index_slug ? <Link className="prose-link" href={`/indices/${row.index_slug}`}>{row.index_name}</Link> : MISSING],
          ["Benchmark as published", row.benchmark_as_published ?? MISSING],
          ["Yearly fee", <Fee key="fee" row={row} />],
          ["Fund size", formatMoney(row.fund_aum, row.fund_aum_currency)],
          ["Asset class", assetClassLabel(row.asset_class)],
          ["Product type", productLabel(row.product_type)],
          ["Approach", styleLabel(row.management_style)],
          ["Replication", replicationLabel(row.replication)],
          ["Income", distributionLabel(row.distribution_policy)],
          ["Payment frequency", row.distribution_policy === "distributing" ? frequencyLabel(row.distribution_frequency) : "Not applicable"],
          ["Domicile", countryName(row.domicile)],
          ["UCITS", yesNoUnknown(row.ucits)],
          ["Fund launched", formatDate(row.fund_launch_date)],
          ["Share class launched", formatDate(row.share_class_launch_date)],
          ["Share class currency", row.currency ?? MISSING],
          ["Currency hedged", yesNoUnknown(row.hedged)],
        ]} />
        <p className="mt-2 max-w-[68ch] text-[0.85rem] text-muted">Share class currency is the fund&apos;s accounting currency for this class. It is not your currency risk, which comes from what the fund holds.</p>
      </Section>

      <Section id="chart" title="Price history">
        {series ? (
          <>
            <PriceChart series={[{ label: `${series.ticker} (${series.currency})`, currency: series.currency, points: series.points }]} />
            <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
              Market price of {series.ticker} on {series.exchange}, one point per month, last point {formatDate(series.points.at(-1)!.date)}. Not NAV, and delayed. Source: {series.source}.
            </p>
          </>
        ) : (
          <Note>We have no price history for this ETF yet. Prices are loaded only from a data provider we can name, so this space stays empty until then.</Note>
        )}
      </Section>

      <Section id="performance" title="Historical performance">
        {row.nav_return_1y !== null ? (
          <div className="mb-5">
            <Facts items={[
              ["1 year", <Change key="1" value={row.nav_return_1y} />],
              ["3 years, per year", <Change key="3" value={row.nav_return_3y} />],
              ["5 years, per year", <Change key="5" value={row.nav_return_5y} />],
              ["Since launch, per year", <Change key="s" value={row.nav_return_si} />],
              ["Latest NAV", row.nav !== null ? `${row.nav.toFixed(2)} ${row.nav_currency} on ${formatDate(row.nav_as_of)}` : MISSING],
            ]} />
            <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
              Official NAV returns in {row.nav_currency ?? row.currency ?? "the fund's currency"}, income reinvested, to {formatDate(row.nav_return_as_of)}.{" "}
              <a className="prose-link" href={row.nav_return_source_url ?? "#"} target="_blank" rel="noreferrer">Issuer factsheet</a>. Past performance does not predict future returns.
            </p>
          </div>
        ) : null}
        {row.market_return_1y !== null ? (
          <>
            <Facts items={[
              ["1 year", <Change key="1" value={row.market_return_1y} />],
              ["3 years, per year", <Change key="3" value={row.market_return_3y} />],
              ["5 years, per year", <Change key="5" value={row.market_return_5y} />],
            ]} />
            <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
              Change in market price between monthly closes, to {formatDate(row.market_return_as_of)}, in the trading currency above. This fund reinvests income, so price captures dividends after fund costs, but this is not an official NAV total return. Past performance does not predict future returns.
            </p>
          </>
        ) : row.nav_return_1y === null ? <Note>No performance figures loaded for this ETF yet.</Note> : null}
      </Section>

      <Section id="risk" title="Risk metrics">
        <Note>Volatility, drawdown, Sharpe, tracking difference and tracking error need daily NAV and benchmark data, which we have not licensed yet. They are not estimated here.</Note>
      </Section>

      <Section id="fees" title="Fees">
        <Facts items={[
          ["TER", row.ter_pct !== null ? <span key="t">{formatPct(row.ter_pct)}</span> : "Not published on the source"],
          ["OCF", row.ocf_pct !== null ? <span key="o">{formatPct(row.ocf_pct)}</span> : "Not published on the source"],
          ["Transaction costs", MISSING],
          ["Performance fee", MISSING],
        ]} />
        <p className="mb-5 mt-2"><AsOf date={row.ter_as_of ?? row.ocf_as_of} retrieved={retrieved} /></p>
        {row.headline_fee_pct !== null ? <FeeRuler points={feePoints} highlight={isin} /> : null}
      </Section>

      <Section id="holdings" title="Holdings">
        <Facts items={[
          ["Number of holdings", row.holdings_count?.toLocaleString("en-GB") ?? MISSING],
          ...(metric("effective_duration") ? [["Effective duration", `${metric("effective_duration")!.value.toFixed(2)} years`] as [string, string]] : []),
          ...(metric("weighted_avg_maturity") ? [["Weighted average maturity", `${metric("weighted_avg_maturity")!.value.toFixed(2)} years`] as [string, string]] : []),
          ...(metric("yield_to_maturity") ? [["Yield to maturity", formatPct(metric("yield_to_maturity")!.value)] as [string, string]] : []),
        ]} />
        <p className="mt-2"><AsOf date={row.holdings_as_of} retrieved={retrieved} /></p>
        {topHoldings.length ? (
          <div className="mt-4 max-w-xl">
            <h3 className="mb-1 text-[1.1rem]">Largest holdings</h3>
            <Bars rows={topHoldings.map((h) => ({ label: h.name, weight_pct: h.weight_pct }))} />
            <p className="mt-1"><AsOf date={topHoldings[0].as_of} /></p>
          </div>
        ) : null}
        <p className="mt-2 max-w-[68ch] text-muted">Full holdings lists are not loaded yet.</p>
      </Section>

      <div className="grid gap-10 md:grid-cols-2">
        <Section id="sectors" title="Sector allocation">
          {sectors.length ? (
            <>
              <Bars rows={sectors} />
              <p className="mt-1"><AsOf date={sectors[0].as_of} retrieved={sectors[0].observed_on} /></p>
              <p className="text-[0.85rem] text-muted">Largest {sectors.length} only.</p>
            </>
          ) : <Note>The source did not give a sector breakdown.</Note>}
        </Section>
        <Section id="countries" title="Geographic allocation">
          {countries.length ? (
            <>
              <Bars rows={countries} />
              <p className="mt-1"><AsOf date={countries[0].as_of} retrieved={countries[0].observed_on} /></p>
              <p className="text-[0.85rem] text-muted">Largest {countries.length} only.</p>
            </>
          ) : <Note>The source did not give a country breakdown.</Note>}
        </Section>
      </div>

      <Section id="distributions" title="Distribution history">
        <Facts items={[
          ["Income", distributionLabel(row.distribution_policy)],
          ["Trailing 12-month yield", row.trailing_yield_pct !== null ? formatPct(row.trailing_yield_pct) : MISSING],
        ]} />
        {row.trailing_yield_pct !== null ? <p className="mt-2"><AsOf date={row.trailing_yield_as_of} retrieved={retrieved} /></p> : null}
        <p className="mt-2 max-w-[68ch] text-muted">Payment history by date is not loaded yet.</p>
      </Section>

      <Section id="listings" title="Where it trades">
        <p className="mb-2 max-w-[68ch] text-muted">These are listings of one share class, not separate ETFs. The trading currency is how you pay for it on that exchange.</p>
        <div className="overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>Exchange</th><th>Ticker</th><th>Trading currency</th></tr></thead>
            <tbody>
              {listings.map((l) => (
                <tr key={`${l.exchange_mic}-${l.ticker}`}><td>{l.exchange_name}</td><td className="data">{l.ticker}</td><td>{l.trading_currency ?? MISSING}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.85rem] text-muted">European exchanges only, so far.</p>
      </Section>

      <Section id="tax" title="Tax information">
        <Note>
          Tax depends on where you live. The facts that tend to matter are above: domicile ({countryName(row.domicile)}), income treatment ({distributionLabel(row.distribution_policy).toLowerCase()}) and what the fund holds.
          We show no tax rates or conclusions until country rules have been checked against official sources.
        </Note>
      </Section>

      <Section id="documents" title="Documents and sources">
        <Facts items={[
          ["Source used", <a key="s" className="prose-link" href={row.source_url} rel="noreferrer" target="_blank">{row.source_kind === "issuer_factsheet" ? "Issuer factsheet" : "Issuer website"}</a>],
          ["Read on", formatDate(retrieved)],
          ["Fund size date", row.fund_aum_as_of ? formatDate(row.fund_aum_as_of) : "Not published"],
          ["Review status", row.verification === "reviewed" ? "Checked by a person" : "Not yet checked by a person"],
        ]} />
        <p className="mt-2"><AsOf date={row.fund_aum_as_of} retrieved={retrieved} /></p>
        <p className="mt-2 max-w-[68ch] text-muted">Before investing, read the fund&apos;s KID and prospectus from the issuer. Direct links are not loaded yet.</p>
      </Section>

      {similar.length ? (
        <Section id="similar" title="Similar ETFs">
          <div className="overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>ETF</th><th>Index</th><th className="num">Yearly fee</th><th className="num">Fund size</th></tr></thead>
              <tbody>
                {similar.map((s) => (
                  <tr key={s.isin}>
                    <td className="min-w-[14rem]"><EtfName row={s} /></td>
                    <td className="min-w-[9rem]">{s.index_name ?? MISSING}</td>
                    <td className="num"><Fee row={s} /></td>
                    <td className="num whitespace-nowrap">{formatMoney(s.fund_aum, s.fund_aum_currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </article>
  );
}
