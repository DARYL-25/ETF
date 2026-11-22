import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { QuadrantChart, REGION_COLOR } from "@/components/quadrant-chart";
import { indexQuadrant, themeQuadrant, type QuadPoint } from "@/lib/etfs/quadrants";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ kind: string; slug: string }> };

const load = (kind: string, slug: string) => (kind === "index" ? indexQuadrant(slug) : kind === "theme" ? themeQuadrant(slug) : Promise.resolve(null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind, slug } = await params;
  const q = await load(kind, slug);
  return { title: q ? `${q.label}: fee and size quadrant` : "Quadrant not found" };
}

export default async function QuadrantPage({ params }: Props) {
  const t = await getT();
  const { kind, slug } = await params;
  const q = await load(kind, slug);
  if (!q || q.points.length < 3) notFound();
  const best = q.points.filter((p) => p.fee <= q.medianFee && p.size >= q.medianSize).sort((a, b) => a.fee - b.fee || b.size - a.size);
  const byRegion = (r: QuadPoint["region"]) => q.points.filter((p) => p.region === r);
  const cheapest = (ps: QuadPoint[]) => [...ps].sort((a, b) => a.fee - b.fee)[0];
  const largest = (ps: QuadPoint[]) => [...ps].sort((a, b) => b.size - a.size)[0];
  const row = (p: QuadPoint) => (
    <tr key={p.key}>
      <td><span aria-hidden className="mr-2 inline-block size-2.5 rounded-full" style={{ background: REGION_COLOR[p.region] }} /><Link href={`/etfs/${p.key}`} className="no-underline hover:underline">{p.name}</Link><span className="block text-[0.8rem] text-muted">{[p.ticker, p.issuer, p.domicile].filter(Boolean).join(" · ")}</span></td>
      <td className="num font-semibold">{p.fee.toFixed(2)}%</td>
      <td className="num">{formatMoney(p.size, "EUR", t.lang)}</td>
      <td>{p.replication === "synthetic_swap" ? t("Synthetic") : p.replication ? t("Physical") : "—"}</td>
    </tr>
  );
  return (
    <div className="flex flex-col gap-8">
      <nav className="text-[0.85rem] text-muted"><Link href="/quadrants" className="no-underline hover:text-pine">{t("Quadrants")}</Link> / <span className="text-ink">{t(q.label)}</span></nav>
      <PageTitle title={t("{group}: fee against size", { group: t(q.label) })}>
        {t("{n} funds with both a fee and a size on file.", { n: q.points.length })} <Link className="prose-link" href={kind === "index" ? `/indices/${slug}` : `/themes/${slug}`}>{t("See every fund in this group")}</Link>
      </PageTitle>
      <section className="panel p-5 sm:p-6"><QuadrantChart q={q} /></section>
      <section className="grid gap-4 md:grid-cols-2">
        {(["eu", "us"] as const).filter((r) => byRegion(r).length).map((r) => {
          const ps = byRegion(r), c = cheapest(ps), l = largest(ps);
          return (
            <div key={r} className="panel flex flex-col gap-2 p-5" style={{ borderColor: REGION_COLOR[r] }}>
              <h2 className="text-[1.1rem]">{r === "eu" ? t("Domiciled in Europe") : t("Domiciled in the US")} <span className="text-muted">({ps.length})</span></h2>
              <p><span className="text-muted">{t("Cheapest")}:</span> <Link href={`/etfs/${c.key}`}>{c.name}</Link>, {c.fee.toFixed(2)}%</p>
              <p><span className="text-muted">{t("Largest, so usually the most liquid")}:</span> <Link href={`/etfs/${l.key}`}>{l.name}</Link>, {formatMoney(l.size, "EUR", t.lang)}</p>
              <p className="text-[0.85rem] text-muted">{r === "eu" ? t("UCITS funds that European brokers can sell to private investors.") : t("US funds are usually not sold to private investors in the EU, the UK or Switzerland, because they publish no key information document.")}</p>
            </div>
          );
        })}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.4rem]">{t("Large and cheap")} <span className="text-muted">({best.length})</span></h2>
        <p className="text-muted">{t("Funds at or below the median fee and at or above the median size, cheapest first.")}</p>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="table-data"><thead><tr><th>{t("Fund")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Fund size")}</th><th>{t("Replication")}</th></tr></thead><tbody>{best.map(row)}</tbody></table>
        </div>
      </section>
    </div>
  );
}
