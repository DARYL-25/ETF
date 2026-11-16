import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareToggle } from "@/components/compare-tray";
import { Change, EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { Mosaic } from "@/components/mosaic";
import { getHoldingsSummary, getTopHoldingsFull, largestWithHoldings } from "@/lib/etfs/holdings";
import { THEME_MARKETS, getThemeEtfs, type ThemeMarket, type ThemeSort } from "@/lib/etfs/queries";
import { THEMES, themeBySlug } from "@/lib/etfs/themes";
import { exchangeName, formatDate, formatMoney } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ market?: string; sort?: string; all?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const theme = themeBySlug((await params).slug);
  if (!theme) return { title: "Theme not found" };
  const t = await getT();
  return { title: t("{theme} ETFs", { theme: t(theme.label) }), description: t(theme.blurb), alternates: { canonical: `/themes/${theme.slug}` } };
}

const SORTS: [ThemeSort, string][] = [["size", "Largest first"], ["fee", "Lowest fee first"], ["return", "Best 1-year return first"]];
const FIRST = 40;

export default async function ThemePage({ params, searchParams }: Props) {
  const theme = themeBySlug((await params).slug);
  if (!theme) notFound();
  const sp = await searchParams;
  const market = sp.market && sp.market in THEME_MARKETS ? (sp.market as ThemeMarket) : null;
  const sort = SORTS.some(([s]) => s === sp.sort) ? (sp.sort as ThemeSort) : "size";
  const all = sp.all === "1";
  const t = await getT();
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const { rows, counts } = await getThemeEtfs(theme.slug, market, sort, all ? 1000 : FIRST);
  if (!counts.all) notFound();
  const total = market ? counts[market] : counts.all;
  const href = (next: { market?: ThemeMarket | null; sort?: ThemeSort; all?: boolean }) => {
    const m = next.market === undefined ? market : next.market, s = next.sort ?? sort;
    const q = new URLSearchParams();
    if (m) q.set("market", m);
    if (s !== "size") q.set("sort", s);
    if (next.all) q.set("all", "1");
    const text = q.toString();
    return `/themes/${theme.slug}${text ? `?${text}` : ""}`;
  };
  const seen = await largestWithHoldings(rows.map((e) => e.etf_key).filter((k): k is string => Boolean(k)));
  const [inside, insideSummary] = seen ? await Promise.all([getTopHoldingsFull(seen.etf_key, 48), getHoldingsSummary(seen.etf_key)]) : [[], null];
  const compare = rows.slice(0, 5).map((e) => e.etf_key).join(",");
  const related = THEMES.filter((x) => x.featured && x.slug !== theme.slug).slice(0, 8);

  return (
    <div>
      <p className="mb-2"><Link className="prose-link" href="/themes">{t("Themes")}</Link></p>
      <PageTitle title={t("{theme} ETFs", { theme: t(theme.label) })}>{t(theme.blurb)}</PageTitle>
      {theme.caution ? <p className="mb-5 max-w-[72ch] rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">{t(theme.caution)}</p> : null}

      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={t("Market")}>
        <Link href={href({ market: null })} scroll={false} aria-current={!market ? "true" : undefined} className={!market ? "chip chip-on" : "chip"}>{t("All markets")} <span className="data">{counts.all.toLocaleString(locale)}</span></Link>
        {(Object.keys(THEME_MARKETS) as ThemeMarket[]).filter((m) => counts[m] > 0).map((m) => (
          <Link key={m} href={href({ market: m })} scroll={false} aria-current={market === m ? "true" : undefined} className={market === m ? "chip chip-on" : "chip"}>{t(THEME_MARKETS[m].label)} <span className="data">{counts[m].toLocaleString(locale)}</span></Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.95rem]">
        <span className="text-muted">{t("Order")}</span>
        {SORTS.map(([s, label]) => (
          <Link key={s} href={href({ sort: s })} scroll={false} aria-current={sort === s ? "true" : undefined} className={sort === s ? "font-semibold text-ink no-underline" : "prose-link"}>{t(label)}</Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th aria-label={t("Compare")} /><th>ETF</th><th className="hidden md:table-cell">{t("Listed on")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th><th className="num hidden md:table-cell">{t("1 year")}</th></tr></thead>
          <tbody key={`${market}-${sort}-${all}`} className="rows-in">
            {rows.map((row, i) => (
              <tr key={row.etf_key} style={{ "--i": i } as React.CSSProperties}>
                <td className="w-px"><CompareToggle isin={row.etf_key!} /></td>
                <td className="min-w-[14rem]"><EtfName row={row} /></td>
                <td className="hidden whitespace-nowrap md:table-cell">{exchangeName(row.ticker_exchange) ?? (row.ucits ? t("Europe") : "—")}</td>
                <td className="num"><Fee row={row} />{row.headline_fee_pct !== null ? <span className="fee-meter" aria-hidden style={{ "--p": Math.min(1, row.headline_fee_pct / 0.75) } as React.CSSProperties} /> : null}</td>
                <td className="num whitespace-nowrap">{formatMoney(row.fund_aum ?? row.class_aum, row.fund_aum_currency ?? row.class_aum_currency, t.lang)}</td>
                <td className="num hidden md:table-cell"><Change value={row.return_1y} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 max-w-[74ch] text-[0.85rem] text-muted">{t("A dash means we hold no figure, not that the value is zero. Fees and sizes come from issuers and regulators where they publish them; for some markets we only have the fund's name and listing.")}</p>
      <p className="mt-4 flex flex-wrap gap-2">
        {rows.length >= 2 ? <Link className="btn btn-primary" href={`/compare?isins=${compare}`}>{t("Compare the first {n} side by side", { n: Math.min(5, rows.length) })}</Link> : null}
        {!all && total > rows.length ? <Link className="btn btn-quiet" href={href({ all: true })} scroll={false}>{t("Show all {n} ETFs", { n: total })}</Link> : null}
        <Link className="btn btn-quiet" href={`/screener?theme=${theme.slug}`}>{t("Filter further in the screener")}</Link>
      </p>

      {seen && insideSummary && inside.length > 5 ? (
        <section className="mt-12">
          <h2 className="mb-1 text-[1.3rem]">{t("What a fund on this theme holds")}</h2>
          <p className="mb-3 max-w-[72ch] text-muted">{t("Seen through {name}: {n} holdings on {date}. Funds on the same theme can hold very different companies, so compare before choosing.", { name: seen.name, n: insideSummary.n_holdings.toLocaleString(locale), date: formatDate(insideSummary.as_of, t.lang) })}</p>
          <Mosaic items={inside} label={t("Largest holdings of {name}", { name: seen.name })} restLabel={(pct) => t("{n} more holdings, {pct}%", { n: Math.max(0, insideSummary.n_holdings - inside.length).toLocaleString(locale), pct })} />
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="mb-3 text-[1.3rem]">{t("Other themes")}</h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((x) => <li key={x.slug}><Link className="chip" href={`/themes/${x.slug}`}>{t(x.label)}</Link></li>)}
          <li><Link className="chip" href="/themes">{t("All themes")}</Link></li>
        </ul>
      </section>
    </div>
  );
}
