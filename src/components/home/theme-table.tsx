"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export type ThemeRow = { key: string; ticker: string | null; name: string; where: string; fee: number };
export type ThemeSet = { slug: string; label: string; total: number; rows: ThemeRow[] };

/** Pick a theme, see its largest ETFs ranked by yearly fee, with a bar against the dearest. */
export function ThemeTable({ themes }: { themes: ThemeSet[] }) {
  const t = useT();
  const [on, setOn] = useState(themes[0]?.slug);
  const theme = themes.find((x) => x.slug === on) ?? themes[0];
  if (!theme) return null;
  const rows = [...theme.rows].sort((a, b) => a.fee - b.fee);
  const max = Math.max(...rows.map((r) => r.fee), 0.01);
  const min = rows[0]?.fee;
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("Themes")} className="flex flex-wrap gap-2.5">
        {themes.map((x) => (
          <button key={x.slug} type="button" role="tab" aria-selected={x.slug === theme.slug} onClick={() => setOn(x.slug)}
            className={`cursor-pointer rounded-full border px-4 py-2.5 text-[0.95rem] font-semibold transition-colors ${x.slug === theme.slug ? "border-navy bg-navy text-navy-ink" : "border-line-strong bg-surface text-ink hover:border-pine hover:text-pine"}`}>
            {t(x.label)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
        <table key={theme.slug} className="w-full min-w-[640px] border-collapse text-[0.95rem]">
          <thead>
            <tr className="text-left text-[0.8rem] text-muted">
              <th className="px-6 py-4 font-semibold">{t("Ticker")}</th>
              <th className="px-3 py-4 font-semibold">{t("Fund")}</th>
              <th className="px-3 py-4 font-semibold">{t("Domicile")}</th>
              <th className="px-3 py-4 text-right font-semibold">{t("Yearly fee")}</th>
              <th className="w-[28%] px-6 py-4 font-semibold">{t("Fee vs. cheapest")}</th>
            </tr>
          </thead>
          <tbody className="rows-in">
            {rows.map((r, i) => (
              <tr key={r.key} className="border-t border-line transition-colors hover:bg-cloud" style={{ "--i": i } as React.CSSProperties}>
                <td className="font-display px-6 py-4 font-bold">{r.ticker ?? "—"}</td>
                <td className="px-3 py-4"><Link href={`/etfs/${r.key}`} className="no-underline hover:text-pine">{r.name}</Link></td>
                <td className="px-3 py-4 text-muted">{r.where}</td>
                <td className="data px-3 py-4 text-right font-semibold">{r.fee.toFixed(2)}%</td>
                <td className="px-6 py-4">
                  <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className="grow-bar h-full rounded-full" style={{ width: `${Math.max(4, (r.fee / max) * 100).toFixed(2)}%`, backgroundColor: r.fee === min ? "var(--pine)" : "var(--sky-soft)", animationDelay: `${i * 60}ms` }} /></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.85rem] text-muted">{t("The largest funds on this theme with a published fee, cheapest first.")} <Link href={`/themes/${theme.slug}`} className="prose-link">{t("See all {n} ETFs on this theme", { n: theme.total.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB") })}</Link></p>
    </div>
  );
}
