import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { allGroupStats, FEE_CEILING, type GroupStats } from "@/lib/etfs/stats";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "ETF fees by index and theme" };
export const dynamic = "force-dynamic";

function Table({ rows, t, href }: { rows: GroupStats[]; t: Awaited<ReturnType<typeof getT>>; href: (g: GroupStats) => string }) {
  const all = rows.map((r) => r.median!).sort((a, b) => a - b);
  const q1 = all[Math.floor(all.length / 4)], q3 = all[Math.floor((all.length * 3) / 4)];
  return (
    <div className="overflow-x-auto">
      <table className="table-data">
        <thead><tr><th>{t("Group")}</th><th className="num">{t("ETFs")}</th><th className="num">{t("Median fee")}</th><th className="num">{t("Average fee")}</th><th className="num">{t("Range")}</th><th>{t("Cheapest")}</th><th>{t("Largest")}</th></tr></thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.slug} id={`${g.kind}-${g.slug}`}>
              <td className="min-w-[12rem]"><Link className="font-medium no-underline hover:underline" href={href(g)}>{t(g.label)}</Link>{g.median! <= q1 ? <span className="ml-2 rounded-full bg-pine px-2 py-0.5 text-[0.75rem] text-pine-ink">{t("Cheap group")}</span> : g.median! >= q3 ? <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 text-[0.75rem] text-warn-ink">{t("Expensive group")}</span> : null}</td>
              <td className="num">{g.n}</td>
              <td className="num font-semibold">{g.median!.toFixed(2)}%</td>
              <td className="num">{g.avg!.toFixed(2)}%</td>
              <td className="num whitespace-nowrap">{g.min!.toFixed(2)}–{g.max!.toFixed(2)}%</td>
              <td className="min-w-[12rem]">{g.cheapest ? <Link className="no-underline hover:underline" href={`/etfs/${g.cheapest.key}`}>{g.cheapest.name}</Link> : "—"}{g.cheapest ? <span className="block text-[0.8rem] text-muted">{g.cheapest.fee.toFixed(2)}%</span> : null}</td>
              <td className="min-w-[12rem]">{g.largest ? <Link className="no-underline hover:underline" href={`/etfs/${g.largest.key}`}>{g.largest.name}</Link> : "—"}{g.largest ? <span className="block text-[0.8rem] text-muted">{formatMoney(g.largest.size, "EUR", t.lang)}</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Average and median fees by index and by theme, so a fund's fee can be judged against its own group. */
export default async function Page() {
  const t = await getT();
  const { indices, themes } = await allGroupStats();
  return (
    <div>
      <PageTitle title={t("ETF fees by index and theme")}>{t("A fee is only cheap or expensive against funds that do the same job. Each group lists its median and average fee, the cheapest fund and the largest one. Groups in the cheapest quarter are marked cheap, those in the dearest quarter expensive.")}</PageTitle>
      <section>
        <h2 className="mb-2 text-[1.3rem]">{t("By index")}</h2>
        <Table rows={indices} t={t} href={(g) => `/indices/${g.slug}`} />
      </section>
      <section className="mt-8">
        <h2 className="mb-2 text-[1.3rem]">{t("By theme")}</h2>
        <Table rows={themes} t={t} href={(g) => `/themes/${g.slug}`} />
      </section>
      <p className="mt-4 max-w-[72ch] text-[0.85rem] text-muted">{t("Only groups with at least three funds that have a fee on file. Fees above {max}% a year are left out as likely data errors, and leveraged or inverse funds are not counted.", { max: FEE_CEILING })}</p>
    </div>
  );
}
