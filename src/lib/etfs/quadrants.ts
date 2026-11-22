import { query } from "@/lib/db/client";
import { FEE_CEILING } from "./stats";
import { themeBySlug } from "./themes";

/**
 * Fee against fund size, for every fund in a group of comparable ETFs. The two medians split the chart into four
 * quadrants: large and cheap, large and dear, small and cheap, small and dear. Size stands for liquidity: a larger
 * fund usually trades on tighter spreads and is less likely to close. Only funds with both figures on file are
 * drawn; the rest are counted so the chart never looks more complete than it is.
 */
export type Region = "eu" | "us" | "other";
export type QuadPoint = { key: string; name: string; ticker: string | null; issuer: string; fee: number; size: number; domicile: string | null; region: Region; replication: string | null; distribution: string | null; hedged: boolean };
export type Quadrant = { kind: "index" | "theme"; slug: string; label: string; points: QuadPoint[]; missing: number; medianFee: number; medianSize: number; counts: Record<Region, number> };
export type QuadGroup = { kind: "index" | "theme"; slug: string; label: string; n: number; eu: number; us: number };

/** EU and EEA domiciles where UCITS funds are set up, with Switzerland and the UK, which European investors also buy. */
const EUROPE = new Set(["IE", "LU", "FR", "DE", "NL", "AT", "BE", "ES", "IT", "FI", "SE", "DK", "PT", "LI", "CH", "GB", "NO", "PL", "GR", "CZ", "HU"]);
export const regionOf = (domicile: string | null): Region => (domicile === "US" ? "us" : domicile && EUROPE.has(domicile) ? "eu" : "other");

const MIN_POINTS = 5;
const BASE = `not ('leveraged-inverse' = any(category_slugs)) and headline_fee_pct > 0 and headline_fee_pct <= ${FEE_CEILING}`;
const COLS = "etf_key, name, ticker, issuer_name, headline_fee_pct, size_eur, domicile, replication, distribution_policy, hedged, index_slug, index_name, category_slugs";

type Row = { etf_key: string; name: string; ticker: string | null; issuer_name: string; headline_fee_pct: number; size_eur: number | null; domicile: string | null; replication: string | null; distribution_policy: string | null; hedged: boolean | null; index_slug: string | null; index_name: string | null; category_slugs: string[] };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

function build(kind: Quadrant["kind"], slug: string, label: string, rows: Row[]): Quadrant {
  const seen = new Set<string>();
  const points: QuadPoint[] = [];
  let missing = 0;
  for (const r of rows) {
    if (seen.has(r.etf_key)) continue;
    seen.add(r.etf_key);
    if (!r.size_eur || r.size_eur <= 0) { missing++; continue; }
    points.push({ key: r.etf_key, name: r.name, ticker: r.ticker, issuer: r.issuer_name, fee: r.headline_fee_pct, size: r.size_eur, domicile: r.domicile, region: regionOf(r.domicile), replication: r.replication, distribution: r.distribution_policy, hedged: r.hedged === true });
  }
  const counts = { eu: 0, us: 0, other: 0 } as Record<Region, number>;
  for (const p of points) counts[p.region]++;
  return { kind, slug, label, points, missing, medianFee: median(points.map((p) => p.fee)), medianSize: median(points.map((p) => p.size)), counts };
}

export async function indexQuadrant(slug: string): Promise<Quadrant | null> {
  const rows = await query<Row>(`select ${COLS} from public.etf_directory where index_slug = $1 and ${BASE}`, [slug]);
  if (!rows.length) return null;
  return build("index", slug, rows.find((r) => r.index_name)?.index_name ?? slug, rows);
}

export async function themeQuadrant(slug: string): Promise<Quadrant | null> {
  const theme = themeBySlug(slug);
  if (!theme) return null;
  const rows = await query<Row>(`select ${COLS} from public.etf_directory where $1 = any(category_slugs) and ${BASE}`, [slug]);
  return build("theme", slug, theme.label, rows);
}

/** Every index and theme with enough funds to draw, largest first. One query, grouped in memory. */
export async function quadrantGroups(): Promise<{ indices: QuadGroup[]; themes: QuadGroup[] }> {
  const rows = await query<Pick<Row, "etf_key" | "domicile" | "index_slug" | "index_name" | "category_slugs">>(
    `select etf_key, domicile, index_slug, index_name, category_slugs from public.etf_directory where ${BASE} and size_eur > 0`);
  const idx = new Map<string, QuadGroup>(), thm = new Map<string, QuadGroup>();
  const add = (m: Map<string, QuadGroup>, kind: QuadGroup["kind"], slug: string, label: string, dom: string | null) => {
    const g = m.get(slug) ?? { kind, slug, label, n: 0, eu: 0, us: 0 };
    g.n++;
    const r = regionOf(dom);
    if (r === "eu") g.eu++; else if (r === "us") g.us++;
    m.set(slug, g);
  };
  for (const r of rows) {
    if (r.index_slug) add(idx, "index", r.index_slug, r.index_name ?? r.index_slug, r.domicile);
    for (const c of r.category_slugs) { const th = themeBySlug(c); if (th) add(thm, "theme", c, th.label, r.domicile); }
  }
  const keep = (g: QuadGroup) => g.n >= MIN_POINTS;
  return { indices: [...idx.values()].filter(keep).sort((a, b) => b.n - a.n), themes: [...thm.values()].filter(keep).sort((a, b) => b.n - a.n) };
}

/** Which quadrant a fund falls in, for a sentence on its page. */
export function quadrantOf(q: Quadrant, key: string): "large-cheap" | "large-dear" | "small-cheap" | "small-dear" | null {
  const p = q.points.find((x) => x.key === key);
  if (!p || q.points.length < MIN_POINTS) return null;
  const large = p.size >= q.medianSize, cheap = p.fee <= q.medianFee;
  return `${large ? "large" : "small"}-${cheap ? "cheap" : "dear"}`;
}
