/**
 * Target allocation and drift. Given each fund's value and the reader's target share, says how far each
 * fund has drifted and what buying and selling would restore the targets, or how to split a new
 * contribution so it moves the portfolio back without selling. Arithmetic only: no fund is suggested.
 */
export type Holding = { key: string; name: string; value: number };
export type DriftRow = { key: string; name: string; value: number; weight_pct: number; target_pct: number; drift_pts: number; trade: number; contribution: number };
export type Drift = { rows: DriftRow[]; total: number; target_sum: number; max_drift_pts: number; breached: boolean };

export function drift(holdings: Holding[], targets: Record<string, number>, thresholdPts = 5, contribution = 0): Drift {
  const total = holdings.reduce((s, h) => s + h.value, 0);
  const keys = [...new Set([...holdings.map((h) => h.key), ...Object.keys(targets)])];
  const targetSum = keys.reduce((s, k) => s + (targets[k] ?? 0), 0);
  // Targets that do not add up to 100 are scaled, so 60 and 20 read as 75% and 25%.
  const scale = targetSum > 0 ? 100 / targetSum : 0;
  const rows = keys.map((key) => {
    const h = holdings.find((x) => x.key === key);
    const value = h?.value ?? 0;
    const weight = total ? (value / total) * 100 : 0;
    const target = (targets[key] ?? 0) * scale;
    return { key, name: h?.name ?? key, value, weight_pct: weight, target_pct: target, drift_pts: weight - target, trade: (target / 100) * total - value, contribution: 0 };
  });
  if (contribution > 0) {
    // Fill the gaps to target at the new total, largest gap first, without selling anything.
    const after = total + contribution;
    const gaps = rows.map((r) => Math.max(0, (r.target_pct / 100) * after - r.value));
    const gapSum = gaps.reduce((s, g) => s + g, 0);
    rows.forEach((r, i) => { r.contribution = gapSum > 0 ? (gaps[i] / gapSum) * Math.min(contribution, gapSum) + (gapSum < contribution ? (r.target_pct / 100) * (contribution - gapSum) : 0) : (r.target_pct / 100) * contribution; });
  }
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.drift_pts)));
  return { rows: rows.sort((a, b) => b.value - a.value), total, target_sum: targetSum, max_drift_pts: max, breached: targetSum > 0 && max >= thresholdPts };
}
