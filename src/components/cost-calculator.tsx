"use client";

import { useState } from "react";
import { feeImpact } from "@/lib/academy/calc";

/** Turns a yearly fee into money, on an amount and period the reader chooses. An illustration, not a forecast. */
export function CostCalculator({ feePct, cheapestPct, currency }: { feePct: number; cheapestPct: number | null; currency: string }) {
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(10);
  const [growth, setGrowth] = useState(5);
  const money = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  const valid = amount > 0 && years > 0 && years <= 60 && growth > -50 && growth < 50;
  const cost = valid ? feeImpact(amount, 0, growth, feePct, years).cost : 0;
  const cheapest = valid && cheapestPct !== null && cheapestPct < feePct ? feeImpact(amount, 0, growth, cheapestPct, years).cost : null;
  const field = "field mt-1 font-normal";
  return (
    <div className="panel p-4">
      <h3 className="text-[1.05rem]">What this fee costs in money</h3>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <label className="text-[0.85rem] text-muted">Amount ({currency})<input className={field} type="number" inputMode="numeric" min={1} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        <label className="text-[0.85rem] text-muted">Years<input className={field} type="number" inputMode="numeric" min={1} max={60} value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
        <label className="text-[0.85rem] text-muted">Growth a year, %<input className={field} type="number" inputMode="decimal" step={0.5} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} /></label>
      </div>
      {valid ? (
        <p className="mt-3" aria-live="polite">
          Over {years} {years === 1 ? "year" : "years"}, a {feePct.toFixed(2)}% fee takes about <strong className="data text-[1.15rem]">{money(cost)}</strong> from {money(amount)}.
          {cheapest !== null ? <> The cheapest fund on the same index, at {cheapestPct!.toFixed(2)}%, would take about <strong className="data">{money(cheapest)}</strong>.</> : null}
        </p>
      ) : <p className="mt-3 text-muted">Enter an amount, a period of 1 to 60 years and a growth rate.</p>}
      <p className="mt-2 text-[0.82rem] text-muted">An illustration with a constant growth rate you choose. Real returns vary, and the fee is not the only cost: see how funds on the same index actually compared on the index page.</p>
    </div>
  );
}
