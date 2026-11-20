/**
 * The cost of owning an ETF, beyond its yearly fee. A month-by-month model: contributions are bought at the
 * ask (half the spread), pay the broker's fee and any currency conversion, then grow at the gross return
 * minus the fund's fee and its tracking difference beyond the fee. At the end the holding is sold, which
 * costs the spread, the broker and the conversion once more. Every input is shown, so the result is an
 * illustration of the reader's assumptions, never a forecast.
 */
export type CostInput = {
  initial: number;
  monthly: number;
  years: number;
  /** Gross yearly return of the index, in percent, before any cost. */
  grossPct: number;
  /** The fund's ongoing charge, in percent a year. */
  feePct: number;
  /** Tracking difference beyond the fee, in percent a year. Positive costs money; negative means the fund beat its index net of fee. */
  trackingPct: number;
  /** Full bid-ask spread, in percent. Each purchase and the final sale pay half of it. */
  spreadPct: number;
  /** Broker: fixed fee per order and a percentage of the order. */
  orderFee: number;
  orderPct: number;
  /** Currency conversion, in percent of each order, when the fund trades in another currency than the account. */
  fxPct: number;
  /** Include the costs of selling everything at the end. */
  sellAtEnd: boolean;
};

export type CostBreakdown = { fund_fee: number; tracking: number; spread: number; broker: number; fx: number };
export type CostResult = { contributed: number; noCost: number; final: number; total_cost: number; cost_pct_of_no_cost: number; parts: CostBreakdown; yearly: { year: number; value: number; noCost: number }[] };

type Parts = { fee: boolean; tracking: boolean; spread: boolean; broker: boolean; fx: boolean };
const ALL: Parts = { fee: true, tracking: true, spread: true, broker: true, fx: true };

function run(x: CostInput, on: Parts): { final: number; yearly: number[] } {
  const months = Math.round(x.years * 12);
  const drag = (on.fee ? x.feePct : 0) + (on.tracking ? x.trackingPct : 0);
  const monthly = Math.pow(1 + (x.grossPct - drag) / 100, 1 / 12) - 1;
  const buy = (amount: number) => {
    if (amount <= 0) return 0;
    let net = amount;
    if (on.broker) net -= x.orderFee + (amount * x.orderPct) / 100;
    if (on.fx) net -= (amount * x.fxPct) / 100;
    if (on.spread) net /= 1 + x.spreadPct / 200;
    return Math.max(0, net);
  };
  let value = buy(x.initial);
  const yearly: number[] = [];
  for (let m = 1; m <= months; m++) {
    value *= 1 + monthly;
    if (x.monthly > 0) value += buy(x.monthly);
    if (m % 12 === 0) yearly.push(value);
  }
  if (x.sellAtEnd && value > 0) {
    if (on.spread) value *= 1 - x.spreadPct / 200;
    if (on.fx) value *= 1 - x.fxPct / 100;
    if (on.broker) value -= x.orderFee + (value * x.orderPct) / 100;
  }
  return { final: Math.max(0, value), yearly };
}

export function trueCost(x: CostInput): CostResult {
  const none: Parts = { fee: false, tracking: false, spread: false, broker: false, fx: false };
  const all = run(x, ALL), zero = run(x, none);
  // Each part is measured on its own: the money it alone would take. The parts can add up to slightly more or
  // less than the total, because costs compound on each other.
  const only = (k: keyof Parts) => zero.final - run(x, { ...none, [k]: true }).final;
  const contributed = x.initial + x.monthly * Math.round(x.years * 12);
  return {
    contributed, noCost: zero.final, final: all.final, total_cost: zero.final - all.final,
    cost_pct_of_no_cost: zero.final ? ((zero.final - all.final) / zero.final) * 100 : 0,
    parts: { fund_fee: only("fee"), tracking: only("tracking"), spread: only("spread"), broker: only("broker"), fx: only("fx") },
    yearly: all.yearly.map((v, i) => ({ year: i + 1, value: v, noCost: zero.yearly[i] })),
  };
}

export const HORIZONS = [5, 10, 20, 30] as const;

/** The same inputs over 5, 10, 20 and 30 years. */
export const overHorizons = (x: Omit<CostInput, "years">) => HORIZONS.map((years) => ({ years, ...trueCost({ ...x, years }) }));

/**
 * The yearly tracking difference beyond the fee that we can measure from data: among funds on one index that
 * report one-year NAV returns to the same date, how far this fund trailed the best one, minus the part of the
 * gap explained by the fee difference. One year only, so it is noisy, and it is relative to the best fund, not
 * to the index, because index returns need a licence.
 */
export function measuredTracking(behindBestPts: number, feePct: number, bestFeePct: number): number {
  return behindBestPts - (feePct - bestFeePct);
}
