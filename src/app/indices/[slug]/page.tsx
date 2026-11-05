import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareToggle } from "@/components/compare-tray";
import { EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { getIndex } from "@/lib/etfs/queries";
import { assetClassLabel, countryName, distributionLabel, formatMoney, replicationLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getIndex((await params).slug);
  return { title: data?.index.name ?? "Index not found" };
}

export default async function IndexPage({ params }: Props) {
  const data = await getIndex((await params).slug);
  if (!data) notFound();
  const { index, etfs } = data;
  const compareAll = etfs.slice(0, 5).map((e) => e.etf_key).join(",");

  return (
    <div>
      <PageTitle title={index.name}>{index.description}</PageTitle>
      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-1">
        <div><dt className="inline text-muted">Provider: </dt><dd className="inline">{index.provider}</dd></div>
        <div><dt className="inline text-muted">Asset class: </dt><dd className="inline">{assetClassLabel(index.asset_class)}</dd></div>
        <div><dt className="inline text-muted">Covers: </dt><dd className="inline">{index.geography}</dd></div>
      </dl>
      <p className="mb-3 max-w-[68ch] text-muted">For most funds, the link to this index is inferred from the fund&apos;s name. Check the factsheet before relying on it.</p>
      <h2 className="mb-3 text-[1.5rem]">{etfs.length === 0 ? "No ETFs loaded yet" : `${etfs.length} ${etfs.length === 1 ? "ETF follows" : "ETFs follow"} this index`}</h2>
      {etfs.length === 0 ? (
        <p className="max-w-[68ch] text-muted">We have not loaded an ETF on this index yet. That does not mean none exists. <Link className="prose-link" href="/screener">Search the screener</Link> for other funds.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table-data">
              <thead><tr><th aria-label="Compare" /><th>ETF</th><th>Domicile</th><th>Replication</th><th>Income</th><th className="num">Yearly fee</th><th className="num">Fund size</th></tr></thead>
              <tbody>
                {etfs.map((row) => (
                  <tr key={row.etf_key}>
                    <td className="w-px"><CompareToggle isin={row.etf_key!} /></td>
                    <td className="min-w-[16rem]"><EtfName row={row} /></td>
                    <td>{countryName(row.domicile)}</td>
                    <td className="whitespace-nowrap">{replicationLabel(row.replication)}</td>
                    <td>{distributionLabel(row.distribution_policy)}</td>
                    <td className="num"><Fee row={row} /></td>
                    <td className="num whitespace-nowrap">{formatMoney(row.fund_aum, row.fund_aum_currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {etfs.length >= 2 ? (
            <p className="mt-4"><Link className="btn btn-primary" href={`/compare?isins=${compareAll}`}>Compare {etfs.length > 5 ? "the first 5" : `these ${etfs.length}`} side by side</Link></p>
          ) : null}
        </>
      )}
    </div>
  );
}
