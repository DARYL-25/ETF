import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { getThemeCounts } from "@/lib/etfs/queries";
import { THEMES } from "@/lib/etfs/themes";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF themes", description: "Every ETF on a theme, side by side: artificial intelligence, semiconductors, defence, Chinese technology, halal funds, actively managed funds and more." };

export default async function ThemesPage() {
  const [t, counts] = await Promise.all([getT(), getThemeCounts()]);
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const live = THEMES.filter((theme) => (counts.get(theme.slug)?.n ?? 0) > 0);
  const featured = live.filter((theme) => theme.featured);
  const groups: [string, typeof live][] = [
    [t("More themes and sectors"), live.filter((x) => x.kind === "theme" && !x.featured)],
    [t("Strategies"), live.filter((x) => x.kind === "style" && !x.featured)],
    [t("Countries and regions"), live.filter((x) => x.kind === "region")],
  ];
  return (
    <div className="flex flex-col gap-10">
      <PageTitle title={t("Themes")}>{t("Pick a theme and see every ETF on it, from every market we cover, ready to compare. Funds are grouped by the words in their name, so a few can be missing or misfiled.")}</PageTitle>
      <section>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((theme) => {
            const c = counts.get(theme.slug)!;
            return (
              <li key={theme.slug}>
                <Link href={`/themes/${theme.slug}`} className="panel flex h-full flex-col gap-2 p-4 no-underline">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[1.15rem] font-semibold tracking-tight">{t(theme.label)}</span>
                    <span className="data flex-none text-[0.9rem] text-muted">{t("{n} ETFs", { n: c.n.toLocaleString(locale) })}</span>
                  </span>
                  <span className="text-[0.95rem] leading-snug text-muted">{t(theme.blurb)}</span>
                  {c.min_fee !== null ? <span className="data mt-auto pt-1 text-[0.9rem]">{t("Yearly fee from {fee}%", { fee: Number(c.min_fee).toFixed(2) })}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <section key={title}>
          <h2 className="mb-3 text-[1.4rem]">{title}</h2>
          <ul className="flex flex-wrap gap-2">
            {list.map((theme) => (
              <li key={theme.slug}><Link href={`/themes/${theme.slug}`} className="chip">{t(theme.label)} <span className="data text-muted">{counts.get(theme.slug)!.n.toLocaleString(locale)}</span></Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
