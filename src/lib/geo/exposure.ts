import { CURRENCY_OF } from "@/lib/etfs/currency-of";
import { BRAND_HOME, brandOf } from "@/lib/etfs/brands";

export type Slice = { label: string; weight_pct: number };

/** Holdings files name countries their own way. These are the names the map uses. */
const ALIAS: Record<string, string> = {
  "United States": "United States of America", USA: "United States of America", US: "United States of America",
  "Czech Republic": "Czechia", Korea: "South Korea", "Korea, Republic of": "South Korea", "Republic of Korea": "South Korea",
  "Russian Federation": "Russia", "Belgium / Luxembourg": "Belgium", "C.I. Guernsey": "Guernsey", "C.I. Jersey": "Jersey",
  "Bosnia and Herzegovina": "Bosnia and Herz.", "Dominican Republic": "Dominican Rep.", "North Macedonia": "Macedonia",
  "Ivory Coast": "Côte d'Ivoire", "Viet Nam": "Vietnam", "Türkiye": "Turkey", "Hong Kong SAR": "Hong Kong", "Macau": "Macao",
};
export const mapName = (label: string) => ALIAS[label] ?? label;

const merge = (rows: Slice[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.weight_pct > 0) m.set(r.label, (m.get(r.label) ?? 0) + r.weight_pct);
  return [...m.entries()].map(([label, weight_pct]) => ({ label, weight_pct })).sort((a, b) => b.weight_pct - a.weight_pct);
};

/** Shares rescaled to 100 over what is known, so a partly covered breakdown still reads as a whole. */
export const normalise = (rows: Slice[]) => {
  const total = rows.reduce((s, r) => s + r.weight_pct, 0);
  return total ? merge(rows).map((r) => ({ ...r, weight_pct: (r.weight_pct / total) * 100 })) : [];
};

export const currencies = (countries: Slice[]) => normalise(countries.map((c) => ({ label: CURRENCY_OF[c.label] ?? CURRENCY_OF[mapName(c.label)] ?? "Other", weight_pct: c.weight_pct })));

/** By fund provider, by the provider's home country, and by the fund's own domicile, from each fund's weight. */
export function providerViews(funds: { name: string; issuer?: string | null; domicile: string | null; weight_pct: number }[]) {
  const provider = (f: (typeof funds)[number]) => brandOf(f.name)?.label ?? (f.issuer && f.issuer !== "Not identified" ? f.issuer : "Other");
  const home = (f: (typeof funds)[number]) => { const b = brandOf(f.name); return b ? BRAND_HOME[b.slug] ?? "Other" : "Other"; };
  return {
    providers: normalise(funds.map((f) => ({ label: provider(f), weight_pct: f.weight_pct }))),
    providerCountries: normalise(funds.map((f) => ({ label: home(f), weight_pct: f.weight_pct }))),
    domiciles: normalise(funds.map((f) => ({ label: f.domicile ?? "Other", weight_pct: f.weight_pct }))),
  };
}

const ISO: Record<string, string> = {
  "United States": "US", "United States of America": "US", Japan: "JP", "United Kingdom": "GB", China: "CN", India: "IN", France: "FR", Canada: "CA",
  Germany: "DE", Taiwan: "TW", "South Korea": "KR", Switzerland: "CH", Sweden: "SE", Australia: "AU", Italy: "IT", Netherlands: "NL", Spain: "ES",
  "Saudi Arabia": "SA", Belgium: "BE", Brazil: "BR", Denmark: "DK", Finland: "FI", "South Africa": "ZA", Norway: "NO", "Hong Kong": "HK",
  Singapore: "SG", Malaysia: "MY", Thailand: "TH", Mexico: "MX", Israel: "IL", Ireland: "IE", Austria: "AT", "United Arab Emirates": "AE",
  Poland: "PL", Portugal: "PT", Indonesia: "ID", Turkey: "TR", Chile: "CL", Qatar: "QA", Greece: "GR", Kuwait: "KW", Philippines: "PH",
  Luxembourg: "LU", Bermuda: "BM", Peru: "PE", "Cayman Islands": "KY", Hungary: "HU", "New Zealand": "NZ", "Czech Republic": "CZ", Czechia: "CZ",
  Colombia: "CO", Egypt: "EG", Panama: "PA", Argentina: "AR", Guernsey: "GG", Jersey: "JE", Russia: "RU", Vietnam: "VN", Morocco: "MA",
};

/** A country name from a holdings file, in the reader's language when we know its code. */
export function localCountry(label: string, lang: "en" | "fr") {
  const code = /^[A-Z]{2}$/.test(label) ? label : ISO[label] ?? ISO[mapName(label)];
  if (!code) return label;
  try { return new Intl.DisplayNames([lang === "fr" ? "fr" : "en"], { type: "region" }).of(code) ?? label; } catch { return label; }
}
