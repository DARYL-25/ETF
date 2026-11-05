import Link from "next/link";
import { FeeRuler } from "@/components/fee-ruler";
import { Fee, EtfName } from "@/components/etf-bits";
import { getDashboard } from "@/lib/etfs/queries";
import { countryName, distributionLabel, formatMoney, replicationLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { largest, cheapest, coverage, sp500, fees } = await getDashboard();

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h1 className="max-w-[22ch] text-[clamp(2.3rem,5vw,4rem)] font-bold">Find an ETF, check what it costs, and see where each number came from.</h1>
        <div className="mt-8 max-w-5xl">
          <FeeRuler points={fees} animate />
        </div>
        <p className="mt-4 max-w-[68ch]">
          Each dot is one ETF, placed by its yearly fee. Select a dot to open the fund.
          The database lists {coverage.all_etfs.toLocaleString("en-GB")} ETFs from official registers and exchanges. {coverage.etfs} of them have issuer-sourced fees and fund facts so far, and those are the dots above.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/screener">Open the screener</Link>
          <Link className="btn btn-quiet" href="/data">See how the data works</Link>
        </div>
      </section>

      <section>
        <h2 className="text-[1.6rem]">One index, several funds</h2>
        <p className="mb-3 mt-1 max-w-[68ch] text-muted">
          These all follow the S&amp;P 500. They can still differ in where they are domiciled, how they hold the shares and what they do with dividends, and each of those can matter to you.
        </p>
        <div className="overflow-x-auto">
          <table className="table-data">
            <thead>
              <tr>
                <th>ETF</th><th>Domicile</th><th>Replication</th><th>Income</th><th className="num">Yearly fee</th><th className="num">Fund size</th>
              </tr>
            </thead>
            <tbody>
              {sp500.map((row) => (
                <tr key={row.isin}>
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
        <p className="mt-2"><Link className="prose-link" href="/indices/sp-500">Compare all S&amp;P 500 ETFs</Link></p>
      </section>

      <div className="grid gap-12 xl:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-3 text-[1.6rem]">Largest funds</h2>
          <div className="overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>ETF</th><th className="num">Fund size</th><th className="num">Yearly fee</th></tr></thead>
              <tbody>
                {largest.map((row) => (
                  <tr key={row.isin}>
                    <td className="min-w-[14rem]"><EtfName row={row} /></td>
                    <td className="num whitespace-nowrap">{formatMoney(row.fund_aum, row.fund_aum_currency)}</td>
                    <td className="num"><Fee row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 text-[1.6rem]">Lowest published fee by group</h2>
          <div className="overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>Group</th><th>ETF</th><th className="num">Yearly fee</th></tr></thead>
              <tbody>
                {cheapest.map((row) => (
                  <tr key={row.group_label}>
                    <td className="whitespace-nowrap">{row.group_label}</td>
                    <td className="min-w-[14rem]"><EtfName row={row} /></td>
                    <td className="num"><Fee row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-[68ch] text-[0.85rem] text-muted">Only among ETFs in this database. The lowest fee is not always the best fund, because tracking and tax can matter more.</p>
        </section>
      </div>
    </div>
  );
}
