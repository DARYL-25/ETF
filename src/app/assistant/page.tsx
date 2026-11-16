import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Assistant } from "@/components/assistant";
import { PageTitle } from "@/components/etf-bits";
import { getLens } from "@/lib/lens-server";

export const metadata: Metadata = { title: "Ask" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const { q } = await searchParams;
  const lens = await getLens();
  return (
    <div className="max-w-5xl">
      <PageTitle title={t("Ask")}>{t("Describe what you need, in English or French. Every fund and figure comes from our database, and what we could not check is listed beside the answer.")}</PageTitle>
      <Assistant initial={q?.slice(0, 500)} home={lens?.name ?? null} />
    </div>
  );
}
