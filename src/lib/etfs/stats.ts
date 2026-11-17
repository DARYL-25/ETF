import { query } from "@/lib/db/client";
import type { EtfRow } from "./queries";
import { themeBySlug } from "./themes";

/**
 * Fee and size statistics for groups of comparable ETFs: funds on the same index, or funds on the same theme.
 * Fees above 3% a year are left out as likely data errors (a fee stored in the wrong unit), leveraged and
 * inverse funds are left out because they are a different product, and the median is shown with the
 * average because a few expensive funds can pull an average up.
 */
export const FEE_CEILING = 3;

export type GroupStats = { kind: "index" | "theme"; slug: string; label: string; n: number; withFee: number; avg: number | null; median: number | null; min: number | null; max: number | null; cheapest: { key: string; name: string; fee: number } | null; largest: { key: string; name: string; size: number } | null };

const BASE = `not ('leveraged-inverse' = any(category_slugs))`;

function summarise(kind: GroupStats["kind"], slug: string, label: string, rows: { etf_key: string; name: string; headline_fee_pct: number | null; size_eur: number | null }[]): GroupStats {
  const fees = rows.map((r) => r.headline_fee_pct).filter((v): v is number => v !== null && v > 0 && v <= FEE_CEILING).sort((a, b) => a - b);
  const mid = fees.length ? (fees.length % 2 ? fees[(fees.length - 1) / 2] : (fees[fees.length / 2 - 1] + fees[fees.length / 2]) / 2) : null;
  const cheap = rows.filter((r) => r.headline_fee_pct !== null && r.headline_fee_pct > 0 && r.headline_fee_pct <= FEE_CEILING).sort((a, b) => a.headline_fee_pct! - b.headline_fee_pct! || (b.size_eur ?? 0) - (a.size_eur ?? 0))[0];
  const big = rows.filter((r) => r.size_eur).sort((a, b) => b.size_eur! - a.size_eur!)[0];
  return {
    kind, slug, label, n: rows.length, withFee: fees.length,
    avg: fees.length ? fees.reduce((s, v) => s + v, 0) / fees.length : null, median: mid, min: fees[0] ?? null, max: fees.at(-1) ?? null,
    cheapest: cheap ? { key: cheap.etf_key, name: cheap.name, fee: cheap.headline_fee_pct! } : null,
    largest: big ? { key: big.etf_key, name: big.name, size: big.size_eur! } : null,
  };
}

export async function indexStats(slug: string, label?: string): Promise<GroupStats> {
  const rows = await query<{ etf_key: string; name: string; headline_fee_pct: number | null; size_eur: number | null; index_name: string | null }>(
    `select etf_key, name, headline_fee_pct, size_eur, index_name from public.etf_directory where index_slug = $1 and ${BASE}`, [slug]);
  return summarise("index", slug, label ?? rows[0]?.index_name ?? slug, rows);
}

export async function themeStats(slug: string): Promise<GroupStats> {
  const rows = await query<{ etf_key: string; name: string; headline_fee_pct: number | null; size_eur: number | null }>(
    `select etf_key, name, headline_fee_pct, size_eur from public.etf_directory where $1 = any(category_slugs) and ${BASE}`, [slug]);
  return summarise("theme", slug, themeBySlug(slug)?.label ?? slug, rows);
}

/** Every index and theme with at least three funds that have a fee, for the fee overview page. */
export async function allGroupStats(): Promise<{ indices: GroupStats[]; themes: GroupStats[] }> {
  const rows = await query<{ etf_key: string; name: string; headline_fee_pct: number | null; size_eur: number | null; index_slug: string | null; index_name: string | null; category_slugs: string[] }>(
    `select etf_key, name, headline_fee_pct, size_eur, index_slug, index_name, category_slugs from public.etf_directory where ${BASE} and (index_slug is not null or cardinality(category_slugs) > 0)`);
  const byIndex = new Map<string, typeof rows>(), byTheme = new Map<string, typeof rows>();
  for (const r of rows) {
    if (r.index_slug) byIndex.set(r.index_slug, [...(byIndex.get(r.index_slug) ?? []), r]);
    for (const c of r.category_slugs) if (themeBySlug(c)) byTheme.set(c, [...(byTheme.get(c) ?? []), r]);
  }
  const keep = (g: GroupStats) => g.withFee >= 3;
  return {
    indices: [...byIndex.entries()].map(([slug, rs]) => summarise("index", slug, rs[0].index_name ?? slug, rs)).filter(keep).sort((a, b) => b.n - a.n),
    themes: [...byTheme.entries()].map(([slug, rs]) => summarise("theme", slug, themeBySlug(slug)!.label, rs)).filter(keep).sort((a, b) => b.n - a.n),
  };
}

export type PeerPosition = { group: GroupStats; feeRank: number | null; sizeRank: number | null; withSize: number; syntheticPeers: number };

/** Where one fund stands among the funds on its index, or on its main theme when it has no index. */
export async function peerPosition(row: EtfRow): Promise<PeerPosition | null> {
  const theme = row.category_slugs.find((c) => themeBySlug(c)?.kind === "theme") ?? row.category_slugs.find((c) => themeBySlug(c));
  const where = row.index_slug ? "index_slug = $1" : theme ? "$1 = any(category_slugs)" : null;
  if (!where) return null;
  const slug = row.index_slug ?? theme!;
  const rows = await query<{ etf_key: string; name: string; headline_fee_pct: number | null; size_eur: number | null; replication: string | null; index_name: string | null }>(
    `select etf_key, name, headline_fee_pct, size_eur, replication, index_name from public.etf_directory where ${where} and ${BASE}`, [slug]);
  if (rows.length < 3) return null;
  const group = summarise(row.index_slug ? "index" : "theme", slug, row.index_slug ? row.index_name ?? slug : themeBySlug(slug)?.label ?? slug, rows);
  const key = row.etf_key ?? row.isin;
  const fees = rows.filter((r) => r.headline_fee_pct !== null && r.headline_fee_pct > 0 && r.headline_fee_pct <= FEE_CEILING);
  const sizes = rows.filter((r) => r.size_eur);
  const fee = row.headline_fee_pct;
  const size = row.size_eur ?? null;
  return {
    group,
    feeRank: fee !== null && fee <= FEE_CEILING ? fees.filter((r) => r.headline_fee_pct! < fee).length + 1 : null,
    sizeRank: size ? sizes.filter((r) => r.size_eur! > size).length + 1 : null,
    withSize: sizes.length,
    syntheticPeers: rows.filter((r) => r.replication === "synthetic_swap" && r.etf_key !== key).length,
  };
}
