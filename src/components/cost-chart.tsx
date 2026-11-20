"use client";

import { useT } from "@/lib/i18n/client";

export type CostPoint = { year: number; noCost: number; value: number; paid?: number };

/**
 * Growth with and without costs, the gap between them shaded as what fees and costs took. Optionally a third
 * line for what was paid in, so the reader sees growth, costs and contributions on one picture.
 */
export function CostChart({ series, money, label, start }: { series: CostPoint[]; money: (v: number) => string; label?: string; start: { noCost: number; value: number; paid?: number } }) {
  const t = useT();
  if (!series.length) return null;
  const pts = [{ year: 0, ...start }, ...series];
  const W = 640, H = 230, L = 70, R = 96, T = 12, B = 26;
  const max = Math.max(...pts.map((p) => p.noCost), 1);
  const years = series.at(-1)!.year;
  const x = (y: number) => L + (y / years) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (k: "noCost" | "value" | "paid") => pts.filter((p) => p[k] !== undefined).map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p[k]!).toFixed(1)}`).join(" ");
  const gap = [...pts.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.noCost).toFixed(1)}`), ...[...pts].reverse().map((p) => `L${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`), "Z"].join(" ");
  const last = pts.at(-1)!;
  const step = years > 20 ? 10 : 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label ?? t("Value with and without costs")}>
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(f * max)} y2={y(f * max)} stroke="var(--line)" /><text x={L - 6} y={y(f * max) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{money(f * max)}</text></g>)}
      {Array.from({ length: Math.floor(years / step) + 1 }, (_, i) => i * step).map((yr) => <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{yr}</text>)}
      <path d={gap} fill="var(--saffron)" opacity="0.35" />
      <path d={line("noCost")} fill="none" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1.5" />
      <path d={line("value")} fill="none" stroke="var(--pine)" strokeWidth="2.5" />
      {pts.some((p) => p.paid !== undefined) ? <path d={line("paid")} fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.5" /> : null}
      <text x={x(years) + 6} y={y(last.noCost) + 4} fontSize="11" fill="var(--muted)">{t("No costs")}</text>
      <text x={x(years) + 6} y={y(last.value) + 12} fontSize="11" fill="var(--pine)">{t("After costs")}</text>
      <text x={x(years) + 6} y={(y(last.noCost) + y(last.value)) / 2 + 4} fontSize="11" fill="var(--ink)">{t("Costs: {v}", { v: money(last.noCost - last.value) })}</text>
    </svg>
  );
}
