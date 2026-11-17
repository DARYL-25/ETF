import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db/client";
import type { EtfRow } from "@/lib/etfs/queries";
import { PageTitle, EtfName, Fee } from "@/components/etf-bits";
import { assetClassLabel, formatDate, formatMoney, MISSING } from "@/lib/format";
import { THEMES } from "@/lib/etfs/themes";

export const metadata: Metadata = { title: "New ETFs" };
export const dynamic = "force-dynamic";

const CLASSES = ["equity", "fixed_income", "commodities", "money_market"];

/** ETF launch monitoring: funds whose launch date on file falls in the last twelve months. */
export default async function Page({ searchParams }: { searchParams: Promise<{ class?: string; theme?: string; months?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const months = [3, 6, 12, 24].includes(Number(sp.months)) ? Number(sp.months) : 12;
  const cls = CLASSES.includes(sp.class ?? "") ? sp.class! : null;
  const theme = THEMES.find((x) => x.slug === sp.theme) ? sp.theme! : null;
  const since = new Date(Date.now() - months * 30.44 * 864e5).toISOString().slice(0, 10);
  const rows = await query<EtfRow>(
    `select * from public.etf_directory where fund_launch_date::text >= $1 and fund_launch_date::text <= current_date::text
       and ($2::text is null or asset_class = $2) and ($3::text is null or $3 = any(category_slugs))
     order by fund_launch_date desc, size_eur desc nulls last limit 300`, [since, cls, theme]);
  const [{ known }] = await query<{ known: number }>("select count(*)::int as known from public.etf_directory where fund_launch_date is not null");
  const href = (change: Record<string, string | null>) => { const p = new URLSearchParams(); const next = { months: String(months), class: cls, theme, ...change }; for (const [k, v] of Object.entries(next)) if (v) p.set(k, v); return `/launches?${p}`; };
  return (
    <div>
      <PageTitle title={t("New ETFs")}>{t("Funds launched recently, newest first, from the launch dates we hold for {n} ETFs. New funds have little history, so their tracking and costs are still unproven.", { n: known.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB") })}</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {[3, 6, 12, 24].map((m) => <Link key={m} className={`chip ${m === months ? "chip-on" : ""}`} href={href({ months: String(m) })}>{t("{n} months", { n: m })}</Link>)}
        <span className="mx-1 border-l border-line" />
        <Link className={`chip ${!cls ? "chip-on" : ""}`} href={href({ class: null })}>{t("All asset classes")}</Link>
        {CLASSES.map((c) => <Link key={c} className={`chip ${cls === c ? "chip-on" : ""}`} href={href({ class: c })}>{t(assetClassLabel(c))}</Link>)}
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-2" action="/launches">
        <input type="hidden" name="months" value={months} />{cls ? <input type="hidden" name="class" value={cls} /> : null}
        <label className="text-[0.85rem] text-muted">{t("Theme")}<select name="theme" className="field mt-1" defaultValue={theme ?? ""}><option value="">{t("Any theme")}</option>{THEMES.map((x) => <option key={x.slug} value={x.slug}>{t(x.label)}</option>)}</select></label>
        <button className="btn btn-quiet" type="submit">{t("Apply")}</button>
      </form>
      <p className="mb-2 font-semibold" role="status">{t("{n} ETFs", { n: rows.length })}</p>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>{t("Launched")}</th><th>{t("ETF")}</th><th>{t("Issuer")}</th><th>{t("Asset class")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.etf_key ?? r.isin}>
                  <td className="whitespace-nowrap">{formatDate(r.fund_launch_date, t.lang)}</td>
                  <td className="min-w-[16rem]"><EtfName row={r} /></td>
                  <td className="min-w-[8rem]">{r.issuer_name}</td>
                  <td>{r.asset_class ? t(assetClassLabel(r.asset_class)) : MISSING}</td>
                  <td className="num"><Fee row={r} /></td>
                  <td className="num whitespace-nowrap">{formatMoney(r.size_eur ?? r.fund_aum, r.size_eur ? "EUR" : r.fund_aum_currency, t.lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>{t("No launch on file in this period for these filters.")}</p>}
      <p className="mt-3 max-w-[72ch] text-[0.85rem] text-muted">{t("Launch dates come from issuers' files and are missing for many funds, so this list is not complete. Closures and mergers show on your watchlists when a fund you follow disappears from our database.")}</p>
    </div>
  );
}
