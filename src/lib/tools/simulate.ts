/**
 * Portfolio simulator. Builds a portfolio's expected return and volatility from asset-class assumptions the
 * reader can change, then runs many random monthly paths: saving first, then optionally withdrawing. It
 * reports the middle outcome and the range around it, the chance of ending below what was paid in, the
 * typical worst fall along the way, and how often the money lasts through withdrawals.
 *
 * These are assumptions, not history and not a forecast. The defaults are round long-run figures and are
 * shown on the page so the reader sees exactly what drives the result.
 */
export type AssetClass = "equity" | "fixed_income" | "money_market" | "commodities";
export const ASSET_CLASSES: AssetClass[] = ["equity", "fixed_income", "money_market", "commodities"];
export type Assumption = { returnPct: number; volPct: number };

/** Round long-run nominal assumptions, before fund fees. Shown and editable on the page. */
export const DEFAULT_ASSUMPTIONS: Record<AssetClass, Assumption> = {
  equity: { returnPct: 7, volPct: 16 },
  fixed_income: { returnPct: 3, volPct: 6 },
  money_market: { returnPct: 2, volPct: 1 },
  commodities: { returnPct: 4, volPct: 18 },
};

/** Correlations between asset classes, in the order of ASSET_CLASSES. */
const CORR: number[][] = [
  [1, 0.1, 0, 0.3],
  [0.1, 1, 0.3, 0],
  [0, 0.3, 1, 0],
  [0.3, 0, 0, 1],
];

export type Mix = Partial<Record<AssetClass, number>>;
export type SimInput = {
  mix: Mix;
  feePct: number;
  initial: number;
  monthly: number;
  years: number;
  inflationPct: number;
  /** Withdrawal phase after the saving years: monthly amount in today's money, and how many years. */
  withdrawMonthly: number;
  withdrawYears: number;
  assumptions?: Record<AssetClass, Assumption>;
  paths?: number;
  seed?: number;
};

export type Band = { year: number; p10: number; p50: number; p90: number; contributed: number };
export type SimResult = {
  expectedPct: number;
  volPct: number;
  bands: Band[];
  /** At the end of the saving phase, in money of that time and in today's money. */
  end: { p10: number; p50: number; p90: number; p10Real: number; p50Real: number; p90Real: number };
  contributed: number;
  /** Share of paths that end the saving phase below what was paid in. */
  lossChancePct: number;
  /** Median and bad-case (1 in 10) largest fall from a peak during the saving phase, in percent. */
  drawdown: { median: number; p90: number };
  /** Share of paths where the money lasts through the withdrawal years. Null without a withdrawal phase. */
  lastsPct: number | null;
  deterministic: number;
};

/** Mulberry32: a small seeded generator, so the same inputs always show the same result. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(next: () => number) {
  let u = 0;
  while (u === 0) u = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

/** Expected return and volatility of a mix, in percent a year, before fees. */
export function mixStats(mix: Mix, assumptions = DEFAULT_ASSUMPTIONS) {
  const total = ASSET_CLASSES.reduce((s, c) => s + (mix[c] ?? 0), 0) || 1;
  const w = ASSET_CLASSES.map((c) => (mix[c] ?? 0) / total);
  const mu = ASSET_CLASSES.reduce((s, c, i) => s + w[i] * assumptions[c].returnPct, 0);
  let variance = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) variance += w[i] * w[j] * (assumptions[ASSET_CLASSES[i]].volPct / 100) * (assumptions[ASSET_CLASSES[j]].volPct / 100) * CORR[i][j];
  return { returnPct: mu, volPct: Math.sqrt(variance) * 100 };
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

export function simulate(x: SimInput): SimResult {
  const stats = mixStats(x.mix, x.assumptions);
  const expected = stats.returnPct - x.feePct;
  const sigma = stats.volPct / 100;
  // Lognormal monthly steps whose yearly mean matches the expected return.
  const mu = Math.log(1 + expected / 100) / 12 - (sigma * sigma) / 24;
  const s = sigma / Math.sqrt(12);
  const paths = Math.min(5000, Math.max(200, x.paths ?? 2000));
  const months = Math.round(x.years * 12), wMonths = Math.round(x.withdrawYears * 12);
  const inflM = Math.pow(1 + x.inflationPct / 100, 1 / 12);
  const next = rng(x.seed ?? 42);
  const atYear: number[][] = Array.from({ length: x.years }, () => []);
  const ends: number[] = [], drawdowns: number[] = [];
  let lasted = 0;
  for (let p = 0; p < paths; p++) {
    let v = x.initial, peak = v, worst = 0;
    for (let m = 1; m <= months; m++) {
      v = v * Math.exp(mu + s * normal(next)) + x.monthly;
      peak = Math.max(peak, v);
      if (peak > 0) worst = Math.max(worst, 1 - v / peak);
      if (m % 12 === 0) atYear[m / 12 - 1].push(v);
    }
    ends.push(v);
    drawdowns.push(worst * 100);
    if (wMonths > 0) {
      let w = v, ok = true;
      for (let m = 1; m <= wMonths; m++) {
        // Withdrawals keep their buying power: today's amount, grown with inflation to that month.
        w = w * Math.exp(mu + s * normal(next)) - x.withdrawMonthly * Math.pow(inflM, months + m);
        if (w <= 0) { ok = false; break; }
      }
      if (ok) lasted++;
    }
  }
  const contributedAt = (year: number) => x.initial + x.monthly * year * 12;
  const bands = atYear.map((vals, i) => { const sorted = [...vals].sort((a, b) => a - b); return { year: i + 1, p10: quantile(sorted, 0.1), p50: quantile(sorted, 0.5), p90: quantile(sorted, 0.9), contributed: contributedAt(i + 1) }; });
  const sorted = [...ends].sort((a, b) => a - b);
  const deflate = Math.pow(1 + x.inflationPct / 100, x.years);
  const contributed = contributedAt(x.years);
  const dd = [...drawdowns].sort((a, b) => a - b);
  // The same contributions at the expected return, with no ups and downs.
  const r = Math.pow(1 + expected / 100, 1 / 12) - 1;
  let det = x.initial;
  for (let m = 0; m < months; m++) det = det * (1 + r) + x.monthly;
  return {
    expectedPct: expected, volPct: stats.volPct, bands,
    end: { p10: quantile(sorted, 0.1), p50: quantile(sorted, 0.5), p90: quantile(sorted, 0.9), p10Real: quantile(sorted, 0.1) / deflate, p50Real: quantile(sorted, 0.5) / deflate, p90Real: quantile(sorted, 0.9) / deflate },
    contributed, lossChancePct: (ends.filter((v) => v < contributed).length / paths) * 100,
    drawdown: { median: quantile(dd, 0.5), p90: quantile(dd, 0.9) },
    lastsPct: wMonths > 0 ? (lasted / paths) * 100 : null,
    deterministic: det,
  };
}
