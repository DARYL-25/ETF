"use client";

import { useT } from "@/lib/i18n/client";
import { useState } from "react";
import { feeImpact, futureValue } from "@/lib/academy/calc";
import { CostChart } from "./cost-chart";

/** Turns a yearly fee into money, on an amount and period the reader chooses. An illustration, not a forecast. */
export function CostCalculator({ feePct, cheapestPct, currency }: { feePct: number; cheapestPct: number | null; currency: string }) {
  const t = useT();
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(10);
  const [growth, setGrowth] = useState(5);
  const money = (v: number) => new Intl.NumberFormat(t.lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  const valid = amount > 0 && years > 0 && years <= 60 && growth > -50 && growth < 50;
  const cost = valid ? feeImpact(amount, 0, growth, feePct, years).cost : 0;
  const cheapest = valid && cheapestPct !== null && cheapestPct < feePct ? feeImpact(amount, 0, growth, cheapestPct, years).cost : null;
  const field = "field mt-1 font-normal";
  return (
    <div className="panel p-4">
      <h3 className="text-[1.05rem]">{t("What this fee costs in money")}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <label className="text-[0.85rem] text-muted">{t("Amount (")}{currency})<input className={field} type="number" inputMode="numeric" min={1} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        <label className="text-[0.85rem] text-muted">{t("Years")}<input className={field} type="number" inputMode="numeric" min={1} max={60} value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
        <label className="text-[0.85rem] text-muted">{t("Growth a year, %")}<input className={field} type="number" inputMode="decimal" step={0.5} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} /></label>
      </div>
      {valid ? (
        <p className="mt-3" aria-live="polite">
          {t("Over {years}, a {fee}% fee takes about", { years: years === 1 ? t("1 year") : t("{n} years", { n: years }), fee: feePct.toFixed(2) })} <strong className="data text-[1.15rem]">{money(cost)}</strong> {t("from {amount}.", { amount: money(amount) })}
          {cheapest !== null ? <> {t("The cheapest fund on the same index, at {fee}%, would take about", { fee: cheapestPct!.toFixed(2) })} <strong className="data">{money(cheapest)}</strong>.</> : null}
        </p>
      ) : <p className="mt-3 text-muted">{t("Enter an amount, a period of 1 to 60 years and a growth rate.")}</p>}
      {valid ? <div className="mt-2"><CostChart series={Array.from({ length: years }, (_, i) => ({ year: i + 1, noCost: futureValue(amount, 0, growth, i + 1), value: futureValue(amount, 0, growth, i + 1) - feeImpact(amount, 0, growth, feePct, i + 1).cost }))} start={{ noCost: amount, value: amount }} money={money} label={t("Growth with and without this fee")} /></div> : null}
      <p className="mt-2 text-[0.82rem] text-muted">{t("An illustration with a constant growth rate you choose. Real returns vary, and the fee is not the only cost: see how funds on the same index actually compared on the index page.")}</p>
    </div>
  );
}
