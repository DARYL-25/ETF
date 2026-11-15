/** Educational calculators. Simple compounding with constant assumptions, before tax. */

/** Value after `years`, with `monthly` added at each month end and returns compounding monthly. */
export function futureValue(initial: number, monthly: number, annualPct: number, years: number): number {
  const rate = (1 + annualPct / 100) ** (1 / 12) - 1;
  let value = initial;
  for (let m = 0; m < Math.round(years * 12); m++) value = value * (1 + rate) + monthly;
  return value;
}

/** What a yearly fee costs: final value without the fee minus final value with it. */
export function feeImpact(initial: number, monthly: number, grossPct: number, feePct: number, years: number) {
  const without = futureValue(initial, monthly, grossPct, years);
  const withFee = futureValue(initial, monthly, grossPct - feePct, years);
  return { without, withFee, cost: without - withFee };
}

/** Compares reinvesting distributions against taking them out as cash, ignoring tax. */
export function reinvestment(initial: number, pricePct: number, yieldPct: number, years: number) {
  let cash = 0;
  let notReinvested = initial;
  let reinvested = initial;
  for (let y = 0; y < years; y++) {
    cash += notReinvested * (yieldPct / 100);
    notReinvested *= 1 + pricePct / 100;
    reinvested *= (1 + yieldPct / 100) * (1 + pricePct / 100);
  }
  return { reinvested, notReinvested, cash };
}

/** Return in your currency when the fund's currency moves against yours. */
export const currencyAdjustedReturn = (fundPct: number, currencyPct: number) => ((1 + fundPct / 100) * (1 + currencyPct / 100) - 1) * 100;
