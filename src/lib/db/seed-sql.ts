import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { cleanName, inferCategories, inferEquity, inferIndex, prettyName, US_INDEX_BY_TICKER } from "../etfs/infer";
import { THEMES, themeBySlug } from "../etfs/themes";
import { brandOf } from "../etfs/brands";
import { z } from "zod";

const money = z.object({ amount: z.number().positive(), currency: z.string().length(3), asOf: z.string().nullable() }).nullable().optional();
const weights = z.object({ asOf: z.string().nullable(), weights: z.record(z.string(), z.number()) }).optional();
const source = z.object({ kind: z.enum(["issuer_website", "issuer_factsheet"]), url: z.url() });
const listing = z.tuple([z.string(), z.string(), z.string().nullable()]).rest(z.string());

const shareClass = z.object({
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  name: z.string(),
  currency: z.string().nullable(),
  distribution: z.enum(["accumulating", "distributing", "no_income"]),
  frequency: z.string().optional(),
  hedged: z.boolean().optional(),
  launchDate: z.string().nullable(),
  source: source.optional(),
  fees: z.object({ ter: z.number().optional(), ocf: z.number().optional() }),
  aum: money,
  yield: z.object({ value: z.number(), asOf: z.string().nullable() }).optional(),
  listings: z.array(listing).min(1),
});

const fund = z.object({
  key: z.string(),
  name: z.string(),
  issuer: z.string(),
  source,
  productType: z.enum(["etf", "etc", "etn"]),
  ucits: z.boolean().nullable(),
  legalStructure: z.string().optional(),
  domicile: z.string().nullable(),
  launchDate: z.string().nullable(),
  baseCurrency: z.string().nullable(),
  assetClass: z.string(),
  style: z.string(),
  replication: z.string(),
  index: z.string(),
  benchmarkAsPublished: z.string().nullable(),
  categories: z.array(z.string()),
  aum: money,
  holdings: z.object({ count: z.number(), asOf: z.string().nullable() }).optional(),
  sectors: weights,
  countries: weights,
  bond: z.object({ asOf: z.string(), duration: z.number(), maturity: z.number(), ytm: z.number() }).optional(),
  feesAsOf: z.string().optional(),
  shareClasses: z.array(shareClass).min(1),
});

export const fundsFile = z.object({ retrievedOn: z.string(), note: z.string(), funds: z.array(fund) });
const referenceFile = z.object({
  issuers: z.array(z.object({ slug: z.string(), name: z.string(), website: z.string() })),
  exchanges: z.array(z.object({ mic: z.string(), name: z.string(), country: z.string() })),
  categories: z.array(z.object({ slug: z.string(), kind: z.string(), label: z.string() })),
  indices: z.array(z.object({ slug: z.string(), name: z.string(), provider: z.string(), assetClass: z.string(), geography: z.string(), description: z.string() })),
});

export type PricePoint = { date: string; close: number };

/** Oldest first. Reads the `date,close` format of data/seed/prices. */
export function parsePriceCsv(csv: string): PricePoint[] {
  return csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const [date, close] = line.split(",");
    return { date, close: Number(close) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Price change over `years`, annualised when years > 1, ending at the last complete month.
 * Uses the latest close at or before the start date. Returns null when history is too short.
 */
export function derivedReturn(points: PricePoint[], years: number, endDate: string): number | null {
  const end = points.filter((p) => p.date <= endDate).at(-1);
  if (!end) return null;
  const startLimit = new Date(`${end.date.slice(0, 7)}-28T00:00:00Z`);
  startLimit.setUTCFullYear(startLimit.getUTCFullYear() - years);
  const startMonth = startLimit.toISOString().slice(0, 7);
  const start = points.filter((p) => p.date.slice(0, 7) === startMonth).at(-1);
  if (!start) return null;
  const total = end.close / start.close;
  return (years > 1 ? total ** (1 / years) - 1 : total - 1) * 100;
}

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replaceAll("'", "''")}'`;
};

/** Builds idempotent-free insert SQL for an empty database. Same SQL for local and Supabase. */
/** Public data tables, in an order that is safe to empty together. User tables never reference them. */
export const PUBLIC_DATA_TABLES = ["universe_exposures", "universe_monthly_returns", "holdings", "holdings_summary", "universe_prices", "universe_details", "universe_etfs", "fund_top_holdings", "fund_prices", "fund_exposures", "metric_observations", "share_class_fees", "listings", "share_classes", "fund_categories", "fund_index_relationships", "funds", "categories", "indices", "exchanges", "issuers", "fx_rates", "data_sources"];

/** The seed as separate statements, wrapped in begin and commit. */
export function buildSeedStatements(root: string): string[] {
  const funds = fundsFile.parse(JSON.parse(readFileSync(join(root, "data/seed/funds.json"), "utf8")));
  const reference = referenceFile.parse(JSON.parse(readFileSync(join(root, "data/seed/reference.json"), "utf8")));
  const fx = JSON.parse(readFileSync(join(root, "data/seed/fx.json"), "utf8"));
  const on = funds.retrievedOn;
  const out: string[] = ["-- Generated by scripts/build-seed-sql.ts from data/seed. Do not edit by hand.", "begin;"];

  for (const i of reference.issuers) out.push(`insert into public.issuers (slug, name, website) values (${q(i.slug)}, ${q(i.name)}, ${q(i.website)});`);
  for (const e of reference.exchanges) out.push(`insert into public.exchanges (mic, name, country) values (${q(e.mic)}, ${q(e.name)}, ${q(e.country)});`);
  // Themes are defined in code, with their matching rules. The reference file supplies the remaining categories.
  for (const c of reference.categories) if (!themeBySlug(c.slug)) out.push(`insert into public.categories (slug, kind, label) values (${q(c.slug)}, ${q(c.kind)}, ${q(c.label)});`);
  for (const c of THEMES) out.push(`insert into public.categories (slug, kind, label) values (${q(c.slug)}, ${q(c.kind)}, ${q(c.label)});`);
  for (const x of reference.indices) out.push(`insert into public.indices (slug, name, provider, asset_class, geography, description) values (${q(x.slug)}, ${q(x.name)}, ${q(x.provider)}, ${q(x.assetClass)}, ${q(x.geography)}, ${q(x.description)});`);

  const publisher = new Map(reference.issuers.map((i) => [i.slug, i.name]));
  const seenSources = new Set<string>();
  const addSource = (s: { kind: string; url: string }, issuer: string) => {
    if (seenSources.has(s.url)) return;
    seenSources.add(s.url);
    out.push(`insert into public.data_sources (kind, publisher, url, retrieved_on) values (${q(s.kind)}, ${q(publisher.get(issuer))}, ${q(s.url)}, ${q(on)});`);
  };
  const sourceId = (url: string) => `(select id from public.data_sources where url = ${q(url)})`;
  const fundId = (key: string) => `(select id from public.funds where key = ${q(key)})`;
  const classId = (isin: string) => `(select id from public.share_classes where isin = ${q(isin)})`;
  const verified = "'extracted_unreviewed'";

  for (const f of funds.funds) {
    addSource(f.source, f.issuer);
    const src = sourceId(f.source.url);
    out.push(`insert into public.funds (key, name, legal_structure, issuer_id, product_type, ucits, domicile, launch_date, base_currency, asset_class, management_style, replication, source_id, verification) values (${q(f.key)}, ${q(f.name)}, ${q(f.legalStructure)}, (select id from public.issuers where slug = ${q(f.issuer)}), ${q(f.productType)}, ${q(f.ucits)}, ${q(f.domicile)}, ${q(f.launchDate)}, ${q(f.baseCurrency)}, ${q(f.assetClass)}, ${q(f.style)}, ${q(f.replication)}, ${src}, ${verified});`);
    out.push(`insert into public.fund_index_relationships (fund_id, index_id, benchmark_as_published) values (${fundId(f.key)}, (select id from public.indices where slug = ${q(f.index)}), ${q(f.benchmarkAsPublished)});`);
    for (const c of f.categories) out.push(`insert into public.fund_categories (fund_id, category_id) values (${fundId(f.key)}, (select id from public.categories where slug = ${q(c)}));`);

    const metric = (metricName: string, value: number, unit: string, asOf: string | null, isin: string | null, srcSql: string) =>
      out.push(`insert into public.metric_observations (fund_id, share_class_id, metric, value, unit, as_of, observed_on, source_id, verification) values (${fundId(f.key)}, ${isin ? classId(isin) : "null"}, ${q(metricName)}, ${q(value)}, ${q(unit)}, ${q(asOf)}, ${q(on)}, ${srcSql}, ${verified});`);

    if (f.aum) metric("aum", f.aum.amount, f.aum.currency, f.aum.asOf, null, src);
    if (f.holdings) metric("holdings_count", f.holdings.count, "count", f.holdings.asOf, null, src);
    if (f.bond) {
      metric("effective_duration", f.bond.duration, "years", f.bond.asOf, null, src);
      metric("weighted_avg_maturity", f.bond.maturity, "years", f.bond.asOf, null, src);
      metric("yield_to_maturity", f.bond.ytm, "percent", f.bond.asOf, null, src);
    }
    for (const [dimension, block] of [["sector", f.sectors], ["country", f.countries]] as const) {
      if (!block) continue;
      for (const [label, weight] of Object.entries(block.weights)) {
        out.push(`insert into public.fund_exposures (fund_id, dimension, label, weight_pct, as_of, observed_on, source_id) values (${fundId(f.key)}, ${q(dimension)}, ${q(label)}, ${q(weight)}, ${q(block.asOf)}, ${q(on)}, ${src});`);
      }
    }

    for (const sc of f.shareClasses) {
      const scSource = sc.source ?? f.source;
      addSource(scSource, f.issuer);
      const scSrc = sourceId(scSource.url);
      out.push(`insert into public.share_classes (fund_id, isin, name, currency, distribution_policy, distribution_frequency, hedged, launch_date, source_id, verification) values (${fundId(f.key)}, ${q(sc.isin)}, ${q(sc.name)}, ${q(sc.currency)}, ${q(sc.distribution)}, ${q(sc.frequency)}, ${q(sc.hedged)}, ${q(sc.launchDate)}, ${scSrc}, ${verified});`);
      for (const [feeType, value] of Object.entries(sc.fees)) {
        out.push(`insert into public.share_class_fees (share_class_id, fee_type, value_pct, as_of, observed_on, source_id, verification) values (${classId(sc.isin)}, ${q(feeType)}, ${q(value)}, ${q(f.feesAsOf ?? null)}, ${q(on)}, ${scSrc}, ${verified});`);
      }
      if (sc.aum) metric("aum", sc.aum.amount, sc.aum.currency, sc.aum.asOf, sc.isin, scSrc);
      if (sc.yield) metric("trailing_yield", sc.yield.value, "percent", sc.yield.asOf, sc.isin, scSrc);
      for (const [mic, ticker, currency, flag, symbol] of sc.listings) {
        out.push(`insert into public.listings (share_class_id, exchange_mic, ticker, trading_currency, is_display_ticker, market_data_symbol) values (${classId(sc.isin)}, ${q(mic)}, ${q(ticker)}, ${q(currency)}, ${flag === "P"}, ${q(symbol ?? null)});`);
      }
    }
  }

  // FX for approximate euro comparison of fund sizes.
  out.push(`insert into public.data_sources (kind, publisher, url, retrieved_on) values ('fx_vendor', ${q(fx.publisher)}, ${q(fx.url)}, ${q(fx.retrievedOn)});`);
  // Stored exactly as the ECB publishes them: units of currency per 1 euro.
  for (const [currency, perEuro] of Object.entries(fx.perEuro)) {
    out.push(`insert into public.fx_rates (base_currency, quote_currency, rate, rate_date, source_id) values ('EUR', ${q(currency)}, ${q(perEuro)}, ${q(fx.rateDate)}, ${sourceId(fx.url)});`);
  }

  // Market prices, with returns derived from them.
  // These files are licensed for private use and are not in the repository (docs/DATA_SOURCES.md).
  const pricesDir = join(root, "data/seed/prices");
  const priceFiles = existsSync(pricesDir) ? readdirSync(pricesDir).filter((n) => n.endsWith(".csv")) : [];
  const priceUrl = "https://www.alphavantage.co/documentation/#monthlyadj";
  if (priceFiles.length) {
    out.push(`insert into public.data_sources (kind, publisher, url, retrieved_on, licence_note) values ('market_data_vendor', 'Alpha Vantage', ${q(priceUrl)}, ${q(on)}, 'Free tier: personal, non-commercial use. Replace before public launch.');`);
  }
  const lastCompleteMonth = on.slice(0, 7);
  for (const file of priceFiles) {
    const symbol = file.replace(/\.csv$/, "");
    const owner = funds.funds.flatMap((f) => f.shareClasses.map((sc) => ({ f, sc }))).find(({ sc }) => sc.listings.some((l) => l[4] === symbol));
    if (!owner) throw new Error(`No listing claims price file ${file}`);
    const points = parsePriceCsv(readFileSync(join(pricesDir, file), "utf8"));
    const listingId = `(select id from public.listings where market_data_symbol = ${q(symbol)})`;
    const rows = points.map((p) => `(${listingId}, ${q(p.date)}, 'monthly', 'market_close', ${q(p.close)}, ${sourceId(priceUrl)})`);
    out.push(`insert into public.fund_prices (listing_id, price_date, frequency, price_type, close, source_id) values\n${rows.join(",\n")};`);

    const complete = points.filter((p) => p.date.slice(0, 7) < lastCompleteMonth);
    const end = complete.at(-1)!;
    for (const years of [1, 3, 5]) {
      const value = derivedReturn(complete, years, end.date);
      if (value === null) continue;
      const method = `Change in monthly market close on ${symbol}${years > 1 ? ", annualised" : ""}. Not a NAV or total return figure.`;
      out.push(`insert into public.metric_observations (fund_id, share_class_id, metric, value, unit, as_of, observed_on, source_id, verification, methodology) values (${fundId(owner.f.key)}, ${classId(owner.sc.isin)}, 'market_return_${years}y', ${q(Number(value.toFixed(4)))}, 'percent', ${q(end.date)}, ${q(on)}, ${sourceId(priceUrl)}, 'derived', ${q(method)});`);
    }
  }

  // Official NAV figures and top holdings from issuer factsheets.
  const sheets = JSON.parse(readFileSync(join(root, "data/seed/factsheets.json"), "utf8"));
  for (const r of sheets.records) {
    const owner = funds.funds.find((f) => f.shareClasses.some((sc) => sc.isin === r.isin));
    if (!owner) throw new Error(`Factsheet for unknown ISIN ${r.isin}`);
    const addSheetSource = (url: string, kind: string) => {
      if (seenSources.has(url)) return;
      seenSources.add(url);
      out.push(`insert into public.data_sources (kind, publisher, url, retrieved_on) values (${q(kind)}, ${q(publisher.get(owner.issuer))}, ${q(url)}, ${q(sheets.retrievedOn)});`);
    };
    addSheetSource(r.url, "issuer_factsheet");
    const src = sourceId(r.url);
    const insertMetric = (metric: string, value: number, unit: string, asOf: string, srcSql: string) =>
      out.push(`insert into public.metric_observations (fund_id, share_class_id, metric, value, unit, as_of, observed_on, source_id, verification) values (${fundId(owner.key)}, ${classId(r.isin)}, ${q(metric)}, ${q(value)}, ${q(unit)}, ${q(asOf)}, ${q(sheets.retrievedOn)}, ${srcSql}, ${verified});`);
    for (const [period, value] of Object.entries(r.returns)) insertMetric(`nav_return_${period}`, value as number, "percent", r.asOf, src);
    if (r.nav) {
      addSheetSource(r.nav.url, "issuer_website");
      insertMetric("nav", r.nav.value, r.nav.currency, r.nav.asOf, sourceId(r.nav.url));
    }
    for (const [name, weight] of Object.entries(r.top)) {
      out.push(`insert into public.fund_top_holdings (fund_id, name, weight_pct, as_of, observed_on, source_id) values (${fundId(owner.key)}, ${q(name)}, ${q(weight)}, ${q(r.asOf)}, ${q(sheets.retrievedOn)}, ${src});`);
    }
  }

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cell = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { cells.push(cell); cell = ""; }
      else cell += c;
    }
    cells.push(cell);
    return cells;
  };
  // The global list. Optional, so a fresh checkout still works before the download job has run.
  // A record's key changes from "exchange-ticker" to its ISIN once the ISIN is found. Figure files written
  // before that still use the old key, so they are matched through the ticker.
  const liveKeys = new Set<string>();
  const oldKeys = new Map<string, string>();
  const current = (key: string) => (liveKeys.has(key) ? key : oldKeys.get(key) ?? key);
  const universePath = join(root, "data/universe/universe.csv.gz");
  if (existsSync(universePath)) {
    const universeOn = JSON.parse(readFileSync(join(root, "data/universe/report.json"), "utf8")).esma.on;
    const lines = gunzipSync(readFileSync(universePath)).toString("utf8").trim().split(/\r?\n/).slice(1);
    // A published benchmark links a fund to its index when the name alone does not.
    const benchmarks = new Map<string, string>();
    const issuerFile = join(root, "data/universe/issuer_files.csv.gz");
    if (existsSync(issuerFile)) {
      const [head, ...rest] = gunzipSync(readFileSync(issuerFile)).toString("utf8").trim().split(/\r?\n/);
      const cols = parseLine(head);
      for (const row of rest) {
        const c = parseLine(row);
        const b = c[cols.indexOf("benchmark")];
        if (b) benchmarks.set(c[cols.indexOf("lookup")], b.replace(/<[^>]+>|[®™]/g, ""));
      }
    }
    const benchmarkOf = (isin: string, ticker: string) => benchmarks.get(isin) ?? benchmarks.get(`TICKER:${ticker}`) ?? "";
    for (let i = 0; i < lines.length; i += 1000) {
      const values = lines.slice(i, i + 1000).map((line) => {
        const [key, isin, ticker, mic, name, currency, lei, issuer, country, ucits, assetClass, venues, source, url] = parseLine(line);
        liveKeys.add(key);
        if (ticker && mic) oldKeys.set(`${mic}-${ticker}`, key);
        const full = prettyName(name.replace(/[®™]|<[^>]+>/g, ""));
        const pretty = cleanName(full);
        const slugs = inferCategories(full, source);
        // A brand in the fund's name is a surer guide to the issuer than the register's legal entity, which can be a platform.
        // The register's issuer field sometimes holds a trading platform, a broker, or the fund itself. Those are not issuers.
        const notAnIssuer = /TRADEWEB|RESIDUAL|VIRTU |BLOOMBERG TRADING|\bCBOE\b|AQUIS|TURQUOISE|STOCK EXCHANGE|\bMTF\b|BROKER|\bETF\b|\bFUND\b(?! MANAGE)|\bUCITS\b/i.test(issuer) || issuer.toLowerCase() === name.toLowerCase();
        const who = brandOf(pretty)?.label ?? (notAnIssuer ? "" : issuer);
        // Funds on the US symbol list are registered in the United States.
        const where = country || (source === "us" && !isin ? "US" : "");
        const kind = assetClass || (inferEquity(full) ? "equity" : "");
        return `(${q(key)}, ${q(isin)}, ${q(ticker)}, ${q(mic)}, ${q(pretty)}, ${q(currency)}, ${q(lei)}, ${q(who)}, ${q(where)}, ${ucits === "t" ? "true" : "null"}, ${q(kind)}, ${Number(venues) || 0}, ${q(source)}, ${q(url)}, ${q(universeOn)}, ${q(inferIndex(full) ?? inferIndex(benchmarkOf(isin, ticker)) ?? (where === "US" ? US_INDEX_BY_TICKER[ticker] ?? null : null))}, ${slugs.length ? `array[${slugs.map(q).join(",")}]` : "'{}'::text[]"})`;
      });
      out.push(`insert into public.universe_etfs (etf_key, isin, ticker, mic, name, currency, issuer_lei, issuer_name, issuer_country, ucits, asset_class, venues, source, source_url, retrieved_on, index_slug, category_slugs) values\n${values.join(",\n")};`);
    }
  }

  // Issuer figures for basic records, from scripts/universe/details.py.
  const detailsPath = join(root, "data/universe/details.csv.gz");
  if (existsSync(detailsPath)) {
    const [header, ...lines] = gunzipSync(readFileSync(detailsPath)).toString("utf8").trim().split(/\r?\n/);
    const names = parseLine(header);
    const numeric = new Set(["fee_pct", "aum", "nav", "ret_1y", "ret_3y", "ret_5y", "ret_si", "volatility_3y", "tracking_error_3y"]);
    for (const line of lines) {
      const cells = parseLine(line);
      const values = names.map((n, i) => {
        if (cells[i] === "" || cells[i] === undefined) return "null";
        if (numeric.has(n)) return q(Number(cells[i]));
        if (n === "hedged" || n === "pea_eligible") return cells[i] === "t" ? "true" : "false";
        const text = n === "source_url" ? cells[i] : cells[i].replace(/<[^>]+>|[®™]/g, "").trim();
        return q(n === "name" ? cleanName(prettyName(text)) : text);
      });
      // iShares sizes are per share class. The others cover the whole fund.
      const level = cells[names.indexOf("source")] === "iShares" ? "share_class" : "fund";
      out.push(`insert into public.universe_details (${names.join(", ")}, aum_level) select ${values.join(", ")}, ${q(level)} where exists (select 1 from public.universe_etfs u where u.etf_key = ${values[0]});`);
      // The issuer's own name and benchmark say which index a fund tracks when the register's name does not.
      const clean = (v: string | undefined) => (v ?? "").replace(/<[^>]+>|[®™]/g, "");
      const slug = inferIndex(clean(cells[names.indexOf("name")])) ?? inferIndex(clean(cells[names.indexOf("benchmark")]));
      if (slug) out.push(`update public.universe_etfs set index_slug = ${q(slug)} where etf_key = ${values[0]} and index_slug is null and exists (select 1 from public.indices where slug = ${q(slug)});`);
    }
  }

  // Issuer product files the owner downloaded. These are the newest figures, so they win over the details above.
  const issuerPath = join(root, "data/universe/issuer_files.csv.gz");
  if (existsSync(issuerPath)) {
    const [header, ...lines] = gunzipSync(readFileSync(issuerPath)).toString("utf8").trim().split(/\r?\n/);
    const names = parseLine(header);
    const numeric = new Set(["fee_pct", "aum", "nav", "ret_1y", "ret_3y", "ret_5y", "ret_si"]);
    const columns = names.filter((n) => !["lookup", "isin", "ticker"].includes(n));
    for (const line of lines) {
      const cells = parseLine(line);
      const cell = (n: string) => cells[names.indexOf(n)] ?? "";
      const value = (n: string) => {
        const v = cell(n);
        if (v === "") return "null";
        if (n === "hedged" || n === "listed_on_six") return v === "t" ? "true" : "false";
        return numeric.has(n) ? q(Number(v)) : q(v);
      };
      const lookup = cell("isin")
        ? `select etf_key from public.universe_etfs where isin = ${q(cell("isin"))} order by venues desc limit 1`
        : `select etf_key from public.universe_etfs where upper(ticker) = ${q(cell("ticker").toUpperCase())} and (isin is null or isin = '' or isin like 'US%') order by (isin is null or isin = ''), venues desc limit 1`;
      out.push(`insert into public.universe_details (etf_key, ${columns.join(", ")}) select k.etf_key, ${columns.map(value).join(", ")} from (${lookup}) k on conflict (etf_key) do update set ${columns.map((c) => `${c} = coalesce(excluded.${c}, public.universe_details.${c})`).join(", ")};`);
    }
  }

  // Fully researched funds also get issuer NAV and returns from the bulk files, unless already known.
  out.push(`insert into public.data_sources (kind, publisher, url, retrieved_on)
    select distinct 'issuer_website', d.source, d.source_url, current_date from public.universe_details d
    join public.universe_etfs u on u.etf_key = d.etf_key join public.share_classes sc on sc.isin = u.isin
    where d.source_url is not null on conflict (url) do nothing;`);
  for (const [column, metric, unit, date] of [["nav", "nav", "d.nav_currency", "d.nav_as_of"], ["ret_1y", "nav_return_1y", "'percent'", "d.ret_as_of"], ["ret_3y", "nav_return_3y", "'percent'", "d.ret_as_of"], ["ret_5y", "nav_return_5y", "'percent'", "d.ret_as_of"], ["ret_si", "nav_return_si", "'percent'", "d.ret_as_of"]]) {
    out.push(`insert into public.metric_observations (fund_id, share_class_id, metric, value, unit, as_of, observed_on, source_id, verification)
      select sc.fund_id, sc.id, '${metric}', d.${column}, ${unit}, nullif(${date}, '')::date, current_date, ds.id, 'extracted_unreviewed'
      from public.universe_details d join public.universe_etfs u on u.etf_key = d.etf_key join public.share_classes sc on sc.isin = u.isin join public.data_sources ds on ds.url = d.source_url
      where d.${column} is not null and not exists (select 1 from public.metric_observations m where m.share_class_id = sc.id and m.metric = '${metric}');`);
  }

  // Fees and sizes missing from researched funds, taken from the same files.
  out.push(`insert into public.share_class_fees (share_class_id, fee_type, value_pct, as_of, observed_on, source_id, verification)
    select sc.id, d.fee_type, d.fee_pct, nullif(d.fee_as_of, '')::date, current_date, ds.id, 'extracted_unreviewed'
    from public.universe_details d join public.universe_etfs u on u.etf_key = d.etf_key join public.share_classes sc on sc.isin = u.isin join public.data_sources ds on ds.url = d.source_url
    where d.fee_pct is not null and d.fee_type in ('ter', 'ocf') and not exists (select 1 from public.share_class_fees f where f.share_class_id = sc.id);`);
  out.push(`insert into public.metric_observations (fund_id, share_class_id, metric, value, unit, as_of, observed_on, source_id, verification)
    select sc.fund_id, case when d.aum_level = 'share_class' then sc.id end, 'aum', d.aum, d.aum_currency, nullif(d.aum_as_of, '')::date, current_date, ds.id, 'extracted_unreviewed'
    from public.universe_details d join public.universe_etfs u on u.etf_key = d.etf_key join public.share_classes sc on sc.isin = u.isin join public.data_sources ds on ds.url = coalesce(d.aum_source_url, d.source_url)
    where d.aum is not null and d.aum_currency is not null and not exists (select 1 from public.metric_observations m where m.fund_id = sc.fund_id and m.metric = 'aum');`);

  // US fees from SEC prospectus filings, used only where no issuer figure exists.
  const secPath = join(root, "data/universe/sec_fees.csv.gz");
  if (existsSync(secPath)) {
    const secUrl = "https://www.sec.gov/dera/data/mutual-fund-prospectus-risk-return-summary-data-sets";
    for (const line of gunzipSync(readFileSync(secPath)).toString("utf8").trim().split(/\r?\n/).slice(1)) {
      const [rawKey, fee, kind, filed] = line.split(",");
      const key = current(rawKey);
      const date = `${filed.slice(0, 4)}-${filed.slice(4, 6)}-${filed.slice(6, 8)}`;
      out.push(`insert into public.universe_details (etf_key, fee_pct, fee_type, fee_as_of, source, source_url) select ${q(key)}, ${Number(fee)}, ${q(kind)}, ${q(date)}, 'SEC prospectus data', ${q(secUrl)} where exists (select 1 from public.universe_etfs u where u.etf_key = ${q(key)}) on conflict (etf_key) do update set fee_type = coalesce(public.universe_details.fee_type, excluded.fee_type), fee_as_of = case when public.universe_details.fee_pct is null then excluded.fee_as_of else public.universe_details.fee_as_of end, fee_pct = coalesce(public.universe_details.fee_pct, excluded.fee_pct);`);
    }
  }

  // US fund sizes from SEC Form N-PORT filings, used only where no issuer size exists.
  const nportPath = join(root, "data/universe/sec_nport.csv.gz");
  if (existsSync(nportPath)) {
    const nportUrl = "https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets";
    for (const line of gunzipSync(readFileSync(nportPath)).toString("utf8").trim().split(/\r?\n/).slice(1)) {
      const [rawKey, aum, currency, asOf] = parseLine(line);
      const key = current(rawKey);
      out.push(`insert into public.universe_details (etf_key, aum, aum_currency, aum_as_of, aum_level, source, source_url, aum_source, aum_source_url) select ${q(key)}, ${Number(aum)}, ${q(currency)}, ${q(asOf)}, 'fund', 'SEC N-PORT', ${q(nportUrl)}, 'SEC N-PORT', ${q(nportUrl)} where exists (select 1 from public.universe_etfs u where u.etf_key = ${q(key)}) on conflict (etf_key) do update set aum_source = case when public.universe_details.aum is null then excluded.aum_source else public.universe_details.aum_source end, aum_source_url = case when public.universe_details.aum is null then excluded.aum_source_url else public.universe_details.aum_source_url end, aum_currency = case when public.universe_details.aum is null then excluded.aum_currency else public.universe_details.aum_currency end, aum_as_of = case when public.universe_details.aum is null then excluded.aum_as_of else public.universe_details.aum_as_of end, aum_level = case when public.universe_details.aum is null then excluded.aum_level else public.universe_details.aum_level end, aum = coalesce(public.universe_details.aum, excluded.aum);`);
    }
  }

  // Issuer factsheets (scripts/universe/documents.py): fee, size and replication only where no better figure exists,
  // each with its own source. Country and sector splits and monthly returns go to their own tables further down.
  const factPath = join(root, "data/universe/factsheets.csv.gz");
  if (existsSync(factPath)) {
    for (const line of gunzipSync(readFileSync(factPath)).toString("utf8").trim().split(/\r?\n/).slice(1)) {
      const [rawKey, asOf, fee, aum, aumCurrency, aumLevel, , replication, sri, , transaction, kidUrl, source, url] = parseLine(line);
      const key = current(rawKey);
      const feeV = fee === "" ? "null" : String(Number(fee));
      const aumV = aum === "" || !aumCurrency ? "null" : String(Number(aum));
      const d = "public.universe_details";
      out.push(`insert into ${d} (etf_key, fee_pct, fee_type, fee_as_of, aum, aum_currency, aum_as_of, aum_level, replication, sri, transaction_cost_pct, kid_url, source, source_url, fee_source, fee_source_url, aum_source, aum_source_url) select ${q(key)}, ${feeV}, ${fee === "" ? "null" : "'ongoing'"}, ${q(asOf || null)}, ${aumV}, ${q(aumV === "null" ? null : aumCurrency)}, ${q(asOf || null)}, ${q(aumV === "null" ? null : aumLevel || "fund")}, ${q(replication || null)}, ${sri ? Number(sri) : "null"}, ${transaction === "" ? "null" : Number(transaction)}, ${q(kidUrl || null)}, ${q(source)}, ${q(url)}, ${q(feeV === "null" ? null : source)}, ${q(feeV === "null" ? null : url)}, ${q(aumV === "null" ? null : source)}, ${q(aumV === "null" ? null : url)} where exists (select 1 from public.universe_etfs u where u.etf_key = ${q(key)}) on conflict (etf_key) do update set ` +
        `fee_source = case when ${d}.fee_pct is null then excluded.fee_source else ${d}.fee_source end, fee_source_url = case when ${d}.fee_pct is null then excluded.fee_source_url else ${d}.fee_source_url end, fee_type = case when ${d}.fee_pct is null then excluded.fee_type else ${d}.fee_type end, fee_as_of = case when ${d}.fee_pct is null then excluded.fee_as_of else ${d}.fee_as_of end, fee_pct = coalesce(${d}.fee_pct, excluded.fee_pct), ` +
        `aum_source = case when ${d}.aum is null then excluded.aum_source else ${d}.aum_source end, aum_source_url = case when ${d}.aum is null then excluded.aum_source_url else ${d}.aum_source_url end, aum_currency = case when ${d}.aum is null then excluded.aum_currency else ${d}.aum_currency end, aum_as_of = case when ${d}.aum is null then excluded.aum_as_of else ${d}.aum_as_of end, aum_level = case when ${d}.aum is null then excluded.aum_level else ${d}.aum_level end, aum = coalesce(${d}.aum, excluded.aum), ` +
        `replication = coalesce(${d}.replication, excluded.replication), sri = coalesce(excluded.sri, ${d}.sri), transaction_cost_pct = coalesce(excluded.transaction_cost_pct, ${d}.transaction_cost_pct), kid_url = coalesce(excluded.kid_url, ${d}.kid_url);`);
    }
  }

  // Fees and sizes that an exchange publishes for its own listings, used only where nothing better exists.
  const exchangePath = join(root, "data/universe/exchange_facts.csv.gz");
  if (existsSync(exchangePath)) {
    for (const line of gunzipSync(readFileSync(exchangePath)).toString("utf8").trim().split(/\r?\n/).slice(1)) {
      const [key, fee, feeType, aum, aumCurrency, asOf, , source, url] = parseLine(line);
      const n = (v: string) => (v === "" ? "null" : String(Number(v)));
      out.push(`insert into public.universe_details (etf_key, fee_pct, fee_type, fee_as_of, aum, aum_currency, aum_as_of, aum_level, source, source_url) select ${q(key)}, ${n(fee)}, ${q(feeType)}, ${q(asOf)}, ${n(aum)}, ${q(aumCurrency)}, ${q(asOf)}, 'fund', ${q(source)}, ${q(url)} where exists (select 1 from public.universe_etfs u where u.etf_key = ${q(key)}) on conflict (etf_key) do nothing;`);
    }
  }

  // Daily price points, from scripts/universe/daily.py.
  const dailyDir = join(root, "data/prices");
  for (const file of existsSync(dailyDir) ? readdirSync(dailyDir).filter((n) => /^nav-\d{4}\.csv\.gz$/.test(n)).sort() : []) {
    const lines = gunzipSync(readFileSync(join(dailyDir, file))).toString("utf8").trim().split(/\r?\n/).slice(1);
    for (let i = 0; i < lines.length; i += 1000) {
      const values = lines.slice(i, i + 1000).map((line) => {
        const [rawKey, date, value, currency, kind, source] = parseLine(line);
        const key = current(rawKey);
        return `(${q(key)}, ${q(date)}::date, ${Number(value)}, ${q(currency)}, ${q(kind)}, ${q(source)})`;
      });
      out.push(`insert into public.universe_prices (etf_key, price_date, value, currency, kind, source)
        select v.* from (values\n${values.join(",\n")}) as v(etf_key, price_date, value, currency, kind, source)
        where exists (select 1 from public.universe_etfs u where u.etf_key = v.etf_key) on conflict do nothing;`);
    }
  }

  // Full holdings, from scripts/universe/holdings.py.
  // Issuer files first, then SEC N-PORT holdings for the funds whose issuer publishes none.
  for (const [holdingsFile, summaryFile] of [["holdings.csv.gz", "summary.csv.gz"], ["sec_holdings.csv.gz", "sec_summary.csv.gz"], ["factsheet_holdings.csv.gz", "factsheet_summary.csv.gz"]]) {
  const holdingsPath = join(root, "data/holdings", holdingsFile);
  const summaryPath = join(root, "data/holdings", summaryFile);
  if (!existsSync(holdingsPath) || !existsSync(summaryPath)) continue;
  {
    const known = `where exists (select 1 from public.universe_etfs u where u.etf_key = v.etf_key) on conflict do nothing`;
    const summaries = gunzipSync(readFileSync(summaryPath)).toString("utf8").trim().split(/\r?\n/).slice(1).map((line) => {
      const [key, asOf, n, kept, covered, source, url] = parseLine(line);
      return `(${q(current(key))}, ${asOf ? `${q(asOf)}::date` : "null::date"}, ${Number(n)}, ${Number(kept)}, ${Number(covered)}, ${q(source)}, ${q(url)})`;
    });
    for (let i = 0; i < summaries.length; i += 500) {
      out.push(`insert into public.holdings_summary select v.* from (values\n${summaries.slice(i, i + 500).join(",\n")}) as v(etf_key, as_of, n_holdings, kept, covered_pct, source, source_url) ${known};`);
    }
    const lines = gunzipSync(readFileSync(holdingsPath)).toString("utf8").trim().split(/\r?\n/).slice(1);
    for (let i = 0; i < lines.length; i += 1000) {
      const values = lines.slice(i, i + 1000).map((line) => {
        const [key, holding, name, ticker, weight, sector, country, assetClass] = parseLine(line);
        return `(${q(current(key))}, ${q(holding)}, ${q(name)}, ${q(ticker || null)}, ${Number(weight)}, ${q(sector || null)}, ${q(country || null)}, ${q(assetClass || null)})`;
      });
      out.push(`insert into public.holdings select v.* from (values\n${values.join(",\n")}) as v(etf_key, holding_key, name, ticker, weight_pct, sector, country, asset_class) ${known};`);
    }
    // State Street's US files carry no sector. Its eleven Select Sector funds split the S&P 500 by sector,
    // so a company's sector is the sector fund that holds it. Companies outside those funds stay without one.
    const sectorFunds: Record<string, string> = { XLK: "Information Technology", XLF: "Financials", XLV: "Health Care", XLY: "Consumer Discretionary", XLP: "Consumer Staples", XLE: "Energy", XLI: "Industrials", XLB: "Materials", XLU: "Utilities", XLRE: "Real Estate", XLC: "Communication Services" };
    out.push(`update public.holdings h set sector = m.sector from (
        select distinct on (x.holding_key) x.holding_key, f.sector from public.holdings x
        join public.universe_etfs u on u.etf_key = x.etf_key
        join (values ${Object.entries(sectorFunds).map(([t, name]) => `(${q(t)}, ${q(name)})`).join(", ")}) as f(ticker, sector) on f.ticker = u.ticker
        where x.holding_key not like '|%' order by x.holding_key, x.weight_pct desc
      ) m where m.holding_key = h.holding_key and (h.sector is null or h.sector in ('', '-'));`);
    out.push(`update public.holdings set sector = null where sector in ('', '-');`);
    out.push(`update public.holdings h set country = 'United States' from public.holdings x join public.universe_etfs u on u.etf_key = x.etf_key and u.ticker = 'SPY' where x.holding_key = h.holding_key and h.country is null;`);
  }
  }

  // Country and sector splits printed on factsheets.
  const expoPath = join(root, "data/holdings/factsheet_exposures.csv.gz");
  if (existsSync(expoPath)) {
    const lines = gunzipSync(readFileSync(expoPath)).toString("utf8").trim().split(/\r?\n/).slice(1);
    for (let i = 0; i < lines.length; i += 1000) {
      const values = lines.slice(i, i + 1000).map((line) => {
        const [key, dim, label, weight, asOf, source, url] = parseLine(line);
        return `(${q(current(key))}, ${q(dim)}, ${q(label)}, ${Number(weight)}, ${asOf ? `${q(asOf)}::date` : "null::date"}, ${q(source)}, ${q(url)})`;
      });
      out.push(`insert into public.universe_exposures select v.* from (values\n${values.join(",\n")}) as v(etf_key, dimension, label, weight_pct, as_of, source, source_url) where exists (select 1 from public.universe_etfs u where u.etf_key = v.etf_key) on conflict do nothing;`);
    }
  }
  // Official monthly total returns of US funds, from SEC N-PORT.
  const retPath = join(root, "data/universe/sec_returns.csv.gz");
  if (existsSync(retPath)) {
    const lines = gunzipSync(readFileSync(retPath)).toString("utf8").trim().split(/\r?\n/).slice(1);
    for (let i = 0; i < lines.length; i += 2000) {
      const values = lines.slice(i, i + 2000).map((line) => {
        const [key, month, value] = parseLine(line);
        return `(${q(current(key))}, ${q(month + "-01")}::date, ${Number(value)}, 'SEC N-PORT')`;
      });
      out.push(`insert into public.universe_monthly_returns select v.* from (values\n${values.join(",\n")}) as v(etf_key, month, return_pct, source) where exists (select 1 from public.universe_etfs u where u.etf_key = v.etf_key) on conflict do nothing;`);
    }
  }

  out.push("commit;");
  return out;
}

export function buildSeedSql(root: string): string {
  return buildSeedStatements(root).join("\n") + "\n";
}
