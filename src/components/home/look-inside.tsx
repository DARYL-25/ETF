"use client";

import Link from "next/link";
import { useState } from "react";
import { squarify } from "@/lib/etfs/treemap";
import { useT } from "@/lib/i18n/client";

export type LookFund = { key: string; label: string; name: string; n: number; asOf: string | null; holdings: { holding_key: string; name: string; ticker: string | null; weight_pct: number }[] };

const SHADES = ["#1A8CFF", "#2E97FF", "#43A2FF", "#5AADFF", "#6FB8FF", "#84C3FF", "#97CCFF", "#A9D5FF", "#BADDFF", "#C9E5FF", "#D6EBFF", "#E2F1FF"];
const short = (name: string) => name.replace(/\b(Inc|Corp|Corporation|Co|Ltd|Plc|PLC|SA|AG|NV|Class [A-C]|Cl [A-C]|Holdings?|Group)\b\.?,?/g, "").replace(/\s+/g, " ").trim();

/** "Look inside": a fund's twelve largest holdings as tiles on navy, sized by weight. Hover a tile to read it. */
export function LookInside({ funds }: { funds: LookFund[] }) {
  const t = useT();
  const [on, setOn] = useState(funds[0]?.key);
  const [hover, setHover] = useState<string | null>(null);
  const fund = funds.find((f) => f.key === on) ?? funds[0];
  if (!fund) return null;
  const top = fund.holdings.slice(0, 12);
  const rects = squarify(top.map((h) => h.weight_pct), 100, 75);
  const hv = top.find((h) => h.holding_key === hover);
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[28px] bg-[#0A2A5E] p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-sky-soft">{t("Look inside")}</span>
          <Link href={`/etfs/${fund.key}`} className="font-display truncate text-[1.2rem] font-bold tracking-[-0.02em] text-white no-underline hover:text-ice">{fund.name}</Link>
        </div>
        <div role="tablist" aria-label={t("Fund to look inside")} className="seg seg-dark flex-wrap">
          {funds.map((f) => <button key={f.key} type="button" role="tab" aria-selected={f.key === fund.key} onClick={() => { setOn(f.key); setHover(null); }} className="font-display">{t(f.label)}</button>)}
        </div>
      </div>
      <ul key={fund.key} className="relative m-0 aspect-[4/3] w-full list-none overflow-hidden rounded-2xl bg-[#081F47] p-0" aria-label={t("Largest holdings of {name}", { name: fund.name })}>
        {rects.map((r, i) => {
          const h = top[i];
          const big = i < 3, mid = i < 7;
          return (
            <li key={h.holding_key} className="absolute p-[2px]" style={{ left: `${r.x.toFixed(3)}%`, top: `${((r.y / 75) * 100).toFixed(3)}%`, width: `${r.w.toFixed(3)}%`, height: `${((r.h / 75) * 100).toFixed(3)}%` }}>
              <Link href={`/holdings?key=${encodeURIComponent(h.holding_key)}`} onMouseEnter={() => setHover(h.holding_key)} onFocus={() => setHover(h.holding_key)}
                aria-label={`${h.name}, ${h.weight_pct.toFixed(1)}%`}
                className="rise flex h-full w-full flex-col items-start justify-between overflow-hidden rounded-[10px] p-2 no-underline transition-[filter,transform] duration-150 hover:z-10 hover:brightness-110 sm:p-2.5"
                style={{ backgroundColor: SHADES[i], color: i < 5 ? "#FFFFFF" : "#0A2A5E", animationDelay: `${i * 45}ms` }}>
                <span className="font-display max-w-full truncate font-bold tracking-[-0.02em]" style={{ fontSize: big ? "clamp(0.95rem,1.6vw,1.35rem)" : mid ? "0.95rem" : "0.78rem" }}>{h.ticker && /^[A-Z.]{1,6}$/.test(h.ticker) ? h.ticker : short(h.name).split(" ")[0]}</span>
                <span className="data text-[0.72rem] font-semibold opacity-85">{h.weight_pct.toFixed(1)}%</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap justify-between gap-2 text-[0.85rem] text-ice" aria-live="polite">
        <span>{hv ? <><b className="text-white">{short(hv.name)}</b> {t("{pct}% of the fund", { pct: hv.weight_pct.toFixed(2) })}</> : <><b className="text-white">{t("Hover a tile")}</b> {t("to see the company and its weight")}</>}</span>
        <span>{t("Top 12 of {n} holdings · tile size = weight", { n: fund.n.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB") })}</span>
      </div>
    </div>
  );
}
