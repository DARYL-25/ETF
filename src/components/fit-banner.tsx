import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { countryName, formatDate } from "@/lib/format";
import { SUITABILITY_READ_ON, suitability, type FitLevel } from "@/lib/etfs/suitability";
import type { EtfRow } from "@/lib/etfs/queries";

const PILL: Record<FitLevel, string> = { ok: "fit-yes", caution: "fit-check", poor: "fit-no", unavailable: "fit-no" };
const VERDICT: Record<FitLevel, string> = { ok: "Usually available", caution: "Check your broker", poor: "Usually a poor fit", unavailable: "Usually not sold" };

/** A design pill saying whether a private investor in the reader's country can usually buy the fund. */
export async function FitPill({ level, href }: { level: FitLevel; href?: string }) {
  const t = await getT();
  const pill = <span className={`fit-pill ${PILL[level]}`}>{t(VERDICT[level])}</span>;
  return href ? <Link href={href} className="no-underline">{pill}</Link> : pill;
}

/**
 * Inside the "For an investor in" card: whether this fund is usually sold to private investors in the reader's country,
 * why, and what to watch. The fund always stays on the page, so the reader can compare and decide.
 */
export async function FitRows({ row, country }: { row: Pick<EtfRow, "isin" | "domicile">; country: string }) {
  const t = await getT();
  const fit = suitability(row, country);
  const vars = (v: Record<string, string>) => (v.domicile ? { ...v, domicile: countryName(v.domicile, t.lang) } : v);
  return (
    <div className="mt-3 flex flex-col">
      <div className="flex items-center justify-between gap-3 border-t border-line py-3">
        <span>{t("Sold to private investors")}</span>
        <FitPill level={fit.level} />
      </div>
      {fit.points.length ? (
        <ul className="space-y-2 border-t border-line pt-3 text-[0.92rem]">
          {fit.points.map((p) => <li key={p.text}>{t(p.text, vars(p.vars))}</li>)}
        </ul>
      ) : null}
      {fit.level !== "ok" ? (
        <p className="mt-2.5 text-[0.8rem] leading-relaxed text-muted">
          {t("We still show this fund so you can compare it. General rules read on {date}, not advice: your broker or tax situation can differ.", { date: formatDate(SUITABILITY_READ_ON, t.lang) })}
          {fit.sources.length ? <> {t("Sources:")} {fit.sources.map((s, i) => <span key={s.url}>{i ? ", " : ""}<a className="prose-link" href={s.url} target="_blank" rel="noreferrer">{t(s.label)}</a></span>)}</> : null}
        </p>
      ) : null}
    </div>
  );
}
