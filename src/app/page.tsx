import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Assistant } from "@/components/assistant";
import { getCoverage, getIndexTiles, getThemeCounts, getThemeEtfs } from "@/lib/etfs/queries";
import { getLens } from "@/lib/lens-server";
import { getOverlaps, getShowcase, lookThrough } from "@/lib/etfs/holdings";
import { THEMES, themeBySlug } from "@/lib/etfs/themes";
import { countryName, formatPct } from "@/lib/format";
import { LookInside } from "@/components/home/look-inside";
import { ThemeTable, type ThemeSet } from "@/components/home/theme-table";
import { FeeSliders } from "@/components/home/fee-sliders";

export const dynamic = "force-dynamic";

const HOME_THEMES = ["ai", "semiconductors", "defense", "shariah", "clean-energy", "nuclear-uranium"];
/** A made-up portfolio for the X-Ray example: half MSCI World, a third S&P 500, the rest Nasdaq-100. */
const EXAMPLE = { "IE00BFY0GT14": 50, "US78462F1030": 30, "XNAS-QNDX": 20 };

export default async function HomePage() {
  const t = await getT();
  const [coverage, tiles, lens, showcase, themeCounts, overlap, xray] = await Promise.all([
    getCoverage(), getIndexTiles(8), getLens(), getShowcase(12), getThemeCounts(),
    getOverlaps(["US78462F1030", "XNAS-QNDX"]).catch(() => []), lookThrough(EXAMPLE).catch(() => null),
  ]);
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const n = (v: number) => v.toLocaleString(locale);

  const themeSets: ThemeSet[] = (await Promise.all(HOME_THEMES.map(async (slug) => {
    const theme = themeBySlug(slug);
    const count = themeCounts.get(slug);
    if (!theme || !count) return null;
    const { rows } = await getThemeEtfs(slug, null, "size", 24);
    const withFee = rows.filter((r) => r.headline_fee_pct !== null && r.headline_fee_pct > 0).slice(0, 5);
    if (withFee.length < 2) return null;
    return {
      slug, label: theme.label, total: count.n,
      rows: withFee.map((r) => ({ key: r.etf_key ?? r.isin!, ticker: r.ticker, name: r.name, where: r.domicile ? countryName(r.domicile, t.lang) : "—", fee: r.headline_fee_pct! })),
    };
  }))).filter((x): x is ThemeSet => x !== null);

  const spyQqq = overlap[0]?.overlap_pct ?? null;
  const top10 = xray ? xray.holdings.slice(0, 10).reduce((s, h) => s + h.weight_pct, 0) : null;
  const us = xray?.countries.find((c) => /^(United States|US|USA)$/i.test(c.label))?.weight_pct ?? null;
  const tech = xray?.sectors.find((c) => /tech/i.test(c.label))?.weight_pct ?? null;
  const largest = xray?.holdings[0] ?? null;
  const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s);
  const xrayBars = ([
    [t("Ten largest companies"), top10, "var(--pine)"],
    [t("United States"), us, "var(--sky-soft)"],
    [t("Technology"), tech, "var(--pine)"],
    [largest ? t("Largest single company: {name}", { name: titleCase(largest.label) }) : "", largest?.weight_pct ?? null, "var(--ice)"],
  ] as [string, number | null, string][]).filter(([label, v]) => label && v !== null) as [string, number, string][];

  return (
    <div className="flex flex-col">
      {/* Hero: the question first, the inside of a fund beside it. */}
      <section className="flex flex-wrap items-center gap-12 pb-14 pt-4 lg:gap-14 lg:pt-10">
        <div className="rise flex min-w-0 flex-[1_1_460px] flex-col gap-6">
          <span className="inline-flex items-center gap-2.5 self-start rounded-full bg-sunken py-1.5 pl-2.5 pr-3.5 text-[0.8rem] font-semibold">
            <span className="live-dot" aria-hidden />
            {t("{n} ETFs · {s} official sources · prices updated daily", { n: n(coverage.all_etfs), s: n(coverage.markets) })}
          </span>
          <h1 className="text-[clamp(2.6rem,5.6vw,4.75rem)] leading-[1.02] tracking-[-0.045em]">
            {t("Every ETF in the world.")} <span className="light-accent">{t("Finally understood.")}</span>
          </h1>
          <p className="max-w-[35rem] text-[1.15rem] leading-relaxed text-muted">{t("Search, compare and look inside every fund. See what you really own, what it really costs, and which ETF fits where you invest.")}</p>
          <Assistant hero left navigate home={lens?.name ?? null} />
        </div>
        {showcase.length ? (
          <div className="min-w-0 flex-[1_1_460px]">
            <LookInside funds={showcase.map((f) => ({ key: f.key, label: f.label, name: f.name, n: f.summary.n_holdings, asOf: f.summary.as_of, holdings: f.holdings }))} />
          </div>
        ) : null}
      </section>

      {/* Key figures, counted up as they scroll in. */}
      <section aria-label={t("Key figures")} className="grid grid-cols-2 gap-3 pb-16 sm:gap-4 lg:grid-cols-4">
        {([
          [coverage.all_etfs, t("ETFs from official registers and exchanges")],
          [coverage.with_fee, t("with a published yearly fee")],
          [THEMES.length, t("themes, strategies and regions")],
          [null, t("The whole site, in both languages")],
        ] as [number | null, string][]).map(([value, label]) => (
          <div key={label} className="card-lift flex flex-col gap-1.5 rounded-[20px] border border-line bg-surface p-4 sm:p-6">
            {value !== null
              ? <p className="font-display text-[clamp(1.6rem,4vw,2.5rem)] font-extrabold leading-none tracking-[-0.04em]" data-count={value} data-locale={locale}>{n(value)}</p>
              : <p className="font-display text-[clamp(1.6rem,4vw,2.5rem)] font-extrabold leading-none tracking-[-0.04em]">EN · FR</p>}
            <p className="text-muted">{label}</p>
          </div>
        ))}
      </section>

      {/* Themes on a cloud band. */}
      {themeSets.length ? (
        <section className="relative py-20 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-cloud">
          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-[40rem] flex-col gap-2.5">
                <span className="eyebrow">{t("Themes")}</span>
                <h2 className="text-[clamp(1.9rem,3.6vw,3rem)]">{t("Pick an idea. See every ETF that invests in it.")}</h2>
              </div>
              <Link href="/themes" className="font-semibold text-ink no-underline hover:text-pine">{t("All {n} themes", { n: THEMES.length })} →</Link>
            </div>
            <ThemeTable themes={themeSets} />
          </div>
        </section>
      ) : null}

      {/* The portfolio tools, as a bento of cards. */}
      <section className="flex flex-col gap-8 py-20">
        <div className="flex max-w-[44rem] flex-col gap-2.5">
          <span className="eyebrow">{t("Your portfolio")}</span>
          <h2 className="text-[clamp(1.9rem,3.6vw,3rem)]">{t("Know what you own. Not just what you bought.")}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link href="/portfolio" className="card-lift flex min-w-0 flex-col gap-6 rounded-[28px] bg-[#0A2A5E] p-7 text-white no-underline md:col-span-2 sm:p-8" data-reveal>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-[1.6rem] font-bold tracking-[-0.03em]">{t("Portfolio X-Ray")}</span>
                <span className="text-ice">{t("Your ETFs, looked through to the companies inside.")}</span>
              </div>
              <span className="rounded-full bg-[rgba(124,192,255,0.16)] px-3 py-1.5 text-[0.75rem] font-semibold text-ice">{t("Example: 50% MSCI World, 30% S&P 500, 20% Nasdaq-100")}</span>
            </div>
            <div className="flex flex-col gap-4">
              {xrayBars.map(([label, v, c], i) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex justify-between gap-4"><span>{label}</span><b className="font-display">{v.toFixed(0)}%</b></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="grow-bar h-full rounded-full" style={{ width: `${Math.min(100, v).toFixed(1)}%`, backgroundColor: c, animationDelay: `${i * 0.1}s` }} /></div>
                </div>
              ))}
            </div>
            {top10 !== null ? <p className="rounded-2xl bg-white/[0.06] px-4 py-3.5 leading-relaxed text-[#E6F1FF]">{t("Three funds, one overlap: ten companies make up {pct}% of everything this portfolio owns.", { pct: top10.toFixed(0) })}</p> : null}
          </Link>

          <Link href="/compare?isins=US78462F1030,XNAS-QNDX" className="card-lift flex min-w-0 flex-col gap-4 rounded-[28px] bg-[#EAF4FF] p-7 text-[#0A2A5E] no-underline sm:p-8">
            <span className="font-display text-[1.45rem] font-bold tracking-[-0.03em]">{t("Overlap")}</span>
            <span className="leading-relaxed text-[#4A5D7E]">{t("How much two funds hold in common, by weight.")}</span>
            <div className="relative mx-auto h-[150px] w-[240px]" aria-hidden>
              <div className="absolute left-0 top-[5px] size-[140px] rounded-full bg-[rgba(26,140,255,0.55)]" />
              <div className="absolute left-[100px] top-[5px] size-[140px] rounded-full bg-[rgba(10,42,94,0.55)]" />
              {spyQqq !== null ? <span className="font-display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[1.35rem] font-extrabold text-white">{spyQqq.toFixed(0)}%</span> : null}
            </div>
            <div className="font-display flex justify-between font-bold"><span>S&amp;P 500</span><span>Nasdaq-100</span></div>
          </Link>

          <Link href="/portfolio" className="card-lift flex min-w-0 flex-col gap-4 rounded-[28px] border border-line bg-surface p-7 text-ink no-underline sm:p-8">
            <span className="font-display text-[1.45rem] font-bold tracking-[-0.03em]">{t("Copilot")}</span>
            <span className="max-w-[85%] self-end rounded-[16px_16px_4px_16px] bg-navy px-3.5 py-3 text-[0.9rem] text-navy-ink">{t("Am I too exposed to the US?")}</span>
            <span className="max-w-[90%] self-start rounded-[16px_16px_16px_4px] bg-sunken px-3.5 py-3 text-[0.9rem] leading-relaxed">{t("Answers come from your own computed figures: country share, currency and concentration, with the rule behind each one.")}</span>
          </Link>

          <Link href="/portfolio/doctor" className="card-lift flex min-w-0 flex-col gap-4 rounded-[28px] border border-line bg-surface p-7 text-ink no-underline sm:p-8">
            <span className="font-display text-[1.45rem] font-bold tracking-[-0.03em]">{t("Rebalancing")}</span>
            <span className="leading-relaxed text-muted">{t("Set target shares. Get an alert when you drift, and the trades that bring you back.")}</span>
            <div className="mt-auto flex h-[90px] items-end gap-2.5" aria-hidden>
              {[["80%", "var(--pine)"], ["55%", "var(--sky-soft)"], ["35%", "var(--ice)"], ["62%", "var(--navy)"]].map(([h, c]) => <div key={c} className="flex-1 rounded-lg" style={{ height: h, background: c }} />)}
            </div>
          </Link>

          <Link href="/academy" className="card-lift flex min-w-0 flex-col gap-4 rounded-[28px] border border-line bg-surface p-7 text-ink no-underline sm:p-8">
            <span className="font-display text-[1.45rem] font-bold tracking-[-0.03em]">{t("Learn")}</span>
            <span className="leading-relaxed text-muted">{t("Lessons with quizzes, a glossary and calculators. From “what is an ETF” to tracking difference.")}</span>
            <span className="mt-auto font-semibold text-pine">{t("Start the first lesson")} →</span>
          </Link>
        </div>
      </section>

      {/* True cost, on a cloud band. */}
      <section aria-label={t("True cost")} className="relative py-20 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-cloud">
        <FeeSliders />
      </section>

      {/* Indices. */}
      <section className="flex flex-col gap-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow">{t("Indices")}</span>
            <h2 className="text-[clamp(1.7rem,3vw,2.5rem)]">{t("Start from an index")}</h2>
          </div>
          <Link href="/indices" className="font-semibold text-ink no-underline hover:text-pine">{t("All indices")} →</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.slug}>
              <Link href={`/indices/${tile.slug}`} className="card-lift group flex h-full flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 no-underline">
                <span className="font-display flex items-start justify-between gap-2 text-[1.05rem] font-bold tracking-[-0.02em]">{tile.name}<ArrowRight size={16} aria-hidden className="mt-1 flex-none text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-pine" /></span>
                <span className="data mt-auto text-[0.9rem] text-muted">{tile.min_fee !== null ? t("{n} ETFs, from {fee} a year", { n: tile.etf_count, fee: formatPct(tile.min_fee) }) : t("{n} ETFs", { n: tile.etf_count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Call to action. */}
      <section className="pb-10">
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-[36px] bg-[#0A2A5E] p-[clamp(2.25rem,6vw,4.5rem)] text-white">
          <div className="flex max-w-[40rem] flex-col gap-3.5">
            <h2 className="text-[clamp(1.9rem,4vw,3.4rem)] tracking-[-0.045em] text-white">{t("Start with the ETFs you already own.")}</h2>
            <p className="text-[1.05rem] leading-relaxed text-ice">{t("Import a CSV, an Excel file or a broker statement. Every row is checked before it is added.")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/portfolio" className="rounded-[14px] bg-pine px-6 py-4 font-semibold text-white no-underline transition hover:brightness-110">{t("Import my portfolio")}</Link>
            <Link href="/screener" className="rounded-[14px] bg-white/10 px-6 py-4 font-semibold text-white no-underline transition hover:bg-white/20">{t("Explore ETFs")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
