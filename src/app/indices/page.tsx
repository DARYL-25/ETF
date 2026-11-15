import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { getIndices } from "@/lib/etfs/queries";
import { assetClassLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Index Database" };

export default async function IndicesPage() {
  const indices = await getIndices();
  return (
    <div>
      <PageTitle title="Index Database">Pick an index to see every ETF here that follows it. An ETF&apos;s index is the first thing to choose, because it decides what you own.</PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>Index</th><th>Provider</th><th>Asset class</th><th>Covers</th><th className="num">ETFs here</th></tr></thead>
          <tbody>
            {indices.map((index) => (
              <tr key={index.slug}>
                <td className="min-w-[14rem]">
                  <Link className="font-medium no-underline hover:underline" href={`/indices/${index.slug}`}>{index.name}</Link>
                  <span className="block max-w-[52ch] text-[0.85rem] text-muted">{index.description}</span>
                </td>
                <td className="whitespace-nowrap">{index.provider}</td>
                <td>{assetClassLabel(index.asset_class)}</td>
                <td className="whitespace-nowrap">{index.geography}</td>
                <td className="num">{index.etf_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
