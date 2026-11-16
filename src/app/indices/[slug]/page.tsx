import { getT } from "@/lib/i18n/server";
import { Mosaic } from "@/components/mosaic";
import { getHoldingsSummary, getTopHoldingsFull, largestWithHoldings } from "@/lib/etfs/holdings";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareToggle } from "@/components/compare-tray";
import { EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { getIndex } from "@/lib/etfs/queries";
import { returnGaps } from "@/lib/etfs/cost";
import { Change } from "@/components/etf-bits";
import { assetClassLabel, countryName, distributionLabel, formatDate, formatMoney, replicationLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ all?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getIndex((await params).slug);
  return { title: data?.index.name ?? "Index not found" };
}

export default async function IndexPage({ params, searchParams }: Props) {
  const t = await getT();
  const data = await getIndex((await params).slug);
  if (!data) notFound();
  const { index, etfs } = data;
  const compareAll = etfs.slice(0, 5).map((e) => e.etf_key).join(",");
  const gaps = returnGaps(etfs);
  const FIRST = 30;
  const showAll = (await searchParams).all === "1" || etfs.length <= FIRST + 5;
  const seen = await largestWithHoldings(etfs.map((e) => e.etf_key).filter((k): k is string => Boolean(k)));
  const [inside, insideSummary] = seen ? await Promise.all([getTopHoldingsFull(seen.etf_key, 64), getHoldingsSummary(seen.etf_key)]) : [[], null];

  return (
    <div>
      <PageTitle title={index.name}>{t(index.description ?? "")}</PageTitle>
      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-1">
        <div><dt className="inline text-muted">{t("Provider: ")}</dt><dd className="inline">{index.provider}</dd></div>
        <div><dt className="inline text-muted">{t("Asset class: ")}</dt><dd className="inline">{t(assetClassLabel(index.asset_class))}</dd></div>
        <div><dt className="inline text-muted">{t("Covers: ")}</dt><dd className="inline">{t(index.geography ?? "")}</dd></div>
      </dl>
      <p className="mb-3 max-w-[68ch] text-muted">{t("For most funds, the link to this index is inferred from the fund's name. Check the factsheet before relying on it.")}</p>
      {seen && insideSummary && inside.length > 5 ? (
        <section className="mb-10">
          <h2 className="mb-1 text-[1.3rem]">{t("What the index holds")}</h2>
          <p className="mb-3 max-w-[72ch] text-muted">{t("Seen through {name}, the largest fund on this index whose full holdings we hold: {n} holdings on {date}. Other funds on the index can differ slightly.", { name: seen.name, n: insideSummary.n_holdings.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB"), date: formatDate(insideSummary.as_of, t.lang) })}</p>
          <Mosaic items={inside} label={t("Largest holdings of {name}", { name: seen.name })} restLabel={(pct) => t("{n} more holdings, {pct}%", { n: Math.max(0, insideSummary.n_holdings - inside.length).toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB"), pct })} />
        </section>
      ) : null}
      <h2 className="mb-3 text-[1.3rem]">{etfs.length === 0 ? t("No ETFs loaded yet") : etfs.length === 1 ? t("1 ETF follows this index") : t("{n} ETFs follow this index", { n: etfs.length })}</h2>
      {etfs.length === 0 ? (
        <p className="max-w-[68ch] text-muted">{t("We have not loaded an ETF on this index yet. That does not mean none exists. ")}<Link className="prose-link" href="/screener">{t("Search the screener")}</Link>{t(" for other funds.")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table-data">
              <thead><tr><th aria-label={t("Compare")} /><th>{t("ETF")}</th><th>{t("Domicile")}</th><th>{t("Replication")}</th><th>{t("Income")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th></tr></thead>
              <tbody>
                {(showAll ? etfs : etfs.slice(0, FIRST)).map((row) => (
                  <tr key={row.etf_key}>
                    <td className="w-px"><CompareToggle isin={row.etf_key!} /></td>
                    <td className="min-w-[16rem]"><EtfName row={row} /></td>
                    <td>{countryName(row.domicile, t.lang)}</td>
                    <td className="whitespace-nowrap">{t(replicationLabel(row.replication))}</td>
                    <td>{t(distributionLabel(row.distribution_policy))}</td>
                    <td className="num"><Fee row={row} /></td>
                    <td className="num whitespace-nowrap">{formatMoney(row.fund_aum ?? row.class_aum, row.fund_aum_currency ?? row.class_aum_currency, t.lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAll ? <p className="mt-3"><Link className="btn btn-quiet" href={`/indices/${index.slug}?all=1`} scroll={false}>{t("Show all {n} ETFs", { n: etfs.length })}</Link></p> : null}
          {gaps ? (
            <section className="mt-10">
              <h2 className="text-[1.3rem]">{t("What each fund actually delivered")}</h2>
              <p className="mb-3 mt-1.5 max-w-[74ch] text-muted">{t("These ")}{gaps.rows.length}{t(" funds follow the same index and report official NAV returns in ")}{gaps.currency}{t(" to ")}{formatDate(gaps.asOf, t.lang)}{t(", so their returns can be compared directly. The gap to the best fund is the real difference in cost: fees, tax on dividends inside the fund, and how closely it tracks. A fund with a higher fee can still come out ahead.")}</p>
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("ETF")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("1 year")}</th><th className="num">{t("Behind the best")}</th><th className="num">{t("3 years, per year")}</th><th className="num">{t("Behind the best")}</th></tr></thead>
                  <tbody>
                    {gaps.rows.map(({ row, r1, r3, behind1, behind3 }) => (
                      <tr key={row.etf_key}>
                        <td className="min-w-[16rem]"><EtfName row={row} /></td>
                        <td className="num"><Fee row={row} /></td>
                        <td className="num"><Change value={r1} /></td>
                        <td className="num">{behind1 < 0.005 ? <span className="font-semibold text-pine">{t("Best")}</span> : `${behind1.toFixed(2)} pts`}</td>
                        <td className="num"><Change value={r3} /></td>
                        <td className="num">{behind3 === null ? "—" : behind3 < 0.005 ? <span className="font-semibold text-pine">{t("Best")}</span> : `${behind3.toFixed(2)} pts`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 max-w-[74ch] text-[0.85rem] text-muted">{t("Currency-hedged share classes and funds reporting in another currency or to another date are left out, because their returns are not comparable. Past differences can change. Past performance does not predict future returns.")}</p>
            </section>
          ) : null}
          {etfs.length >= 2 ? (
            <p className="mt-4"><Link className="btn btn-primary" href={`/compare?isins=${compareAll}`}>{t("Compare ")}{etfs.length > 5 ? t("the first 5") : `these ${etfs.length}`}{t(" side by side")}</Link></p>
          ) : null}
        </>
      )}
    </div>
  );
}
