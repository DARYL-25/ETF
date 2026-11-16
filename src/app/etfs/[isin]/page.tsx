import { getT } from "@/lib/i18n/server";
import { themeBySlug } from "@/lib/etfs/themes";
import { Mosaic } from "@/components/mosaic";
import { SectionNav } from "@/components/section-nav";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuerLogo } from "@/components/issuer-logo";
import { SaveToWatchlist } from "@/components/my-lists";
import { CompareToggle } from "@/components/compare-tray";
import { AsOf, Change, EtfName, Fee } from "@/components/etf-bits";
import { FeeRuler } from "@/components/fee-ruler";
import { PriceChart } from "@/components/price-chart";
import { getBondMetrics, getDailyPoints, getEtf, getExposures, getFeePoints, getListings, getPriceSeries, getSimilarEtfs, getTopHoldings, type EtfRow } from "@/lib/etfs/queries";
import { getLens } from "@/lib/lens-server";
import { CostCalculator } from "@/components/cost-calculator";
import { getBreakdown, getHoldingsSummary, getTopHoldingsFull } from "@/lib/etfs/holdings";
import { TAX_CHECKED_ON, taxCountry, taxNotes } from "@/lib/tax/content";
import { MISSING, exchangeName, assetClassLabel, countryName, distributionLabel, formatDate, formatMoney, formatPct, frequencyLabel, productLabel, replicationLabel, styleLabel, yesNoUnknown } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ isin: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getEtf((await params).isin);
  if (!row) return { title: "ETF not found" };
  const facts = [
    row.ticker ? `Ticker ${row.ticker}` : null, row.isin ? `ISIN ${row.isin}` : null,
    row.headline_fee_pct !== null ? `yearly fee ${row.headline_fee_pct.toFixed(2)}%` : null,
    row.index_name ? `tracks ${row.index_name}` : null,
  ].filter(Boolean).join(", ");
  return {
    title: [row.name, row.ticker].filter(Boolean).join(" "),
    description: `${row.name}: ${facts}. Fees, size, holdings and returns with their source and date.`.slice(0, 300),
    alternates: { canonical: `/etfs/${row.etf_key}` },
  };
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
    <ul data-reveal>
      {rows.map((r, i) => (
        <li key={r.label} className="py-1.5">
          <div className="flex justify-between gap-3"><span>{r.label}</span><span className="data">{r.weight_pct.toFixed(2)}%</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="bar-fill h-full rounded-full bg-pine" style={{ width: `${(r.weight_pct / top) * 100}%`, "--i": i } as React.CSSProperties} /></div>
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-nav className="scroll-mt-32">
      <h2 className="mb-3 text-[1.3rem]">{title}</h2>
      {children}
    </section>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="max-w-[68ch] text-muted">{children}</p>;

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.85rem] text-muted">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {note ? <p className="mt-1 text-[0.82rem] text-muted">{note}</p> : null}
    </div>
  );
}

async function LensCard({ row }: { row: EtfRow }) {
  const t = await getT();
  const lens = await getLens();
  const country = taxCountry(lens?.code);
  if (!lens) {
    return (
      <section className="panel p-4">
        <h2 className="text-[1.05rem]">{t("Where do you live?")}</h2>
        <p className="mt-1.5 text-muted">{t("Choose your country at the top of the page, and this panel shows what matters there for this fund. Tax notes cover Switzerland and France so far.")}</p>
      </section>
    );
  }
  if (!country) {
    return (
      <section className="panel p-4">
        <h2 className="text-[1.05rem]">{t("For an investor in ")}{countryName(lens.code, t.lang)}</h2>
        <ul className="mt-2 space-y-1.5">
          <li>{row.ucits ? t("UCITS fund, the kind brokers in Europe can generally offer to private investors.") : lens.code === "US" ? t("Check that your broker offers this fund.") : t("Not marked UCITS, so check that your broker can offer it to you.")}</li>
          <li>{t("Fund currency {fund}. Your home currency is {home}.", { fund: row.currency ?? t("not known"), home: lens.currency })}</li>
        </ul>
        <p className="mt-2 text-[0.85rem] text-muted">{t("Tax notes are written for Switzerland and France so far.")}</p>
      </section>
    );
  }
  const notes = taxNotes(row, country.code);
  return (
    <section className="panel p-4" id="tax">
      <h2 className="text-[1.05rem]">{t("For an investor in ")}{countryName(country.code, t.lang)}</h2>
      <ul className="mt-2.5 space-y-2.5">
        {notes.map((n) => (
          <li key={n.text} className="flex gap-2.5">
            <span aria-hidden className={`mt-[0.55rem] size-1.5 flex-none rounded-full ${n.kind === "fact" ? "bg-pine" : "bg-saffron"}`} />
            <span>{t(n.text, n.vars)}{n.source ? <> <a className="prose-link text-[0.85rem]" href={n.source.url} target="_blank" rel="noreferrer" title={n.source.label}>{t("Source")}</a></> : null}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.85rem] text-muted">{t("General rules read from official sources on ")}{formatDate(TAX_CHECKED_ON, t.lang)}{t(". No tax adviser has reviewed them, and they are not advice for your situation. ")}<Link className="prose-link" href={`/tax/${country.slug}`}>{t("All notes for {country}", { country: countryName(country.code, t.lang) })}</Link></p>
    </section>
  );
}

export default async function EtfPage({ params }: Props) {
  const t = await getT();
  const row = await getEtf((await params).isin);
  if (!row) notFound();
  const researched = Boolean(row.fund_key);
  const key = row.etf_key ?? row.isin!;
  const isin = row.isin;

  const [listings, exposures, bond, series, similar, feePoints, topHoldings, daily] = await Promise.all([
    researched ? getListings(isin!) : [], researched ? getExposures(row.fund_key!) : [], researched ? getBondMetrics(row.fund_key!) : [],
    researched ? getPriceSeries(isin) : null, getSimilarEtfs(row), researched ? getFeePoints() : [], researched ? getTopHoldings(row.fund_key!) : [], getDailyPoints(key),
  ]);
  const full = await getHoldingsSummary(row.etf_key ?? key);
  const [fullTop, fullSectors, fullCountries] = full ? await Promise.all([getTopHoldingsFull(full.etf_key, 64), getBreakdown(full.etf_key, "sector"), getBreakdown(full.etf_key, "country")]) : [[], [], []];
  const sectors = exposures.filter((x) => x.dimension === "sector");
  const countries = exposures.filter((x) => x.dimension === "country");
  const metric = (name: string) => bond.find((b) => b.metric === name);
  const retrieved = row.source_retrieved_on;
  const size = row.fund_aum ?? row.class_aum;
  const sizeCurrency = row.fund_aum_currency ?? row.class_aum_currency;
  const sizeIsClass = row.aum_level === "share_class" || (row.fund_aum === null && row.class_aum !== null);
  const returnCurrency = row.nav_currency ?? row.currency;
  const exchange = listings.find((l) => l.is_display_ticker)?.exchange_name ?? exchangeName(row.ticker_exchange);
  const kind = daily.at(-1)?.kind === "close" ? t("closing price") : t("NAV");
  const inferred = researched ? "" : t(", inferred from its name");
  const sameIndexFees = similar.filter((x) => x.index_slug && x.index_slug === row.index_slug && x.headline_fee_pct !== null).map((x) => x.headline_fee_pct!);
  const cheapest = sameIndexFees.length ? Math.min(...sameIndexFees) : null;
  const lensCurrency = (await getLens())?.currency ?? "EUR";

  return (
    <article className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "InvestmentFund", name: row.name, identifier: row.isin ?? row.ticker ?? key,
        ...(row.ticker ? { tickerSymbol: row.ticker } : {}), ...(row.issuer_name && row.issuer_name !== "Not identified" ? { provider: { "@type": "Organization", name: row.issuer_name } } : {}),
        ...(row.headline_fee_pct !== null ? { feesAndCommissionsSpecification: `Yearly fee ${row.headline_fee_pct.toFixed(2)}%` } : {}),
      }).replace(/</g, "\\u003c") }} />
      <header>
        <div className="flex items-center gap-2.5"><IssuerLogo name={row.name} /><p className="text-muted">{row.issuer_name === "Not identified" ? t("Issuer not identified") : row.issuer_name}</p></div>
        <h1 className="mt-2 max-w-[32ch] text-[clamp(1.8rem,3.2vw,2.6rem)]">{row.name}</h1>
        <p className="data mt-2 text-muted">{[row.ticker ? `${row.ticker}${exchange ? ` on ${exchange}` : ""}` : null, isin ? `ISIN ${isin}` : null].filter(Boolean).join(", ") || MISSING}</p>
        <div className="mt-4 flex flex-wrap gap-2"><CompareToggle isin={key} wide /><SaveToWatchlist etfKey={key} /><Link className="btn btn-quiet" href={`/assistant?q=${encodeURIComponent(`Find ETFs similar to ${row.name}`)}`}>{t("Find similar")}</Link></div>
      </header>

      <section className="panel grid grid-cols-2 gap-x-6 gap-y-5 p-5 lg:grid-cols-4" aria-label={t("Key figures")}>
        <Stat label={t("Yearly fee")} value={<Fee row={row} />} note={row.ter_as_of ?? row.ocf_as_of ? t("As of {date}", { date: formatDate(row.ter_as_of ?? row.ocf_as_of, t.lang) }) : row.headline_fee_pct === null ? t("No fee on file yet") : undefined} />
        <Stat label={sizeIsClass ? t("Share class size") : t("Fund size")} value={formatMoney(size, sizeCurrency, t.lang)} note={row.fund_aum_as_of ?? row.class_aum_as_of ? t("As of {date}", { date: formatDate(row.fund_aum_as_of ?? row.class_aum_as_of, t.lang) }) : undefined} />
        <Stat label={t("NAV return, 1 year")} value={<Change value={row.nav_return_1y} />} note={row.nav_return_1y !== null ? t("In {currency}, to {date}", { currency: returnCurrency ?? t("the fund's currency"), date: formatDate(row.nav_return_as_of, t.lang) }) : t("Not loaded yet")} />
        <Stat label={t("Latest NAV")} value={row.nav !== null ? <>{row.nav.toFixed(2)} <span className="text-[0.6em] font-medium text-muted">{row.nav_currency}</span></> : MISSING} note={row.nav_as_of ? t("On {date}", { date: formatDate(row.nav_as_of, t.lang) }) : undefined} />
      </section>

      {row.verification !== "reviewed" ? (
        <p className="max-w-[76ch] rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">
          {researched
            ? <>{t("These figures were read automatically from the issuer's ")}{row.source_kind === "issuer_factsheet" ? t("factsheet") : t("website")}{t(" and have not yet been checked by a person.")}{" "}</>
            : row.headline_fee_pct !== null || size !== null
              ? <>{t("This ETF's identity comes from an official list, and its figures were read automatically from the issuer. No person has checked them yet.")}{" "}</>
              : <>{t("This is a basic record from an official list. It confirms that the ETF exists. Fees and returns are not loaded for it yet.")}{" "}</>}
          {row.source_url ? <a className="underline" href={row.source_url} rel="noreferrer" target="_blank">{t("Open the source")}</a> : null}
        </p>
      ) : null}

      <SectionNav name={row.name} figure={row.headline_fee_pct !== null ? `${row.headline_fee_pct.toFixed(2)}%` : null} label={t("Sections of this page")} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-10">
          <Section id="chart" title={t("Price history")}>
            {series ? (
              <>
                <PriceChart series={[{ label: `${series.ticker} (${series.currency})`, currency: series.currency, points: series.points }]} />
                <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">{t("Market price of ")}{series.ticker}{t(" on ")}{series.exchange}{t(", one point per month, last point ")}{formatDate(series.points.at(-1)!.date, t.lang)}{t(". Not NAV, and delayed. Source: ")}{series.source}.</p>
              </>
            ) : daily.length >= 5 ? (
              <>
                <PriceChart series={[{ label: `${row.ticker ?? "NAV"} (${daily.at(-1)!.currency ?? ""})`, currency: daily.at(-1)!.currency, points: daily.map((d) => ({ date: d.date, close: d.value })) }]} />
                <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">{t("Daily ")}{kind}{t(" from ")}{daily.at(-1)!.source}{t(", collected by us since ")}{formatDate(daily[0].date, t.lang)}{t(". Last point ")}{formatDate(daily.at(-1)!.date, t.lang)}{t(". End of day, never real time.")}</p>
              </>
            ) : daily.length ? (
              <Note>{t("We started collecting this fund's daily {kind} on {date}, and hold {n} so far. A chart appears once there are five.", { kind, date: formatDate(daily[0].date, t.lang), n: daily.length === 1 ? t("1 point") : t("{n} points", { n: daily.length }) })}</Note>
            ) : (
              <Note>{t("We have no price history for this ETF yet. Prices are loaded only from a source we can name, so this space stays empty until then.")}</Note>
            )}
          </Section>

          {row.nav_return_1y !== null || row.market_return_1y !== null ? (
            <Section id="performance" title={t("Performance")}>
              {row.nav_return_1y !== null ? (
                <>
                  <Facts items={[
                    ["1 year", <Change key="1" value={row.nav_return_1y} />],
                    ["3 years, per year", <Change key="3" value={row.nav_return_3y} />],
                    ["5 years, per year", <Change key="5" value={row.nav_return_5y} />],
                    [t("Since launch, per year"), <Change key="s" value={row.nav_return_si} />],
                    ...(row.volatility_3y ? [[t("Volatility, 3 years"), formatPct(row.volatility_3y)] as [string, string]] : []),
                    ...(row.tracking_error_3y ? [[t("Tracking error, 3 years"), formatPct(row.tracking_error_3y)] as [string, string]] : []),
                  ]} />
                  <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">
                    {t("Official NAV returns in ")}{returnCurrency ?? t("the fund's currency")}{t(", income reinvested, to ")}{formatDate(row.nav_return_as_of, t.lang)}{t(". Funds report in different currencies and to different dates, so compare like with like.")}{" "}
                    {row.nav_return_source_url ? <a className="prose-link" href={row.nav_return_source_url} target="_blank" rel="noreferrer">{t("Issuer source")}</a> : null}{t(" Past performance does not predict future returns.")}
                  </p>
                </>
              ) : null}
              {row.market_return_1y !== null ? (
                <div className="mt-5">
                  <Facts items={[
                    [t("Market price, 1 year"), <Change key="1" value={row.market_return_1y} />],
                    [t("Market price, 3 years per year"), <Change key="3" value={row.market_return_3y} />],
                    [t("Market price, 5 years per year"), <Change key="5" value={row.market_return_5y} />],
                  ]} />
                  <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">{t("Change in market price between monthly closes, to ")}{formatDate(row.market_return_as_of, t.lang)}{t(". Not an official NAV total return.")}</p>
                </div>
              ) : null}
            </Section>
          ) : null}

          <Section id="overview" title={t("Fund facts")}>
            <Facts items={[
              [t("Index") + inferred, row.index_slug ? <Link className="prose-link" href={`/indices/${row.index_slug}`}>{row.index_name}</Link> : MISSING],
              [t("Benchmark as published"), row.benchmark_as_published ?? MISSING],
              [t("Asset class") + inferred, t(assetClassLabel(row.asset_class))],
              [t("Replication"), t(replicationLabel(row.replication))],
              [t("Income"), t(distributionLabel(row.distribution_policy))],
              [t("Payment frequency"), row.distribution_policy === "distributing" ? t(frequencyLabel(row.distribution_frequency)) : row.distribution_policy ? t("Not applicable") : MISSING],
              [researched ? t("Domicile") : t("Domicile, or issuer's country"), countryName(row.domicile, t.lang)],
              [t("UCITS"), researched ? t(yesNoUnknown(row.ucits)) : row.ucits ? t("Yes, by its name") : MISSING],
              [t("Fund launched"), formatDate(row.fund_launch_date, t.lang)],
              [t("Share class currency"), row.currency ?? MISSING],
              [t("Currency hedged"), t(yesNoUnknown(row.hedged))],
              ...(researched ? [[t("Product type"), t(productLabel(row.product_type))] as [string, string], [t("Approach"), t(styleLabel(row.management_style))] as [string, string], [t("Share class launched"), formatDate(row.share_class_launch_date, t.lang)] as [string, string]] : []),
              ...(!researched ? [[t("Trading venues on official lists"), row.venues ? String(row.venues) : MISSING] as [string, React.ReactNode], [t("Labels, inferred from its name"), row.category_slugs.length ? <span className="flex flex-wrap gap-x-2.5 gap-y-0.5">{row.category_slugs.map((slug) => { const theme = themeBySlug(slug); return theme ? <Link key={slug} className="prose-link" href={`/themes/${slug}`}>{t(theme.label)}</Link> : <span key={slug}>{slug.replaceAll("-", " ")}</span>; })}</span> : MISSING] as [string, React.ReactNode]] : []),
            ]} />
            <p className="mt-2 max-w-[68ch] text-[0.85rem] text-muted">{t("Share class currency is the fund's accounting currency for this class. It is not your currency risk, which comes from what the fund holds.")}</p>
          </Section>

          {row.headline_fee_pct !== null ? (
            <Section id="fees" title={t("Fees")}>
              {researched ? (
                <>
                  <Facts items={[
                    [t("TER"), row.ter_pct !== null ? <span key="t">{formatPct(row.ter_pct)}</span> : t("Not published on the source")],
                    [t("OCF"), row.ocf_pct !== null ? <span key="o">{formatPct(row.ocf_pct)}</span> : t("Not published on the source")],
                  ]} />
                  <p className="mb-5 mt-2"><AsOf date={row.ter_as_of ?? row.ocf_as_of} retrieved={retrieved} /></p>
                </>
              ) : null}
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <CostCalculator feePct={row.headline_fee_pct} cheapestPct={cheapest} currency={lensCurrency} />
                {researched ? <div className="min-w-0"><FeeRuler points={feePoints} highlight={isin!} /></div> : row.index_slug ? <p className="text-muted">{cheapest !== null && cheapest < row.headline_fee_pct ? t("Funds on the same index charge from {fee} a year.", { fee: formatPct(cheapest) }) : t("No fund on the same index charges less, among those with a fee on file.")} <Link className="prose-link" href={`/indices/${row.index_slug}`}>{t("See how they actually compared")}</Link></p> : null}
              </div>
            </Section>
          ) : researched ? (
            <Section id="fees" title={t("Fees")}>
              <Facts items={[[t("TER"), t("Not published on the source")], [t("OCF"), t("Not published on the source")]]} />
            </Section>
          ) : null}

          {full ? (
            <Section id="holdings" title={t("What it holds")}>
              <p className="mb-4 max-w-[72ch] text-muted">{full.as_of ? t("{n} holdings on {date}, from {source}'s holdings file.", { n: full.n_holdings.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB"), date: formatDate(full.as_of, t.lang), source: full.source }) : t("{n} holdings, from {source}'s holdings file.", { n: full.n_holdings.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB"), source: full.source })}{full.kept < full.n_holdings ? t(" We keep the largest {n}, which make up {pct}% of the fund.", { n: full.kept, pct: full.covered_pct.toFixed(1) }) : ""}</p>
              <Mosaic items={fullTop} label={t("Largest holdings of {name}", { name: row.name })} restLabel={(pct) => t("{n} more holdings, {pct}%", { n: Math.max(0, full.n_holdings - fullTop.length).toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB"), pct })} />
              <p className="mb-6 mt-2 text-[0.85rem] text-muted">{t("Each tile is one holding, sized by its share of the fund. Select one to see every ETF that owns it.")}</p>
              <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-[1.05rem]">{t("Largest holdings")}</h3>
                  <ul data-reveal>
                    {fullTop.slice(0, 10).map((h, i) => (
                      <li key={h.holding_key} className="py-1.5">
                        <div className="flex justify-between gap-3"><Link className="no-underline hover:text-pine" href={`/holdings?key=${encodeURIComponent(h.holding_key)}`}>{h.name}</Link><span className="data">{h.weight_pct.toFixed(2)}%</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="bar-fill h-full rounded-full bg-pine" style={{ width: `${Math.min(100, (h.weight_pct / (fullTop[0]?.weight_pct || 1)) * 100)}%`, "--i": i } as React.CSSProperties} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
                {fullSectors.length > 1 ? <div><h3 className="mb-1 text-[1.05rem]">{t("Sectors")}</h3><Bars rows={fullSectors.map((x) => ({ label: x.label, weight_pct: x.weight_pct }))} /></div> : null}
                {fullCountries.length > 1 ? <div><h3 className="mb-1 text-[1.05rem]">{t("Countries")}</h3><Bars rows={fullCountries.map((x) => ({ label: x.label, weight_pct: x.weight_pct }))} /></div> : null}
              </div>
              <p className="mt-4 flex flex-wrap gap-2"><Link className="btn btn-quiet" href={`/compare?isins=${key}`}>{t("Check overlap with another ETF")}</Link>{full.source_url ? <a className="btn btn-quiet" href={full.source_url} target="_blank" rel="noreferrer">{t("Issuer page")}</a> : null}</p>
            </Section>
          ) : null}

          {!full && researched && (row.holdings_count !== null || topHoldings.length || bond.length) ? (
            <Section id="holdings" title={t("Holdings")}>
              <Facts items={[
                [t("Number of holdings"), row.holdings_count?.toLocaleString("en-GB") ?? MISSING],
                ...(metric("effective_duration") ? [[t("Effective duration"), t("{n} years", { n: metric("effective_duration")!.value.toFixed(2) })] as [string, string]] : []),
                ...(metric("weighted_avg_maturity") ? [[t("Weighted average maturity"), t("{n} years", { n: metric("weighted_avg_maturity")!.value.toFixed(2) })] as [string, string]] : []),
                ...(metric("yield_to_maturity") ? [[t("Yield to maturity"), formatPct(metric("yield_to_maturity")!.value)] as [string, string]] : []),
                ...(row.trailing_yield_pct !== null ? [[t("Trailing 12-month yield"), formatPct(row.trailing_yield_pct)] as [string, string]] : []),
              ]} />
              <p className="mt-2"><AsOf date={row.holdings_as_of} retrieved={retrieved} /></p>
              {topHoldings.length ? (
                <div className="mt-4 max-w-xl">
                  <h3 className="mb-1 text-[1.05rem]">{t("Largest holdings")}</h3>
                  <Bars rows={topHoldings.map((h) => ({ label: h.name, weight_pct: h.weight_pct }))} />
                  <p className="mt-1"><AsOf date={topHoldings[0].as_of} /></p>
                </div>
              ) : null}
            </Section>
          ) : null}

          {!full && (sectors.length || countries.length) ? (
            <div className="grid gap-10 md:grid-cols-2">
              {sectors.length ? (
                <Section id="sectors" title={t("Sectors")}>
                  <Bars rows={sectors} />
                  <p className="mt-1"><AsOf date={sectors[0].as_of} retrieved={sectors[0].observed_on} /></p>
                  <p className="text-[0.85rem] text-muted">{t("Largest ")}{sectors.length}{t(" only.")}</p>
                </Section>
              ) : null}
              {countries.length ? (
                <Section id="countries" title={t("Countries")}>
                  <Bars rows={countries} />
                  <p className="mt-1"><AsOf date={countries[0].as_of} retrieved={countries[0].observed_on} /></p>
                  <p className="text-[0.85rem] text-muted">{t("Largest ")}{countries.length}{t(" only.")}</p>
                </Section>
              ) : null}
            </div>
          ) : null}

          {listings.length ? (
            <Section id="listings" title={t("Where it trades")}>
              <p className="mb-2 max-w-[68ch] text-muted">{t("These are listings of one share class, not separate ETFs. The trading currency is how you pay for it on that exchange.")}</p>
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("Exchange")}</th><th>{t("Ticker")}</th><th>{t("Trading currency")}</th></tr></thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={`${l.exchange_mic}-${l.ticker}`}><td>{l.exchange_name}</td><td className="data">{l.ticker}</td><td>{l.trading_currency ?? MISSING}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}

          {similar.length ? (
            <Section id="similar" title={t("Similar ETFs")}>
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("ETF")}</th><th>{t("Index")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th></tr></thead>
                  <tbody>
                    {similar.map((s) => (
                      <tr key={s.etf_key ?? s.isin}>
                        <td className="min-w-[14rem]"><EtfName row={s} /></td>
                        <td className="min-w-[9rem]">{s.index_name ?? MISSING}</td>
                        <td className="num"><Fee row={s} /></td>
                        <td className="num whitespace-nowrap">{formatMoney(s.fund_aum ?? s.class_aum, s.fund_aum_currency ?? s.class_aum_currency, t.lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-20">
          <LensCard row={row} />
          <section className="panel p-4" id="documents">
            <h2 className="text-[1.05rem]">{t("Where these figures come from")}</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Source")}</dt><dd className="text-right">{row.source_url ? <a className="prose-link" href={row.source_url} rel="noreferrer" target="_blank">{researched ? (row.source_kind === "issuer_factsheet" ? t("Issuer factsheet") : t("Issuer website")) : row.headline_fee_pct !== null ? t("Issuer or regulator file") : t("Official list")}</a> : MISSING}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Read on")}</dt><dd className="data">{formatDate(retrieved, t.lang)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Checked by a person")}</dt><dd>{row.verification === "reviewed" ? t("Yes") : t("Not yet")}</dd></div>
            </dl>
            <p className="mt-2"><AsOf date={row.fund_aum_as_of ?? row.class_aum_as_of ?? row.ter_as_of} retrieved={retrieved} /></p>
            <p className="mt-2 text-[0.85rem] text-muted">{t("Read the fund's KID and prospectus from the issuer before investing. ")}<Link href="/data" className="prose-link">{t("How we update data")}</Link></p>
          </section>
        </aside>
      </div>
    </article>
  );
}
