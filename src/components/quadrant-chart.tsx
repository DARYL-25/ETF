"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { Quadrant, QuadPoint, Region } from "@/lib/etfs/quadrants";

const W = 760, H = 460, PAD = { l: 64, r: 18, t: 18, b: 46 };
export const REGION_COLOR: Record<Region, string> = { eu: "#1A8CFF", us: "#F08A12", other: "#8DA2BF" };

function money(v: number, lang: string) {
  const units: [number, string][] = lang === "fr" ? [[1e12, " T€"], [1e9, " Md€"], [1e6, " M€"]] : [[1e12, "T"], [1e9, "bn"], [1e6, "m"]];
  for (const [d, u] of units) if (v >= d) return lang === "fr" ? `${(v / d).toLocaleString("fr-FR", { maximumFractionDigits: v / d < 10 ? 1 : 0 })}${u}` : `€${(v / d).toLocaleString("en-GB", { maximumFractionDigits: v / d < 10 ? 1 : 0 })}${u}`;
  return lang === "fr" ? `${Math.round(v / 1e3)} k€` : `€${Math.round(v / 1e3)}k`;
}

/**
 * Yearly fee across, fund size up on a log scale, one dot per fund: European-domiciled funds ringed in blue,
 * US-domiciled in orange. Dashed lines at the two medians make the four quadrants. Every dot is a link.
 */
export function QuadrantChart({ q, highlight, compact = false }: { q: Quadrant; highlight?: string; compact?: boolean }) {
  const t = useT();
  const [hidden, setHidden] = useState<Set<Region>>(new Set());
  const [hover, setHover] = useState<QuadPoint | null>(null);
  const [hedged, setHedged] = useState(false);
  const hedgedCount = q.points.filter((p) => p.hedged).length;
  const pts = q.points.filter((p) => !hidden.has(p.region) && (hedged || !p.hedged || p.key === highlight));
  const scale = useMemo(() => {
    const fees = q.points.map((p) => p.fee), sizes = q.points.map((p) => Math.log10(p.size));
    const fMax = Math.max(...fees) * 1.08, fMin = Math.max(0, Math.min(...fees) * 0.9 - 0.02);
    const sMin = Math.floor(Math.min(...sizes) * 2) / 2, sMax = Math.ceil(Math.max(...sizes) * 2) / 2 || sMin + 1;
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const x = (f: number) => r2(PAD.l + ((f - fMin) / (fMax - fMin || 1)) * (W - PAD.l - PAD.r));
    const y = (s: number) => r2(H - PAD.b - ((Math.log10(s) - sMin) / (sMax - sMin || 1)) * (H - PAD.t - PAD.b));
    const xTicks: number[] = [];
    const step = fMax - fMin > 0.6 ? 0.2 : fMax - fMin > 0.25 ? 0.1 : 0.05;
    for (let v = Math.ceil(fMin / step) * step; v <= fMax + 1e-9; v += step) xTicks.push(+v.toFixed(2));
    const yTicks: number[] = [];
    for (let e = Math.ceil(sMin); e <= sMax; e++) yTicks.push(10 ** e);
    return { x, y, xTicks, yTicks };
  }, [q.points]);
  // Label the largest funds, skipping any label that would sit on top of one already placed.
  const labelled = new Set<string>();
  const placed: [number, number][] = [];
  for (const p of [...(highlight ? q.points.filter((x) => x.key === highlight) : []), ...[...pts].sort((a, b) => b.size - a.size)]) {
    if (labelled.size >= (compact ? 5 : 9) || !p.ticker) continue;
    const at: [number, number] = [scale.x(p.fee), scale.y(p.size)];
    if (placed.some(([x, y]) => Math.abs(x - at[0]) < 46 && Math.abs(y - at[1]) < 14)) continue;
    placed.push(at); labelled.add(p.key);
  }
  const mx = scale.x(q.medianFee), my = scale.y(q.medianSize);
  const corner = "fill-[var(--muted)] text-[12px] font-semibold uppercase tracking-[0.08em]";
  const lang = t.lang;
  const shown = hover ?? (highlight ? q.points.find((p) => p.key === highlight) ?? null : null);

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("Show funds domiciled in")}>
        {(["eu", "us", "other"] as Region[]).filter((r) => q.counts[r]).map((r) => (
          <button key={r} type="button" aria-pressed={!hidden.has(r)} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(r)) n.delete(r); else n.add(r); return n; })}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[0.88rem] font-medium aria-[pressed=false]:opacity-45">
            <span aria-hidden className="inline-block size-3 rounded-full border-2" style={{ borderColor: REGION_COLOR[r], background: `${REGION_COLOR[r]}33` }} />
            {r === "eu" ? t("Domiciled in Europe") : r === "us" ? t("Domiciled in the US") : t("Elsewhere")} <span className="text-muted">{q.counts[r]}</span>
          </button>
        ))}
        {hedgedCount ? <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-[0.88rem] text-muted"><input type="checkbox" checked={hedged} onChange={(e) => setHedged(e.target.checked)} />{t("Show {n} currency-hedged share classes", { n: hedgedCount })}</label> : null}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={t("Yearly fee against fund size for {n} funds on {group}", { n: q.points.length, group: t(q.label) })}>
          <rect x={PAD.l} y={PAD.t} width={mx - PAD.l} height={my - PAD.t} fill="var(--pine)" opacity="0.06" />
          {scale.yTicks.map((v) => <g key={v}><line x1={PAD.l} x2={W - PAD.r} y1={scale.y(v)} y2={scale.y(v)} stroke="var(--line)" /><text x={PAD.l - 8} y={scale.y(v) + 4} textAnchor="end" className="fill-[var(--muted)] text-[11px]">{money(v, lang)}</text></g>)}
          {scale.xTicks.map((v) => <g key={v}><line x1={scale.x(v)} x2={scale.x(v)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" /><text x={scale.x(v)} y={H - PAD.b + 16} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">{v.toFixed(2)}%</text></g>)}
          <line x1={mx} x2={mx} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink)" strokeDasharray="5 5" opacity="0.5" />
          <line x1={PAD.l} x2={W - PAD.r} y1={my} y2={my} stroke="var(--ink)" strokeDasharray="5 5" opacity="0.5" />
          <text x={PAD.l + 8} y={PAD.t + 16} className={corner} style={{ fill: "var(--pine-deep)" }}>{t("Large and cheap")}</text>
          <text x={W - PAD.r - 8} y={PAD.t + 16} textAnchor="end" className={corner}>{t("Large but dear")}</text>
          <text x={PAD.l + 8} y={H - PAD.b - 8} className={corner}>{t("Small but cheap")}</text>
          <text x={W - PAD.r - 8} y={H - PAD.b - 8} textAnchor="end" className={corner}>{t("Small and dear")}</text>
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className="fill-[var(--muted)] text-[12px] font-semibold">{t("Yearly fee")} →</text>
          <text transform={`translate(14 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-[var(--muted)] text-[12px] font-semibold">{t("Fund size (log scale)")} →</text>
          {pts.sort((a, b) => b.size - a.size).map((p, i) => {
            const cx = scale.x(p.fee), cy = scale.y(p.size), me = p.key === highlight, c = REGION_COLOR[p.region];
            return (
              <Link key={p.key} href={`/etfs/${p.key}`} aria-label={`${p.name}: ${p.fee.toFixed(2)}%, ${money(p.size, lang)}`} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p)} onBlur={() => setHover(null)}>
                <circle cx={cx} cy={cy} r={me ? 10 : 6.5} fill={`${c}${me ? "cc" : "33"}`} stroke={c} strokeWidth={me ? 3 : 2} className="rise cursor-pointer transition-[r] duration-150 hover:[r:9]" style={{ animationDelay: `${Math.min(i, 40) * 12}ms` }} />
                {labelled.has(p.key) && p.ticker ? <text x={cx + (me ? 13 : 9)} y={cy + 4} className="pointer-events-none fill-[var(--ink)] text-[11px] font-semibold">{p.ticker}</text> : null}
              </Link>
            );
          })}
        </svg>
        {shown ? (
          <div className="pointer-events-none absolute right-2 top-2 max-w-[16rem] rounded-xl border border-line bg-surface/95 p-3 text-[0.85rem] shadow-lg backdrop-blur">
            <b className="block leading-snug">{shown.name}</b>
            <span className="text-muted">{[shown.ticker, shown.issuer, shown.domicile].filter(Boolean).join(" · ")}</span>
            <span className="mt-1 flex justify-between gap-3"><span>{t("Yearly fee")}</span><b>{shown.fee.toFixed(2)}%</b></span>
            <span className="flex justify-between gap-3"><span>{t("Fund size")}</span><b>{money(shown.size, lang)}</b></span>
            {shown.replication ? <span className="flex justify-between gap-3"><span>{t("Replication")}</span><b>{shown.replication === "synthetic_swap" ? t("Synthetic") : t("Physical")}</b></span> : null}
          </div>
        ) : null}
      </div>
      <figcaption className="text-[0.82rem] text-muted">
        {t("Dashed lines: median fee {fee}% and median size {size}. Size stands for liquidity: larger funds usually trade on tighter spreads and are less likely to close.", { fee: q.medianFee.toFixed(2), size: money(q.medianSize, lang) })}
        {q.missing ? " " + t("{n} more funds have no size on file and are not drawn.", { n: q.missing }) : ""}
      </figcaption>
    </figure>
  );
}
