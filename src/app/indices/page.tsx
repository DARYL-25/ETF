import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { getIndices } from "@/lib/etfs/queries";
import { assetClassLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Index Database" };

export default async function IndicesPage() {
  const t = await getT();
  const indices = await getIndices();
  return (
    <div>
      <PageTitle title={t("Index Database")}>{t("Pick an index to see every ETF here that follows it. An ETF's index is the first thing to choose, because it decides what you own.")}</PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>{t("Index")}</th><th>{t("Provider")}</th><th>{t("Asset class")}</th><th>{t("Covers")}</th><th className="num">{t("ETFs here")}</th></tr></thead>
          <tbody>
            {indices.map((index) => (
              <tr key={index.slug}>
                <td className="min-w-[14rem]">
                  <Link className="font-medium no-underline hover:underline" href={`/indices/${index.slug}`}>{index.name}</Link>
                  <span className="block max-w-[52ch] text-[0.85rem] text-muted">{index.description}</span>
                </td>
                <td className="whitespace-nowrap">{index.provider}</td>
                <td>{t(assetClassLabel(index.asset_class))}</td>
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
