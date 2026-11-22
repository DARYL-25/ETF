import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { QuadrantChart } from "@/components/quadrant-chart";
import { indexQuadrant, quadrantGroups, themeQuadrant, type QuadGroup } from "@/lib/etfs/quadrants";

export const metadata: Metadata = { title: "Fee and size quadrants", description: "For every index and theme, each ETF placed by its yearly fee and its size, with European and US funds told apart." };
export const dynamic = "force-dynamic";

const FEATURED: [QuadGroup["kind"], string][] = [["index", "sp-500"], ["index", "nasdaq-100"], ["index", "msci-world"], ["theme", "semiconductors"]];

export default async function QuadrantsPage() {
  const t = await getT();
  const [groups, featured] = await Promise.all([
    quadrantGroups(),
    Promise.all(FEATURED.map(([k, s]) => (k === "index" ? indexQuadrant(s) : themeQuadrant(s)))),
  ]);
  const list = (gs: QuadGroup[]) => (
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {gs.map((g) => (
        <li key={g.slug}>
          <Link href={`/quadrants/${g.kind}/${g.slug}`} className="card-lift flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 no-underline">
            <span className="font-semibold">{t(g.label)}</span>
            <span className="flex flex-none items-center gap-2 text-[0.8rem] text-muted">
              <span className="inline-flex items-center gap-1"><span aria-hidden className="size-2.5 rounded-full bg-[#1A8CFF]" />{g.eu}</span>
              {g.us ? <span className="inline-flex items-center gap-1"><span aria-hidden className="size-2.5 rounded-full bg-[#F08A12]" />{g.us}</span> : null}
              <span>{t("{n} funds", { n: g.n })}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex flex-col gap-10">
      <PageTitle title={t("Fee and size quadrants")}>
        {t("Every fund in a group placed by what it costs a year and how big it is. Top left is where you want to be: large, so easy to trade and unlikely to close, and cheap. European funds are ringed in blue, US funds in orange.")}
      </PageTitle>
      <section className="grid gap-6 xl:grid-cols-2">
        {featured.filter((q) => q && q.points.length >= 5).map((q) => (
          <div key={q!.slug} className="panel p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-[1.25rem]">{t(q!.label)}</h2><Link href={`/quadrants/${q!.kind}/${q!.slug}`} className="text-[0.9rem] font-semibold no-underline">{t("Open")} →</Link></div>
            <QuadrantChart q={q!} compact />
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-4"><h2 className="text-[1.5rem]">{t("By index")}</h2>{list(groups.indices)}</section>
      <section className="flex flex-col gap-4"><h2 className="text-[1.5rem]">{t("By theme, strategy and region")}</h2>{list(groups.themes)}</section>
    </div>
  );
}
