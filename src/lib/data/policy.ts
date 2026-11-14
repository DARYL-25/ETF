import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * How each kind of data is kept up to date: what it is, how often it is refreshed, by which job,
 * and from which sources. The Data page renders this, and docs/DATA_UPDATES.md explains it.
 */
export type SourceState = "automatic" | "owner file" | "unofficial" | "not working" | "not licensed";
export type DataSource = { name: string; covers: string; url: string; state: SourceState; note?: string };
export type Dataset = {
  id: string; name: string; what: string; cadence: string; schedule: string; job: string; report?: string;
  sources: DataSource[];
};

export const DATASETS: Dataset[] = [
  {
    id: "list", name: "Which ETFs exist", what: "Names, ISINs, tickers, exchanges and issuers. New launches appear within a week.",
    cadence: "Weekly", schedule: "Mondays, 04:17 UTC", job: "universe.yml", report: "data/universe/report.json",
    sources: [
      { name: "ESMA FIRDS register", covers: "Funds traded on EU venues", url: "https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_firds", state: "automatic" },
      { name: "FCA FIRDS register", covers: "Funds traded on UK venues", url: "https://data.fca.org.uk/#/homepage", state: "automatic" },
      { name: "Nasdaq Trader symbol directory", covers: "All US-listed ETFs", url: "https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs", state: "automatic" },
      { name: "Exchange lists", covers: "Japan, Hong Kong, India, Shanghai, Taiwan, Canada, Singapore, Australia", url: "https://github.com/DARYL-25/ETF/blob/main/scripts/universe/fetch.py", state: "automatic" },
      { name: "Naver Finance", covers: "Korea", url: "https://finance.naver.com/sise/etf.naver", state: "unofficial", note: "Used because the exchange's own list refused automated reading. To be replaced." },
      { name: "GLEIF", covers: "Issuer legal names and countries", url: "https://www.gleif.org/en/lei-data/gleif-api", state: "automatic" },
      { name: "OpenFIGI", covers: "Tickers for ISINs that have none", url: "https://www.openfigi.com/api/documentation", state: "automatic" },
      { name: "Shenzhen Stock Exchange", covers: "Shenzhen-listed ETFs", url: "https://fund.szse.cn/", state: "not working", note: "Refuses connections from the job's servers." },
    ],
  },
  {
    id: "facts", name: "Fees and fund facts", what: "TER or OCF, domicile, replication, income treatment, benchmark and launch date. These change rarely.",
    cadence: "Quarterly at least", schedule: "Issuer files monthly on the 8th. SEC data on the 15th of February, May, August and November. Owner files each quarter.", job: "details.yml, sec.yml", report: "data/universe/details/report.json",
    sources: [
      { name: "iShares product list", covers: "About 920 iShares UCITS ETFs", url: "https://www.ishares.com/uk/individual/en/products/etf-investments", state: "automatic" },
      { name: "State Street product data", covers: "About 340 SPDR ETFs, US and Europe", url: "https://www.ssga.com/", state: "automatic" },
      { name: "Amundi monthly factsheets", covers: "About 500 Amundi and Lyxor ETFs", url: "https://www.amundietf.com/", state: "automatic" },
      { name: "SEC prospectus data sets", covers: "Fees of about 2,900 US ETFs", url: "https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-risk-return-summary-data-sets", state: "automatic" },
      { name: "Xtrackers, Invesco, Vanguard and UBS product files", covers: "About 1,750 ETFs", url: "https://github.com/DARYL-25/ETF/blob/main/docs/DATA_UPDATES.md", state: "owner file", note: "These sites show terms before the download, so a person accepts them and downloads the files each quarter." },
    ],
  },
  {
    id: "size", name: "Fund size and returns", what: "Assets under management and official NAV returns over 1, 3 and 5 years, each with its date and currency.",
    cadence: "Monthly", schedule: "The 8th of each month, once factsheets for the previous month are out. Daily for iShares and State Street.", job: "details.yml, daily.yml", report: "data/universe/details/report.json",
    sources: [
      { name: "Issuer files and factsheets", covers: "Same sources as fees", url: "https://github.com/DARYL-25/ETF/blob/main/scripts/universe/details.py", state: "automatic" },
    ],
  },
  {
    id: "prices", name: "Prices", what: "One price per ETF per day: the net asset value the issuer publishes, or an exchange close where the exchange offers it as open data. History builds from the first day collected.",
    cadence: "Daily", schedule: "Tuesday to Saturday, 05:23 UTC, for the previous trading day", job: "daily.yml", report: "data/prices/report.json",
    sources: [
      { name: "iShares and State Street daily NAV", covers: "About 1,260 ETFs", url: "https://www.ishares.com/uk/individual/en/products/etf-investments", state: "automatic" },
      { name: "Taiwan Stock Exchange open data", covers: "Closing prices of Taiwan-listed ETFs", url: "https://openapi.twse.com.tw/", state: "automatic" },
      { name: "Other issuers' NAV", covers: "About 1,000 ETFs, on the day each file was read", url: "https://github.com/DARYL-25/ETF/blob/main/docs/DATA_UPDATES.md", state: "owner file" },
      { name: "Live and delayed exchange prices", covers: "All listings, intraday", url: "https://github.com/DARYL-25/ETF/blob/main/docs/DATA_UPDATES.md", state: "not licensed", note: "Exchanges charge for showing their prices. A licensed feed plugs in here once the product earns enough to pay for it." },
    ],
  },
  {
    id: "fx", name: "Exchange rates", what: "Euro reference rates for about 30 currencies, used to compare fund sizes.",
    cadence: "Daily", schedule: "With the daily price job", job: "daily.yml", report: "data/prices/report.json",
    sources: [{ name: "European Central Bank", covers: "Euro reference rates", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html", state: "automatic" }],
  },
  {
    id: "tax", name: "Tax rules", what: "Rules for Switzerland and France, each quoted from an official source with the day it was read.",
    cadence: "Twice a year, and when a law changes", schedule: "January and July, by a person", job: "Manual review",
    sources: [
      { name: "Federal Tax Administration (ESTV)", covers: "Switzerland", url: "https://www.estv.admin.ch/", state: "owner file" },
      { name: "impots.gouv.fr and service-public.gouv.fr", covers: "France", url: "https://www.impots.gouv.fr/", state: "owner file" },
    ],
  },
];

export type Freshness = { id: string; lastRun: string | null; detail: string | null };

function read(path: string): Record<string, unknown> | null {
  const full = join(process.cwd(), path);
  if (!existsSync(full)) return null;
  try { return JSON.parse(readFileSync(full, "utf8")); } catch { return null; }
}

/** The last successful run of each job, read from the report each job commits with its data. */
export function getFreshness(): Freshness[] {
  const list = read("data/universe/report.json") as Record<string, { ok?: boolean; on?: string }> | null;
  const details = read("data/universe/details/report.json") as { on?: string; fees?: number } | null;
  const prices = read("data/prices/report.json") as { on?: string; latest_date?: string; etfs_priced?: number; fx?: { ok?: boolean; rate_date?: string } } | null;
  const files = read("data/universe/details/issuer_files_report.json") as { retrieved_on?: string } | null;
  const listDates = list ? Object.values(list).filter((s) => s?.ok && s.on).map((s) => s.on as string).sort() : [];
  const failing = list ? Object.entries(list).filter(([, s]) => s && s.ok === false).map(([k]) => k) : [];
  return [
    { id: "list", lastRun: listDates.at(-1) ?? null, detail: failing.length ? `Not updating: ${failing.join(", ").replaceAll("_", " ")}` : null },
    { id: "facts", lastRun: details?.on ?? null, detail: files?.retrieved_on ? `Owner files read ${files.retrieved_on}` : null },
    { id: "size", lastRun: details?.on ?? null, detail: null },
    { id: "prices", lastRun: prices?.on ?? null, detail: prices?.latest_date ? `${prices.etfs_priced?.toLocaleString("en-GB")} ETFs, latest price dated ${prices.latest_date}` : null },
    { id: "fx", lastRun: prices?.fx?.ok ? prices.on ?? null : null, detail: prices?.fx?.rate_date ? `Rates of ${prices.fx.rate_date}` : null },
    { id: "tax", lastRun: "2026-11-14", detail: "Not yet reviewed by a tax adviser" },
  ];
}
