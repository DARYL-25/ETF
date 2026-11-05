import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { getDataSources } from "@/lib/etfs/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data and methods" };

const KIND: Record<string, string> = { issuer_website: "Issuer website", issuer_factsheet: "Issuer factsheet", market_data_vendor: "Prices", fx_vendor: "Exchange rates", editorial: "Editorial" };

export default async function Page() {
  const sources = await getDataSources();
  return (
    <div>
      <PageTitle title="Data and methods">How the figures on this site are collected, and what they do not cover.</PageTitle>
      <div className="flex max-w-[68ch] flex-col gap-7">
        <section>
          <h2 className="mb-2 text-[1.4rem]">Where figures come from</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Fund facts are read from the issuer&apos;s own website or factsheet. Each ETF page links to its source and gives the date.</li>
            <li>Reading is automated and has not yet been checked by a person, and every affected ETF page says so.</li>
            <li>If a source does not state a value, we show a dash. We do not fill gaps from memory or other websites.</li>
            <li>Asset class, region, style and theme labels are our own classification.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-[1.4rem]">What the numbers mean</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>The yearly fee is shown with its type. TER and OCF are different measures, and neither includes transaction costs.</li>
            <li>Fund size covers all share classes of a fund. For filtering and sorting it is converted to euro at one stored European Central Bank reference rate, read {formatDate(sources.find((s) => s.kind === "fx_vendor")?.retrieved_on)}. Source: ECB statistics.</li>
            <li>Price changes come from monthly market closes on one listing. They are not NAV or official total returns.</li>
            <li>Prices are delayed and never real time.</li>
            <li>An older figure shows an out-of-date label when it is more than 120 days old.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-[1.4rem]">Current limits</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Most ETFs are basic records from official lists: EU and UK instrument registers, and exchange lists. Issuer and registered country come from the GLEIF register, and asset class, region, theme, style and index on these records are inferred from the name, so they can be wrong.</li>
            <li>A fund traded on several lists can appear more than once where lists share no identifier, especially US funds. Some markets are not covered yet.</li>
            <li>Price history appears only where we hold data licensed for this use. Risk metrics, full holdings and tax analysis are not available yet.</li>
            <li>Only European listings are loaded.</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-[1.4rem]">Not advice</h2>
          <p>This site gives general information. It does not recommend any product and it is not investment, legal or tax advice. Read a fund&apos;s KID and prospectus before investing, and past performance does not predict future returns.</p>
        </section>
      </div>
      <section className="mt-8">
        <h2 className="mb-3 text-[1.4rem]">Sources ({sources.length})</h2>
        <div className="overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>Publisher</th><th>Type</th><th>Read on</th><th>Link</th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.url}>
                  <td className="whitespace-nowrap">{s.publisher}</td>
                  <td className="whitespace-nowrap">{KIND[s.kind] ?? s.kind}</td>
                  <td className="whitespace-nowrap">{formatDate(s.retrieved_on)}</td>
                  <td><a className="prose-link break-all" href={s.url} target="_blank" rel="noreferrer">{s.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
