import { inferCategories } from "@/lib/etfs/infer";

/** What someone is looking for, read from plain English or French with fixed rules. */
export type Intent = {
  text: string;
  index: string | null;
  investorCountry: string | null;
  distribution: "accumulating" | "distributing" | null;
  hedged: boolean | null;
  replication: "physical" | "synthetic" | null;
  assetClass: string | null;
  categories: string[];
  issuer: string | null;
  ucitsOnly: boolean;
  keywords: string[];
};

const INDEX: [RegExp, string][] = [
  [/nasdaq[- ]?100|\bndx\b/i, "nasdaq-100"],
  [/s\s?&\s?p\s?-?500|sp\s?500|\bspx\b/i, "sp-500"],
  [/msci world/i, "msci-world"],
  [/msci acwi|msci all country/i, "msci-acwi"],
  [/msci (em|emerging)/i, "msci-emerging-markets"],
  [/msci europe/i, "msci-europe"],
  [/ftse all[- ]world/i, "ftse-all-world"],
  [/ftse 100/i, "ftse-100"],
  [/stoxx (europe )?600/i, "stoxx-europe-600"],
  [/euro stoxx 50/i, "euro-stoxx-50"],
  [/\bdax\b/i, "dax"],
  [/cac ?40/i, "cac-40"],
  [/\bsmi\b/i, "smi"],
  [/russell 2000/i, "russell-2000"],
];

const COUNTRY: [RegExp, string][] = [
  [/\b(swiss|switzerland|suisse|schweiz)\b/i, "Switzerland"],
  [/\b(french|france|fran[cç]ais)\b/i, "France"],
  [/\b(german|germany|allemagne|allemand|deutschland)\b/i, "Germany"],
  [/\b(british|uk|united kingdom|royaume-uni)\b/i, "United Kingdom"],
  [/\b(belgian|belgium|belgique)\b/i, "Belgium"],
  [/\b(dutch|netherlands|pays-bas)\b/i, "Netherlands"],
  [/\b(italian|italy|italie)\b/i, "Italy"],
  [/\b(spanish|spain|espagne)\b/i, "Spain"],
  [/\b(portuguese|portugal)\b/i, "Portugal"],
  [/\b(irish|ireland|irlande)\b/i, "Ireland"],
  [/\b(austrian|austria|autriche)\b/i, "Austria"],
  [/\b(luxembourg)\b/i, "Luxembourg"],
  [/\b(us investor|american investor|us resident|investisseur am[eé]ricain)\b/i, "United States"],
];

const ISSUERS = ["ishares", "vanguard", "amundi", "xtrackers", "invesco", "ubs", "spdr", "state street", "hsbc", "wisdomtree", "vaneck", "lyxor"];

export const EU_EEA = new Set(["France", "Germany", "Belgium", "Netherlands", "Italy", "Spain", "Portugal", "Ireland", "Austria", "Luxembourg"]);

export function parseIntent(text: string): Intent {
  const t = text.slice(0, 1000);
  const index = INDEX.find(([re]) => re.test(t))?.[1] ?? null;
  const investorCountry = COUNTRY.find(([re]) => re.test(t))?.[1] ?? null;
  const distribution = /\b(accumulat\w*|acc|capitalis\w*|reinvest\w*)\b/i.test(t) ? "accumulating" : /\b(distribut\w*|dist|dividend payer|pays? (a )?dividends?|income)\b/i.test(t) ? "distributing" : null;
  const notHedged = /\b(unhedged|not hedged|non couvert)\b/i.test(t);
  const hedged = notHedged ? false : /\b(hedged|hedge|couvert)\b/i.test(t) ? true : null;
  const replication = /\b(synthetic|swap|synth[eé]tique)\b/i.test(t) ? "synthetic" : /\b(physical|physique)\b/i.test(t) ? "physical" : null;
  const assetClass = /\b(bonds?|obligations?|fixed income|treasur\w*)\b/i.test(t) ? "fixed_income" : /\b(gold|or physique|commodit\w*|mati[eè]res? premi[eè]res?)\b/i.test(t) ? "commodities" : /\bmoney market\b/i.test(t) ? "money_market" : null;
  // A country named as the investor's home is not an investment region.
  const forCategories = COUNTRY.reduce((s, [re]) => (investorCountry && re.test(s) ? s.replace(re, " ") : s), t);
  const categories = index ? [] : inferCategories(forCategories).filter((c) => !["government-bonds", "aggregate-bonds", "corporate-bonds", "gold"].includes(c) || assetClass);
  const issuer = ISSUERS.find((i) => t.toLowerCase().includes(i)) ?? null;
  const ucitsOnly = /\bucits\b|\bopcvm\b/i.test(t);
  const keywords = !index && !categories.length && !assetClass ? (t.toLowerCase().match(/[a-z&-]{4,}/g) ?? []).filter((w) => !STOP.has(w)).slice(0, 4) : [];
  return { text: t, index, investorCountry, distribution, hedged, replication, assetClass, categories, issuer, ucitsOnly, keywords };
}

const STOP = new Set(["find", "best", "looking", "want", "with", "that", "from", "what", "which", "cheapest", "cheap", "lowest", "good", "funds", "fund", "etfs", "investor", "investors", "investing", "invest", "tracking", "track", "tracks", "should", "take", "account", "considering", "consider", "resident", "please", "show", "cherche", "meilleur", "meilleurs", "pour", "investisseur", "suisse", "swiss", "ucits", "accumulating", "distributing", "physical", "synthetic", "hedged", "unhedged", "long", "term", "low-cost", "cost", "fees", "high", "liquidity", "large", "about"]);
