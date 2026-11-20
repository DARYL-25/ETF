/**
 * Watchlist intelligence. When a reader adds an ETF to a list, we keep what it looked like then. Each visit
 * compares that snapshot with today's record and reports what changed: a fee cut or rise, a fund that shrank
 * sharply, or a fund that is no longer in our database, which can mean it closed, merged or changed its ISIN.
 */
export type Snapshot = { fee: number | null; size: number | null; name: string; seen_on: string };
export type Current = { fee: number | null; size: number | null; name: string } | null;
export type Change = { key: string; kind: "fee_down" | "fee_up" | "shrank" | "grew" | "renamed" | "missing"; text: string; vars: Record<string, string>; severity: "high" | "medium" | "low" };

export function snapshotOf(row: { headline_fee_pct: number | null; size_eur?: number | null; fund_aum_eur?: number | null; name: string }, today = new Date().toISOString().slice(0, 10)): Snapshot {
  return { fee: row.headline_fee_pct, size: row.size_eur ?? row.fund_aum_eur ?? null, name: row.name, seen_on: today };
}

export function changes(key: string, before: Snapshot | undefined, now: Current): Change[] {
  if (!before) return [];
  const out: Change[] = [];
  const since = before.seen_on;
  if (now === null) return [{ key, kind: "missing", severity: "high", text: "{name} is no longer in our database. It may have closed, merged into another fund or changed its ISIN. Check the issuer's notices.", vars: { name: before.name, since } }];
  if (before.fee !== null && now.fee !== null && Math.abs(now.fee - before.fee) >= 0.005) {
    const down = now.fee < before.fee;
    out.push({ key, kind: down ? "fee_down" : "fee_up", severity: down ? "low" : "medium", text: down ? "{name} cut its fee from {from}% to {to}% since {since}." : "{name} raised its fee from {from}% to {to}% since {since}.", vars: { name: now.name, from: before.fee.toFixed(2), to: now.fee.toFixed(2), since } });
  }
  if (before.size !== null && now.size !== null && before.size > 0) {
    const change = (now.size / before.size - 1) * 100;
    if (change <= -25) out.push({ key, kind: "shrank", severity: now.size < 100e6 ? "high" : "medium", text: "{name} shrank by {pct}% since {since}. Funds that lose assets fast are closed or merged more often.", vars: { name: now.name, pct: Math.abs(change).toFixed(0), since } });
    else if (change >= 50) out.push({ key, kind: "grew", severity: "low", text: "{name} grew by {pct}% since {since}.", vars: { name: now.name, pct: change.toFixed(0), since } });
  }
  if (before.name && now.name && before.name !== now.name) out.push({ key, kind: "renamed", severity: "low", text: "{old} is now called {name}. A new name can mean a new index or strategy, so check what changed.", vars: { old: before.name, name: now.name, since } });
  return out;
}
