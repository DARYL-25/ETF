import type { Metadata } from "next";
import Link from "next/link";
import { EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { screenEtfs } from "@/lib/etfs/queries";
import { parseScreenerParams } from "@/lib/etfs/screener-params";
import { countryName, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF Database" };

export default async function DatabasePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const result = await screenEtfs(parseScreenerParams({ sort: "name", page: page ?? "1", pageSize: "50" }));
  return (
    <div>
      <PageTitle title="ETF Database">
        {result.total.toLocaleString("en-GB")} ETFs from official registers and exchange lists, one row per ETF. Most are basic records so far. To filter them, use the <Link className="prose-link" href="/screener">screener</Link>.
      </PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>ETF</th><th>Issuer</th><th>Registered in</th><th className="num">Yearly fee</th><th className="num">Fund size</th></tr></thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.etf_key}>
                <td className="min-w-[17rem]"><EtfName row={row} /></td>
                <td className="min-w-[10rem]">{row.issuer_name}</td>
                <td>{countryName(row.domicile)}</td>
                <td className="num"><Fee row={row} /></td>
                <td className="num whitespace-nowrap">{formatMoney(row.fund_aum, row.fund_aum_currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-2">
        {result.page > 1 ? <Link className="btn btn-quiet" href={`/etfs?page=${result.page - 1}`}>Previous</Link> : <span />}
        <span className="data text-muted">Page {result.page} of {result.pages}</span>
        {result.page < result.pages ? <Link className="btn btn-quiet" href={`/etfs?page=${result.page + 1}`}>Next</Link> : <span />}
      </nav>
    </div>
  );
}
