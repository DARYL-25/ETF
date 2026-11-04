import type { Metadata } from "next";
import Link from "next/link";
import { EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { getAllEtfs } from "@/lib/etfs/queries";
import { assetClassLabel, countryName, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF Database" };

export default async function DatabasePage() {
  const rows = await getAllEtfs();
  return (
    <div>
      <PageTitle title="ETF Database">
        All {rows.length} ETFs loaded so far, by share class. This is an early set of mostly iShares and Vanguard funds, and it grows only as each record can be sourced. To filter it, use the <Link className="prose-link" href="/screener">screener</Link>.
      </PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>ETF</th><th>Issuer</th><th>Asset class</th><th>Index</th><th>Domicile</th><th className="num">Yearly fee</th><th className="num">Fund size</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.isin}>
                <td className="min-w-[17rem]"><EtfName row={row} /></td>
                <td className="whitespace-nowrap">{row.issuer_name}</td>
                <td>{assetClassLabel(row.asset_class)}</td>
                <td className="min-w-[10rem]">{row.index_slug ? <Link href={`/indices/${row.index_slug}`} className="no-underline hover:underline">{row.index_name}</Link> : "—"}</td>
                <td>{countryName(row.domicile)}</td>
                <td className="num"><Fee row={row} /></td>
                <td className="num whitespace-nowrap">{formatMoney(row.fund_aum, row.fund_aum_currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
