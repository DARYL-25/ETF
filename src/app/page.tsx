import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Assistant } from "@/components/assistant";
import { FeeRuler } from "@/components/fee-ruler";
import { getCoverage, getFeePoints, getIndexTiles } from "@/lib/etfs/queries";
import { getFreshness } from "@/lib/data/policy";
import { getLens } from "@/lib/lens-server";
import { getShowcase } from "@/lib/etfs/holdings";
import { Mosaic } from "@/components/mosaic";
import { Tabs } from "@/components/tabs";
import { formatDate, formatPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getT();
  const [coverage, tiles, fees, lens, showcase] = await Promise.all([getCoverage(), getIndexTiles(8), getFeePoints(), getLens(), getShowcase()]);
  const fresh = Object.fromEntries(getFreshness().map((f) => [f.id, f]));
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const n = (v: number) => v.toLocaleString(locale);

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      <section className="hero-field pt-6 lg:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[clamp(2.3rem,5.4vw,4rem)] font-semibold">{t("Describe the ETF you need.")}</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[1.1rem] text-muted">
            {n(coverage.all_etfs)}{t(" ETFs from official registers and exchanges, ranked for where you live. Every figure shows its source and its date.")}
          </p>
        </div>
        <div className="mt-8"><Assistant hero home={lens?.name ?? null} /></div>
      </section>

      {showcase.length ? (
        <section>
          <div className="mb-5 grid gap-x-10 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
            <h2 className="text-[clamp(1.6rem,3vw,2.3rem)]">{t("One fund, hundreds of companies.")}</h2>
            <p className="max-w-[58ch] text-muted">{t("An ETF is a basket. Each tile is one company, sized by its share of the fund. Select a tile to see every ETF that holds it.")}</p>
          </div>
          <Tabs label={t("Fund to look inside")} tabs={showcase.map((f) => ({
            id: f.key, label: t(f.label),
            panel: (
              <div>
                <Mosaic items={f.holdings} label={t("Largest holdings of {name}", { name: f.name })} restLabel={(pct) => t("{n} more holdings, {pct}%", { n: n(Math.max(0, f.summary.n_holdings - f.holdings.length)), pct })} />
                <p className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[0.9rem] text-muted">
                  <span>{t("{name}: {n} holdings on {date}, from the issuer's file.", { name: f.name, n: n(f.summary.n_holdings), date: formatDate(f.summary.as_of, t.lang) })}</span>
                  <Link href={`/etfs/${f.key}`} className="prose-link whitespace-nowrap">{t("Open this fund")}</Link>
                </p>
              </div>
            ),
          }))} />
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[1.5rem]">{t("Start from an index")}</h2>
          <Link href="/indices" className="prose-link whitespace-nowrap">{t("All indices")}</Link>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.slug}>
              <Link href={`/indices/${tile.slug}`} className="panel lift group flex h-full flex-col gap-3 p-4 no-underline">
                <span className="flex items-start justify-between gap-2 font-semibold">{tile.name}<ArrowRight size={16} aria-hidden className="mt-1 flex-none text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-pine" /></span>
                <span className="data mt-auto text-[0.9rem] text-muted">{tile.min_fee !== null ? t("{n} ETFs, from {fee} a year", { n: tile.etf_count, fee: formatPct(tile.min_fee) }) : t("{n} ETFs", { n: tile.etf_count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center">
        <div>
          <h2 className="text-[1.5rem]">{t("What funds charge")}</h2>
          <p className="mt-2 max-w-[44ch] text-muted">{t("Each dot is one of the ")}{fees.length}{t(" ETFs with our fullest records, placed by its yearly fee. Select a dot to open the fund.")}</p>
          <p className="mt-4"><Link className="btn btn-quiet" href="/screener?sort=fee&dir=asc">{t("Sort every ETF by fee")}</Link></p>
        </div>
        <div className="panel min-w-0 p-5"><FeeRuler points={fees} animate /></div>
      </section>

      <section className="panel grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6" aria-label={t("How current the data is")}>
        {([
          [coverage.all_etfs, t("ETFs listed"), t("List checked {date}", { date: formatDate(fresh.list?.lastRun, t.lang) })],
          [coverage.with_fee, t("with a published fee"), t("Read {date}", { date: formatDate(fresh.facts?.lastRun, t.lang) })],
          [coverage.with_price, t("with a daily price"), coverage.latest_price ? t("Latest {date}", { date: formatDate(coverage.latest_price, t.lang) }) : t("Not loaded yet")],
          [coverage.with_return, t("with official returns"), t("Dated on each fund")],
        ] as [number, string, string][]).map(([value, label, when]) => (
          <div key={label}>
            <p className="stat-value" data-count={value} data-locale={locale}>{n(value)}</p>
            <p className="mt-1">{label}</p>
            <p className="text-[0.85rem] text-muted">{when}</p>
          </div>
        ))}
        <p className="text-[0.9rem] sm:col-span-2 lg:col-span-4"><Link href="/data" className="prose-link">{t("How and when each figure is updated")}</Link></p>
      </section>
    </div>
  );
}
