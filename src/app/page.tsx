import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Assistant } from "@/components/assistant";
import { FeeRuler } from "@/components/fee-ruler";
import { getCoverage, getFeePoints, getIndexTiles } from "@/lib/etfs/queries";
import { getFreshness } from "@/lib/data/policy";
import { getLens } from "@/lib/lens-server";
import { formatDate, formatPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getT();
  const [coverage, tiles, fees, lens] = await Promise.all([getCoverage(), getIndexTiles(8), getFeePoints(), getLens()]);
  const fresh = Object.fromEntries(getFreshness().map((f) => [f.id, f]));
  const n = (v: number) => v.toLocaleString("en-GB");

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      <section className="pt-6 lg:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[clamp(2.3rem,5.4vw,4rem)] font-semibold">{t("Describe the ETF you need.")}</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[1.1rem] text-muted">
            {n(coverage.all_etfs)}{t(" ETFs from official registers and exchanges, ranked for where you live. Every figure shows its source and its date.")}
          </p>
        </div>
        <div className="mt-8"><Assistant hero home={lens?.name ?? null} /></div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[1.5rem]">{t("Start from an index")}</h2>
          <Link href="/indices" className="prose-link whitespace-nowrap">{t("All indices")}</Link>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.slug}>
              <Link href={`/indices/${tile.slug}`} className="panel group flex h-full flex-col gap-3 p-4 no-underline transition-colors hover:border-pine">
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
        {[
          [n(coverage.all_etfs), t("ETFs listed"), t("List checked {date}", { date: formatDate(fresh.list?.lastRun, t.lang) })],
          [n(coverage.with_fee), t("with a published fee"), t("Read {date}", { date: formatDate(fresh.facts?.lastRun, t.lang) })],
          [n(coverage.with_price), t("with a daily price"), coverage.latest_price ? t("Latest {date}", { date: formatDate(coverage.latest_price, t.lang) }) : t("Not loaded yet")],
          [n(coverage.with_return), t("with official returns"), t("Dated on each fund")],
        ].map(([value, label, when]) => (
          <div key={label}>
            <p className="stat-value">{value}</p>
            <p className="mt-1">{label}</p>
            <p className="text-[0.85rem] text-muted">{when}</p>
          </div>
        ))}
        <p className="text-[0.9rem] sm:col-span-2 lg:col-span-4"><Link href="/data" className="prose-link">{t("How and when each figure is updated")}</Link></p>
      </section>
    </div>
  );
}
