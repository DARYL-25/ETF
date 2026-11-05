import type { Metadata } from "next";
import { Assistant } from "@/components/assistant";
import { PageTitle } from "@/components/etf-bits";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="max-w-5xl">
      <PageTitle title="AI Assistant">Ask in plain language, in English or French. Say where you live and what matters to you. Every fund and figure comes from our database, with what could not be checked listed alongside.</PageTitle>
      <Assistant initial={q?.slice(0, 500)} />
    </div>
  );
}
