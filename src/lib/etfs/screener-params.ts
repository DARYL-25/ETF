import { z } from "zod";

/** Every screener filter lives in the URL, so a search can be shared by copying the link. */

export const SORT_COLUMNS = {
  name: "name",
  ticker: "ticker",
  issuer: "issuer_name",
  index: "index_name",
  domicile: "domicile",
  replication: "replication",
  fee: "headline_fee_pct",
  aum: "size_eur",
  return1y: "return_1y",
  return3y: "return_3y",
  yield: "trailing_yield_pct",
  currency: "currency",
} as const;

export type SortKey = keyof typeof SORT_COLUMNS;

/** Result columns people can switch on and off. ETF, fee and fund size are always shown. */
export const OPTIONAL_COLUMNS = [
  { key: "issuer", label: "Issuer" },
  { key: "index", label: "Index" },
  { key: "domicile", label: "Domicile" },
  { key: "replication", label: "Replication" },
  { key: "return1y", label: "1Y return" },
  { key: "return3y", label: "3Y return p.a." },
  { key: "yield", label: "Yield" },
  { key: "currency", label: "Currency" },
] as const;

export const DEFAULT_COLUMNS = ["index", "return1y", "return3y"];

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean).slice(0, 50));

const optionalNumber = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const raw = Array.isArray(v) ? v[0] : v;
    if (raw === undefined || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  });

const single = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "");

export const screenerSchema = z.object({
  q: single.transform((s) => s.slice(0, 100)),
  issuer: list,
  domicile: list,
  assetClass: list,
  region: list,
  factor: list,
  theme: list,
  bondType: list,
  cols: list,
  index: list,
  replication: list,
  distribution: list,
  style: list,
  currency: list,
  feeMax: optionalNumber,
  feeMin: optionalNumber,
  aumMin: optionalNumber,
  aumMax: optionalNumber,
  ucits: single.transform((s) => (s === "yes" || s === "no" ? s : "")),
  sort: single.transform((s): SortKey => (s in SORT_COLUMNS ? (s as SortKey) : "aum")),
  dir: single.transform((s) => (s === "asc" ? "asc" : s === "desc" ? "desc" : "")),
  page: optionalNumber.transform((n) => Math.max(1, Math.floor(n ?? 1))),
  pageSize: optionalNumber.transform((n) => Math.min(100, Math.max(1, Math.floor(n ?? 25)))),
});

export type ScreenerParams = z.output<typeof screenerSchema>;
export type RawParams = Record<string, string | string[] | undefined>;

export const parseScreenerParams = (raw: RawParams): ScreenerParams => screenerSchema.parse(raw);

/** Numbers read best biggest-first and fees cheapest-first, so these are the first-click directions. */
export function defaultDirection(sort: SortKey): "asc" | "desc" {
  return ["aum", "return1y", "return3y", "yield"].includes(sort) ? "desc" : "asc";
}

/** Query string for the same search with some values changed. Page resets unless set. */
export function screenerHref(params: ScreenerParams, change: Partial<ScreenerParams>): string {
  const next = { ...params, page: 1, ...change };
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) out.set(key, value.join(","));
    } else if (key === "page" && value === 1) {
      continue;
    } else if (key === "pageSize" && value === 25) {
      continue;
    } else if (key === "sort" && value === "aum" && !next.dir) {
      continue;
    } else {
      out.set(key, String(value));
    }
  }
  const text = out.toString();
  return text ? `/screener?${text}` : "/screener";
}

/** WHERE clause with numbered placeholders. Column names only ever come from this file. */
export function buildScreenerWhere(p: ScreenerParams): { where: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (fragment: (n: number) => string, value: unknown) => {
    values.push(value);
    clauses.push(fragment(values.length));
  };
  const anyOf = (column: string, items: string[]) => {
    if (items.length) add((n) => `${column} = any($${n}::text[])`, items);
  };

  if (p.q) {
    const like = `%${p.q.replace(/[\\%_]/g, "\\$&")}%`;
    add(
      (n) => `(name ilike $${n} or ticker ilike $${n} or fund_name ilike $${n} or isin ilike $${n} or index_name ilike $${n} or exists (
        select 1 from public.listings l join public.share_classes s on s.id = l.share_class_id
        where s.isin = etf_directory.isin and l.ticker ilike $${n}))`,
      like,
    );
  }
  anyOf("issuer_slug", p.issuer);
  anyOf("domicile", p.domicile);
  anyOf("asset_class", p.assetClass);
  anyOf("index_slug", p.index);
  anyOf("replication", p.replication);
  anyOf("distribution_policy", p.distribution);
  anyOf("management_style", p.style);
  anyOf("currency", p.currency);
  // Within one group any tick matches. Across groups all must match, so US + Technology narrows.
  for (const group of [p.region, p.factor, p.theme, p.bondType]) {
    if (group.length) add((n) => `category_slugs && $${n}::text[]`, group);
  }
  if (p.feeMin !== undefined) add((n) => `headline_fee_pct >= $${n}`, p.feeMin);
  if (p.feeMax !== undefined) add((n) => `headline_fee_pct <= $${n}`, p.feeMax);
  // The form takes fund size in millions of euro.
  if (p.aumMin !== undefined) add((n) => `size_eur >= $${n}`, p.aumMin * 1e6);
  if (p.aumMax !== undefined) add((n) => `size_eur <= $${n}`, p.aumMax * 1e6);
  if (p.ucits === "yes") clauses.push("ucits is true");
  if (p.ucits === "no") clauses.push("ucits is false");

  return { where: clauses.length ? `where ${clauses.join(" and ")}` : "", values };
}
