import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import type { Quality } from "@/lib/etfs/quality";

/** The quality score with each part, its rule's basis and what could not be scored. */
export async function QualityPanel({ quality }: { quality: Quality }) {
  const t = await getT();
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        {quality.score !== null ? <p className="stat-value">{quality.grade} <span className="text-[1rem] text-muted">{quality.score.toFixed(0)}/100</span></p> : <p className="font-semibold">{t("Not enough data to score this fund.")}</p>}
        <p className="text-[0.85rem] text-muted">{t("Scored on {pct}% of the method's weight.", { pct: quality.scored_weight.toFixed(0) })}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {quality.parts.map((p) => (
          <li key={p.id}>
            <div className="flex justify-between gap-3"><span>{t(p.label)} <span className="text-[0.82rem] text-muted">({t("weight {w}%", { w: p.weight })})</span></span><span className="data">{p.score === null ? t("Not scored") : p.score.toFixed(0)}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-pine" style={{ width: `${p.score ?? 0}%` }} /></div>
            <p className="mt-0.5 text-[0.82rem] text-muted">{t(p.basis, p.vars)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.85rem] text-muted">{t("A score of how well the fund does the job of an index fund, from facts we hold. It does not say whether the index suits you, and no issuer pays for or influences it.")} <Link className="prose-link" href="/methodology#quality">{t("How it is calculated")}</Link></p>
    </div>
  );
}
