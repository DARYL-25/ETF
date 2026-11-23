import { alternatesFor, getT } from "@/lib/i18n/server";
import { themeBySlug } from "@/lib/etfs/themes";
import { Mosaic } from "@/components/mosaic";
import { SectionNav } from "@/components/section-nav";
import { ExposurePanel } from "@/components/exposure-panel";
import { QuadrantChart } from "@/components/quadrant-chart";
import { indexQuadrant, quadrantOf, themeQuadrant } from "@/lib/etfs/quadrants";
import { currencies as currencyMix, normalise } from "@/lib/geo/exposure";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuerLogo } from "@/components/issuer-logo";
import { SaveToWatchlist } from "@/components/my-lists";
import { CompareToggle } from "@/components/compare-tray";
import { AsOf, Change, EtfName, Fee } from "@/components/etf-bits";
import { FeeRuler } from "@/components/fee-ruler";
import { PriceChart } from "@/components/price-chart";
import { getBondMetrics, getDailyPoints, getEtf, getExposures, getFeePoints, getListings, getPriceSeries, getSimilarEtfs, getFigureSources, getTopHoldings, type EtfRow } from "@/lib/etfs/queries";
import { getLens } from "@/lib/lens-server";
import { CostCalculator } from "@/components/cost-calculator";
import { getBreakdown, getFactsheetExposure, getHoldingsSummary, getTopHoldingsFull } from "@/lib/etfs/holdings";
import { TAX_CHECKED_ON, taxCountry, taxNotes } from "@/lib/tax/content";
import { envelopeFit } from "@/lib/tax/envelopes";
import { peerFacts } from "@/lib/etfs/peers";
import { cheaperOnSameIndex } from "@/lib/etfs/alternatives";
import { QualityPanel } from "@/components/quality-panel";
import { peerPosition } from "@/lib/etfs/stats";
import { assessEtf } from "@/lib/etfs/assess";
import { fundExposures } from "@/lib/etfs/portfolio-data";
import { replicationAdvice, isEuropeanIndex } from "@/lib/tax/replication";
import { DEFAULT_YIELD } from "@/lib/tax/drag";
import { ProsCons } from "@/components/pros-cons";
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
    alternates: await alternatesFor(`/etfs/${row.etf_key}`),
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
    <section id={id} data-nav className="panel scroll-mt-32 p-5 sm:p-6">
      <h2 className="mb-4 text-[1.2rem] tracking-[-0.025em]">{title}</h2>
      {children}
    </section>
  );
}

async function QualityCard({ quality }: { quality: Awaited<ReturnType<typeof peerFacts>>["quality"] }) {
  const t = await getT();
  return (
    <section aria-labelledby="score-card" className="panel-navy flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between"><h2 id="score-card" className="text-[1.1rem] tracking-[-0.02em] text-white">{t("Quality score")}</h2><a href="#quality" className="text-[0.8rem] font-semibold text-ice no-underline hover:text-white">{t("Details")} →</a></div>
      {quality.score !== null ? (
        <div className="flex items-baseline gap-2"><span className="font-display text-[4rem] font-extrabold leading-none tracking-[-0.05em]" data-count={Math.round(quality.score)}>{quality.score.toFixed(0)}</span><span className="text-ice">/ 100</span>{quality.grade ? <span className="ml-auto rounded-full bg-pine px-3 py-1 font-display font-bold text-white">{quality.grade}</span> : null}</div>
      ) : <p className="text-ice">{t("Not enough data to score this fund.")}</p>}
      <ul className="flex flex-col gap-2.5 text-[0.9rem]" data-reveal>
        {quality.parts.map((p, i) => (
          <li key={p.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between"><span className="text-ice">{t(p.label)}</span><span className="data">{p.score === null ? "—" : p.score.toFixed(0)}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="bar-fill h-full rounded-full bg-pine" style={{ width: `${p.score ?? 0}%`, "--i": i } as React.CSSProperties} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="max-w-[68ch] text-muted">{children}</p>;

function FactTile({ label, value, note, small = false }: { label: string; value: React.ReactNode; note?: React.ReactNode; small?: boolean }) {
  return (
    <div className="fact-tile min-w-0">
      <p className="text-[0.8rem] text-muted">{label}</p>
      <p className={`font-display mt-1 font-bold tracking-[-0.02em] ${small ? "text-[1.05rem] leading-snug" : "text-[1.35rem]"}`}>{value}</p>
      {note ? <p className="mt-1 text-[0.75rem] text-muted">{note}</p> : null}
    </div>
  );
}

async function LensCard({ row }: { row: EtfRow }) {
  const t = await getT();
  const lens = await getLens();
  const country = taxCountry(lens?.code);
  if (!lens) {
    return (
      <section className="panel p-5">
        <h2 className="text-[1.05rem]">{t("Where do you live?")}</h2>
        <p className="mt-1.5 text-muted">{t("Choose your country at the top of the page, and this panel shows what matters there for this fund. Tax notes cover eleven European countries so far.")}</p>
      </section>
    );
  }
  if (!country) {
    return (
      <section className="panel p-5">
        <h2 className="text-[1.05rem]">{t("For an investor in ")}{countryName(lens.code, t.lang)}</h2>
        <ul className="mt-2 space-y-1.5">
          <li>{row.ucits ? t("UCITS fund, the kind brokers in Europe can generally offer to private investors.") : lens.code === "US" ? t("Check that your broker offers this fund.") : t("Not marked UCITS, so check that your broker can offer it to you.")}</li>
          <li>{t("Fund currency {fund}. Your home currency is {home}.", { fund: row.currency ?? t("not known"), home: lens.currency })}</li>
        </ul>
        <p className="mt-2 text-[0.85rem] text-muted">{t("Tax notes cover Switzerland, France, the United Kingdom, Germany, Ireland, Belgium, Spain, Italy and Austria so far.")}</p>
      </section>
    );
  }
  const notes = taxNotes(row, country.code);
  return (
    <section className="panel p-5" id="tax">
      <h2 className="text-[1.05rem]">{t("For an investor in ")}{countryName(country.code, t.lang)}</h2>
      <ul className="mt-2.5 space-y-2.5">
        {notes.map((n) => (
          <li key={n.text} className="flex gap-2.5">
            <span aria-hidden className={`mt-[0.55rem] size-1.5 flex-none rounded-full ${n.kind === "fact" ? "bg-pine" : "bg-saffron"}`} />
            <span>{t(n.text, n.vars)}{n.source ? <> <a className="prose-link text-[0.85rem]" href={n.source.url} target="_blank" rel="noreferrer" title={n.source.label}>{t("Source")}</a></> : null}</span>
          </li>
        ))}
      </ul>
      {envelopeFit(row, country.code).length ? (
        <>
          <h3 className="mt-4 font-semibold">{t("Which account it fits")}</h3>
          <ul className="mt-1.5 space-y-1.5">
            {envelopeFit(row, country.code).map((e) => (
              <li key={e.envelope} className="flex items-start justify-between gap-3">
                <span>{t(e.envelope)}<span className="block text-[0.82rem] text-muted">{t(e.reason)}</span></span>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[0.8rem] ${e.status === "yes" ? "bg-pine text-pine-ink" : e.status === "no" ? "bg-down/10 text-down" : "bg-sunken text-muted"}`}>{e.status === "yes" ? t("Yes") : e.status === "no" ? t("No") : e.status === "likely" ? t("Likely") : t("To check")}</span>
              </li>
            ))}
          </ul>
          {country.code === "FR" ? <p className="mt-1.5 text-[0.85rem]"><Link className="prose-link" href="/tax/envelopes">{t("Compare the French accounts")}</Link></p> : null}
        </>
      ) : null}
      <p className="mt-3 text-[0.85rem] text-muted">{t("General rules read from official sources on ")}{formatDate(country.readOn ?? TAX_CHECKED_ON, t.lang)}{t(". No tax adviser has reviewed them, and they are not advice for your situation. ")}<Link className="prose-link" href={`/tax/${country.slug}`}>{t("All notes for {country}", { country: countryName(country.code, t.lang) })}</Link></p>
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

  const [listings, exposures, bond, series, similar, feePoints, topHoldings, daily, facts, cheaper] = await Promise.all([
    researched ? getListings(isin!) : [], researched ? getExposures(row.fund_key!) : [], researched ? getBondMetrics(row.fund_key!) : [],
    researched ? getPriceSeries(isin) : null, getSimilarEtfs(row), researched ? getFeePoints() : [], researched ? getTopHoldings(row.fund_key!) : [], getDailyPoints(key),
    peerFacts(row), cheaperOnSameIndex([row], 4),
  ]);
  const [peers, exposure, lensNow] = await Promise.all([peerPosition(row), fundExposures([{ key, name: row.name }]), getLens()]);
  const usShare = exposure[0]?.us_pct ?? null;
  // Share of peers this fund charges less than, among those with a fee: rank 1 of 10 beats 90%.
  const feeBeats = peers && peers.feeRank !== null && peers.group.withFee >= 4 ? Math.round(((peers.group.withFee - peers.feeRank) / (peers.group.withFee - 1)) * 100) : null;
  const assessment = assessEtf(row, peers, { country: lensNow?.code ?? null, usSharePct: usShare });
  const replication = row.asset_class === "equity" || !row.asset_class ? replicationAdvice({ usSharePct: usShare ?? (row.index_slug === "sp-500" || row.index_slug === "nasdaq-100" ? 100 : null), european: isEuropeanIndex(row), account: null, yieldPct: row.trailing_yield_pct ?? DEFAULT_YIELD.equity }) : null;
  const full = await getHoldingsSummary(row.etf_key ?? key);
  const [fullTop, fullSectors, fullCountries] = full ? await Promise.all([getTopHoldingsFull(full.etf_key, 64), getBreakdown(full.etf_key, "sector"), getBreakdown(full.etf_key, "country")]) : [[], [], []];
  const sectors = exposures.filter((x) => x.dimension === "sector");
  const countries = exposures.filter((x) => x.dimension === "country");
  // A factsheet's printed country and sector split beats one rebuilt from its top ten holdings.
  const partial = !full || full.covered_pct < 60;
  const [sheetCountries, sheetSectors] = partial ? await Promise.all([getFactsheetExposure(row.etf_key ?? key, "country"), getFactsheetExposure(row.etf_key ?? key, "sector")]) : [[], []];
  const pick = (sheet: { label: string; weight_pct: number }[], fromHoldings: { label: string; weight_pct: number }[], researched: { label: string; weight_pct: number }[]) =>
    (sheet.length ? sheet : full ? fromHoldings : researched).map((x) => ({ label: x.label, weight_pct: x.weight_pct }));
  const exposureCountries = pick(sheetCountries, fullCountries, countries);
  const exposureSectors = pick(sheetSectors, fullSectors, sectors);
  const exposureData = exposureCountries.length || exposureSectors.length > 1 ? {
    countries: normalise(exposureCountries), sectors: normalise(exposureSectors), currencies: currencyMix(exposureCountries),
    note: full ? t("From the {n} largest holdings in the issuer's file, {pct}% of the fund, rescaled to 100%. Currencies are those the shares are priced in.", { n: full.kept, pct: full.covered_pct.toFixed(0) }) : t("From the issuer's published breakdown, largest lines only, rescaled to 100%."),
  } : null;
  const theme = row.category_slugs.find((c) => themeBySlug(c)?.kind === "theme") ?? row.category_slugs.find((c) => themeBySlug(c));
  const quadrant = row.index_slug ? await indexQuadrant(row.index_slug) : theme ? await themeQuadrant(theme) : null;
  const where = quadrant ? quadrantOf(quadrant, key) : null;
  const quadrantSentence = !quadrant ? "" : where === "large-cheap" ? t("Among the {n} funds on {group}, this one is both larger and cheaper than the median: the corner you want.", { n: quadrant.points.length, group: t(quadrant.label) })
    : where === "large-dear" ? t("Among the {n} funds on {group}, this one is larger than the median but charges more than it.", { n: quadrant.points.length, group: t(quadrant.label) })
    : where === "small-cheap" ? t("Among the {n} funds on {group}, this one is cheaper than the median but smaller, so it may trade on wider spreads.", { n: quadrant.points.length, group: t(quadrant.label) })
    : where === "small-dear" ? t("Among the {n} funds on {group}, this one is both smaller and dearer than the median.", { n: quadrant.points.length, group: t(quadrant.label) })
    : t("Where the {n} funds on {group} sit by fee and size. This fund has no size on file, so it is not drawn.", { n: quadrant.points.length, group: t(quadrant.label) });
  const metric = (name: string) => bond.find((b) => b.metric === name);
  const retrieved = row.source_retrieved_on;
  const figureSources = researched ? { fee: null, size: null } : await getFigureSources(row.etf_key ?? null);
  const sizeSource = figureSources.size;
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
  const lastDaily = daily.at(-1);
  const prevDaily = daily.at(-2);
  const lastPrice = lastDaily
    ? { value: lastDaily.value, currency: lastDaily.currency ?? "", label: t("{kind} on {date}", { kind: kind, date: formatDate(lastDaily.date, t.lang) }) }
    : row.nav !== null ? { value: row.nav, currency: row.nav_currency ?? "", label: t("NAV on {date}", { date: formatDate(row.nav_as_of, t.lang) }) } : null;
  const priceChange = lastDaily && prevDaily && prevDaily.value > 0 ? (lastDaily.value / prevDaily.value - 1) * 100 : null;

  return (
    <article className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "InvestmentFund", name: row.name, identifier: row.isin ?? row.ticker ?? key,
        ...(row.ticker ? { tickerSymbol: row.ticker } : {}), ...(row.issuer_name && row.issuer_name !== "Not identified" ? { provider: { "@type": "Organization", name: row.issuer_name } } : {}),
        ...(row.headline_fee_pct !== null ? { feesAndCommissionsSpecification: `Yearly fee ${row.headline_fee_pct.toFixed(2)}%` } : {}),
      }).replace(/</g, "\\u003c") }} />
      <nav aria-label={t("Breadcrumb")} className="text-[0.85rem] text-muted"><Link href="/" className="no-underline hover:text-pine">{t("Home")}</Link> / <Link href="/screener" className="no-underline hover:text-pine">{t("Screener")}</Link> / <span className="text-ink">{row.ticker ?? isin ?? row.name}</span></nav>
      <header className="rise flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 max-w-[52rem] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {row.ticker ? <span className="ticker-badge">{row.ticker}</span> : null}
            {row.ucits ? <span className="badge">UCITS</span> : null}
            {row.distribution_policy ? <span className="badge">{t(distributionLabel(row.distribution_policy))}</span> : null}
            {row.domicile ? <span className="badge">{countryName(row.domicile, t.lang)}</span> : null}
            {row.hedged ? <span className="badge">{t("Currency hedged")}</span> : null}
            {feeBeats !== null && feeBeats >= 75 ? <span className="badge border-pine text-pine-deep">{t("Among the cheapest in its group")}</span> : feeBeats !== null && feeBeats <= 25 ? <span className="badge">{t("Among the dearest in its group")}</span> : null}
          </div>
          <h1 className="text-[clamp(1.9rem,3.8vw,3rem)] tracking-[-0.04em]">{row.name}</h1>
          <div className="flex items-center gap-2.5 text-muted"><IssuerLogo name={row.name} /><span>{row.issuer_name === "Not identified" ? t("Issuer not identified") : row.issuer_name}</span><span aria-hidden>·</span><span className="data">{[row.ticker ? `${row.ticker}${exchange ? ` ${t("on")} ${exchange}` : ""}` : null, isin ? `ISIN ${isin}` : null].filter(Boolean).join(", ") || MISSING}</span></div>
          {lastPrice ? (
            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <span className="font-display text-[2.25rem] font-bold tracking-[-0.03em]">{lastPrice.value.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[0.55em] font-semibold text-muted">{lastPrice.currency}</span></span>
              {priceChange !== null ? <span className={`font-semibold ${priceChange >= 0 ? "text-up" : "text-down"}`}>{priceChange >= 0 ? "+" : "−"}{Math.abs(priceChange).toFixed(2)}%</span> : null}
              <span className="text-[0.82rem] text-muted">{lastPrice.label}</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2.5"><SaveToWatchlist etfKey={key} /><CompareToggle isin={key} wide /><Link className="btn btn-primary" href={`/assistant?q=${encodeURIComponent(`Find ETFs similar to ${row.name}`)}`}>{t("Find similar")}</Link></div>
      </header>

      <section className="panel p-5 sm:p-6" aria-label={t("Key figures")}>
        <h2 className="mb-4 text-[1.2rem] tracking-[-0.025em]">{t("Key facts")}</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-3">
          <FactTile label={t("Yearly fee")} value={<Fee row={row} />} note={row.ter_as_of ?? row.ocf_as_of ? t("As of {date}", { date: formatDate(row.ter_as_of ?? row.ocf_as_of, t.lang) }) : row.headline_fee_pct === null ? t("No fee on file yet") : undefined} />
          <FactTile label={sizeIsClass ? t("Share class size") : t("Fund size")} value={formatMoney(size, sizeCurrency, t.lang)} note={row.fund_aum_as_of ?? row.class_aum_as_of ? t("As of {date}", { date: formatDate(row.fund_aum_as_of ?? row.class_aum_as_of, t.lang) }) : undefined} />
          <FactTile label={t("NAV return, 1 year")} value={<Change value={row.nav_return_1y} />} note={row.nav_return_1y !== null ? t("In {currency}, to {date}", { currency: returnCurrency ?? t("the fund's currency"), date: formatDate(row.nav_return_as_of, t.lang) }) : t("Not loaded yet")} />
          <FactTile label={t("Index")} value={row.index_slug ? <Link className="no-underline hover:text-pine" href={`/indices/${row.index_slug}`}>{row.index_name}</Link> : row.index_name ?? MISSING} small />
          <FactTile label={t("Fund launched")} value={row.fund_launch_date ? row.fund_launch_date.slice(0, 4) : MISSING} />
          <FactTile label={t("Replication")} value={t(replicationLabel(row.replication))} small />
          {row.tracking_error_3y ? <FactTile label={t("Tracking error, 3 years")} value={formatPct(row.tracking_error_3y)} note={t("How much its return wandered from the index")} /> : facts.trackingBeyondFeePct !== null ? <FactTile label={t("Tracking beyond the fee")} value={`${facts.trackingBeyondFeePct >= 0 ? "+" : "−"}${Math.abs(facts.trackingBeyondFeePct).toFixed(2)}%`} note={t("Measured against the best fund on its index, 1 year")} /> : null}
          {feeBeats !== null ? <FactTile label={t("Fee against its peers")} value={t("Cheaper than {pct}%", { pct: feeBeats })} note={t("of {n} funds on {group}", { n: peers!.group.withFee, group: t(peers!.group.label) })} small /> : null}
          {figureSources.sri ? <FactTile label={t("Risk class (KID)")} value={`${figureSources.sri} / 7`} note={figureSources.kid_url ? <a className="prose-link" href={figureSources.kid_url} rel="noreferrer" target="_blank">{t("1 is lowest, 7 highest")}</a> : t("1 is lowest, 7 highest")} /> : null}
          {figureSources.transaction_cost_pct != null ? <FactTile label={t("Transaction costs")} value={formatPct(figureSources.transaction_cost_pct)} note={t("A year, on top of the fee, from the KID")} /> : null}
          <FactTile label={t("Holdings")} value={(full?.n_holdings ?? row.holdings_count)?.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB") ?? MISSING} />
          {row.headline_fee_pct !== null ? <FactTile label={t("On {amount}, the fee is", { amount: formatMoney(10000, lensCurrency, t.lang) })} value={t("{amount} a year", { amount: formatMoney(row.headline_fee_pct * 100, lensCurrency, t.lang) })} small /> : null}
        </div>
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="chart" title={t("Price history")}>
            {series ? (
              <>
                <PriceChart series={[{ label: `${series.ticker} (${series.currency})`, currency: series.currency, points: series.points }]} feePct={row.headline_fee_pct} />
                <p className="mt-2 max-w-[72ch] text-[0.85rem] text-muted">{t("Market price of ")}{series.ticker}{t(" on ")}{series.exchange}{t(", one point per month, last point ")}{formatDate(series.points.at(-1)!.date, t.lang)}{t(". Not NAV, and delayed. Source: ")}{series.source}.</p>
              </>
            ) : daily.length >= 5 ? (
              <>
                <PriceChart series={[{ label: `${row.ticker ?? "NAV"} (${daily.at(-1)!.currency ?? ""})`, currency: daily.at(-1)!.currency, points: daily.map((d) => ({ date: d.date, close: d.value })) }]} feePct={row.headline_fee_pct} />
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
              <div className="max-w-2xl">
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

          {exposureData ? (
            <Section id="exposure" title={t("Where the money goes")}>
              <ExposurePanel data={exposureData} />
            </Section>
          ) : null}

          {quadrant && quadrant.points.length >= 5 ? (
            <Section id="quadrant" title={t("Fee and size against its peers")}>
              <p className="mb-3 max-w-[72ch] text-muted">{quadrantSentence}</p>
              <QuadrantChart q={quadrant} highlight={key} compact />
              <p className="mt-2 text-[0.85rem]"><Link className="prose-link" href={`/quadrants/${quadrant.kind}/${quadrant.slug}`}>{t("Open the full quadrant")}</Link></p>
            </Section>
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

          <Section id="pros-cons" title={t("Strengths and weaknesses")}>
            <ProsCons assessment={assessment} peers={peers} replication={replication} />
          </Section>

          <Section id="quality" title={t("Quality score")}>
            <QualityPanel quality={facts.quality} />
          </Section>

          {cheaper[key]?.length ? (
            <Section id="alternatives" title={t("Cheaper alternatives")}>
              <p className="mb-2 max-w-[68ch] text-muted">{t("Funds on the same index that charge less, with the same income policy and currency hedging. Compare tracking, size and listings too before switching.")}</p>
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("ETF")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Fee difference")}</th><th className="num">{t("Size")}</th></tr></thead>
                  <tbody>
                    {cheaper[key].map((a) => (
                      <tr key={a.key}>
                        <td className="min-w-[14rem]"><Link className="font-medium no-underline hover:underline" href={`/etfs/${a.key}`}>{a.name}</Link>{a.same_fund ? <span className="block text-[0.8rem] text-muted">{t("Another share class of the same fund")}</span> : null}</td>
                        <td className="num">{a.fee_pct.toFixed(2)}%</td>
                        <td className="num">−{(row.headline_fee_pct! - a.fee_pct).toFixed(2)}</td>
                        <td className="num whitespace-nowrap">{formatMoney(a.size_eur, "EUR", t.lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[0.85rem]"><Link className="prose-link" href={`/tools/true-cost?a=${encodeURIComponent(key)}&b=${encodeURIComponent(cheaper[key][0].key)}`}>{t("Compare the true cost of both")}</Link></p>
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

        <aside className="flex flex-col gap-5">
          <QualityCard quality={facts.quality} />
          <LensCard row={row} />
          <section className="panel p-5" id="documents">
            <h2 className="text-[1.05rem]">{t("Where these figures come from")}</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between gap-3"><dt className="text-muted">{t("Source")}</dt><dd className="text-right">{row.source_url ? <a className="prose-link" href={row.source_url} rel="noreferrer" target="_blank">{researched ? (row.source_kind === "issuer_factsheet" ? t("Issuer factsheet") : t("Issuer website")) : row.headline_fee_pct !== null ? t("Issuer or regulator file") : t("Official list")}</a> : MISSING}</dd></div>
              {figureSources.fee ? <div className="flex justify-between gap-3"><dt className="text-muted">{t("Fee")}</dt><dd className="text-right"><a className="prose-link" href={figureSources.fee.url} rel="noreferrer" target="_blank">{figureSources.fee.source}</a></dd></div> : null}
              {sizeSource ? <div className="flex justify-between gap-3"><dt className="text-muted">{t("Fund size")}</dt><dd className="text-right"><a className="prose-link" href={sizeSource.url} rel="noreferrer" target="_blank">{sizeSource.source === "SEC N-PORT" ? t("SEC fund filings (N-PORT)") : sizeSource.source}</a></dd></div> : null}
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
