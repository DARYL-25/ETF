import type { EtfRow } from "./queries";

export type GapRow = { row: EtfRow; r1: number; r3: number | null; behind1: number; behind3: number | null };
export type GapGroup = { currency: string; asOf: string; rows: GapRow[] };

const hedged = (r: EtfRow) => r.hedged === true || /hedg/i.test(r.name);

/**
 * Funds on one index should earn the same before costs. Among those that report official NAV returns in the
 * same currency and to the same date, and are not currency-hedged, the difference between them is what
 * fees, taxes inside the fund and tracking really cost. Returns the largest such group, or null if none has three funds.
 */
export function returnGaps(etfs: EtfRow[]): GapGroup | null {
  const groups = new Map<string, EtfRow[]>();
  for (const r of etfs) {
    const currency = r.nav_currency ?? r.currency;
    if (r.nav_return_1y === null || r.nav_return_1y === undefined || !r.nav_return_as_of || !currency || hedged(r)) continue;
    const key = `${currency}|${r.nav_return_as_of}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const best = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (!best || best[1].length < 3) return null;
  const [currency, asOf] = best[0].split("|");
  const top1 = Math.max(...best[1].map((r) => r.nav_return_1y!));
  const threes = best[1].map((r) => r.nav_return_3y).filter((v): v is number => v !== null && v !== undefined);
  const top3 = threes.length >= 2 ? Math.max(...threes) : null;
  const rows = best[1]
    .map((row) => ({ row, r1: row.nav_return_1y!, r3: row.nav_return_3y ?? null, behind1: top1 - row.nav_return_1y!, behind3: top3 !== null && row.nav_return_3y !== null && row.nav_return_3y !== undefined ? top3 - row.nav_return_3y : null }))
    .sort((a, b) => a.behind1 - b.behind1);
  return { currency, asOf, rows };
}
