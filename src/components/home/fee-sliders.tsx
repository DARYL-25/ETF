"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

const FEES = [0.07, 0.22, 0.68];
const COLORS = ["var(--pine)", "#4BA6FF", "var(--navy)"];
const RETURN = 6;

/** Same money, three yearly fees: what each one costs over the years, compared with no fee at all. */
export function FeeSliders() {
  const t = useT();
  const [amount, setAmount] = useState(50000);
  const [years, setYears] = useState(20);
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const r = RETURN / 100;
  const gross = amount * Math.pow(1 + r, years);
  const costs = FEES.map((f) => gross - amount * Math.pow(1 + r - f / 100, years));
  const top = Math.max(...costs);
  return (
    <div className="flex flex-wrap items-center gap-12">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
        <span className="eyebrow">{t("True cost")}</span>
        <h2 className="text-[clamp(1.9rem,3.6vw,3rem)]">{t("A small fee is not a small cost.")}</h2>
        <p className="text-[1.05rem] leading-relaxed text-muted">{t("Move the sliders. Same investment, three yearly fees, a {r}% yearly return before fees.", { r: RETURN })}</p>
        <label className="flex flex-col gap-2">
          <span className="flex justify-between font-semibold"><span>{t("Amount invested")}</span><span className="font-display">{money(amount)}</span></span>
          <input type="range" min={1000} max={200000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-7 w-full" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="flex justify-between font-semibold"><span>{t("Years")}</span><span className="font-display">{years}</span></span>
          <input type="range" min={5} max={30} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} className="h-7 w-full" />
        </label>
        <Link href="/tools/true-cost" className="prose-link self-start">{t("Work out the true cost of a real ETF")}</Link>
      </div>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6 rounded-[28px] bg-surface p-6 shadow-[0_30px_60px_-40px_rgba(10,42,94,.45)] sm:p-8">
        {FEES.map((f, i) => (
          <div key={f} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-muted">{t("Yearly fee")} <b className="text-ink">{f.toFixed(2)}%</b></span>
              <span className="font-display text-[1.6rem] font-extrabold tracking-[-0.03em]">{money(costs[i])}</span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(2, (costs[i] / top) * 100).toFixed(2)}%`, backgroundColor: COLORS[i] }} /></div>
          </div>
        ))}
        <p className="border-t border-line pt-4 text-[0.82rem] text-muted">{t("Money lost to fees over the period, compared with no fee at all. Illustration only, not a forecast.")}</p>
      </div>
    </div>
  );
}
