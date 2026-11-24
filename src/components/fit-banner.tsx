import { getT } from "@/lib/i18n/server";
import { AlertTriangle, MapPin } from "lucide-react";
import { countryName, formatDate } from "@/lib/format";
import { SUITABILITY_READ_ON, suitability } from "@/lib/etfs/suitability";
import type { EtfRow } from "@/lib/etfs/queries";
import { fundDomicile } from "@/lib/tax/drag";

/**
 * On a fund page: a clear warning when a private investor in the reader's country usually cannot buy this fund,
 * or when it usually suits them badly. The page still shows everything, so they can compare and decide.
 */
export async function FitBanner({ row, country }: { row: Pick<EtfRow, "isin" | "domicile">; country: string | null }) {
  const t = await getT();
  if (!country) {
    const dom = fundDomicile(row);
    if (!dom || dom === "IE" || dom === "LU") return null;
    return (
      <p className="flex max-w-[76ch] gap-2 rounded-xl bg-sunken px-3.5 py-2.5 text-[0.92rem]">
        <MapPin size={16} className="mt-1 flex-none" aria-hidden />
        <span>{t("Domiciled in {domicile}. Choose the country you invest from at the top of the page to see whether it is sold to private investors there, and what it means for your tax.", { domicile: countryName(dom, t.lang) })}</span>
      </p>
    );
  }
  const fit = suitability(row, country);
  if (fit.level !== "unavailable" && fit.level !== "poor") return null;
  const where = countryName(country, t.lang);
  const vars = (v: Record<string, string>) => (v.domicile ? { ...v, domicile: countryName(v.domicile, t.lang) } : v);
  return (
    <section role="note" aria-label={t("Availability where you live")} className="max-w-[80ch] rounded-2xl border border-down/40 bg-surface p-4">
      <p className="flex items-center gap-2 font-semibold text-down">
        <AlertTriangle size={18} aria-hidden />
        {fit.level === "unavailable" ? t("Usually not available to private investors in {country}", { country: where }) : t("Usually a poor fit for investors in {country}", { country: where })}
      </p>
      <ul className="mt-2 space-y-1.5">{fit.points.map((p) => <li key={p.text}>{t(p.text, vars(p.vars))}</li>)}</ul>
      <p className="mt-2 text-[0.85rem] text-muted">
        {t("We still show this fund so you can compare it. General rules read on {date}, not advice: your broker or tax situation can differ.", { date: formatDate(SUITABILITY_READ_ON, t.lang) })}
        {fit.sources.length ? <> {t("Sources:")} {fit.sources.map((s, i) => <span key={s.url}>{i ? ", " : ""}<a className="prose-link" href={s.url} target="_blank" rel="noreferrer">{t(s.label)}</a></span>)}</> : null}
      </p>
    </section>
  );
}
