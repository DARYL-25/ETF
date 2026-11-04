/** Display helpers. A missing value always renders as an em dash, never as zero. */

export const MISSING = "—";

export function formatPct(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? MISSING : `${value.toFixed(digits)}%`;
}

export function formatSignedPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return MISSING;
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;
}

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF " };

export function formatMoney(value: number | null | undefined, currency: string | null | undefined): string {
  if (value === null || value === undefined) return MISSING;
  const prefix = currency ? SYMBOLS[currency] ?? `${currency} ` : "";
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(value >= 1e11 ? 0 : 1)}bn`;
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(0)}m`;
  return `${prefix}${value.toLocaleString("en-GB")}`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(value: string | null | undefined): string {
  return value ? dateFormat.format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : MISSING;
}

/** A fact older than this gets a visible warning. */
export const STALE_AFTER_DAYS = 120;

export function isStale(asOf: string | null | undefined, today = new Date()): boolean {
  if (!asOf) return false;
  return (today.getTime() - new Date(`${asOf}T00:00:00Z`).getTime()) / 86_400_000 > STALE_AFTER_DAYS;
}

const COUNTRIES: Record<string, string> = { IE: "Ireland", LU: "Luxembourg", FR: "France", DE: "Germany", CH: "Switzerland", GB: "United Kingdom", NL: "Netherlands", IT: "Italy", JE: "Jersey", US: "United States" };
export const countryName = (code: string | null | undefined) => (code ? COUNTRIES[code] ?? code : MISSING);

const REPLICATION: Record<string, string> = {
  physical: "Physical",
  physical_full: "Physical, full",
  physical_sampling: "Physical, sampled",
  physical_metal: "Physical metal",
  synthetic_swap: "Synthetic, swap",
  futures: "Futures",
};
export const replicationLabel = (v: string | null | undefined) => (v ? REPLICATION[v] ?? v : MISSING);

const DISTRIBUTION: Record<string, string> = { accumulating: "Accumulating", distributing: "Distributing", no_income: "No income" };
export const distributionLabel = (v: string | null | undefined) => (v ? DISTRIBUTION[v] ?? v : MISSING);

const FREQUENCY: Record<string, string> = { monthly: "monthly", quarterly: "quarterly", semi_annual: "twice a year", annual: "yearly", ad_hoc: "irregular" };
export const frequencyLabel = (v: string | null | undefined) => (v ? FREQUENCY[v] ?? v : MISSING);

const ASSET_CLASS: Record<string, string> = { equity: "Equity", fixed_income: "Bonds", commodities: "Commodities", money_market: "Money market", real_estate: "Real estate", multi_asset: "Multi-asset", alternatives: "Alternatives", crypto: "Crypto" };
export const assetClassLabel = (v: string | null | undefined) => (v ? ASSET_CLASS[v] ?? v : MISSING);

const STYLE: Record<string, string> = { passive: "Passive", active: "Active", systematic: "Systematic, rules-based", other: "Other" };
export const styleLabel = (v: string | null | undefined) => (v ? STYLE[v] ?? v : MISSING);

export const yesNoUnknown = (v: boolean | null | undefined) => (v === true ? "Yes" : v === false ? "No" : MISSING);

/** ETC gold is not an ETF; say so wherever the product type is shown. */
export const productLabel = (v: string) => v.toUpperCase();
