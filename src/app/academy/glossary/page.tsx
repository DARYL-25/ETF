import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { localGlossary } from "@/lib/academy/content.fr";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "ETF Glossary" };

export default async function GlossaryPage() {
  const t = await getT();
  const GLOSSARY = localGlossary(t.lang);
  return (
    <div className="max-w-[72ch]">
      <PageTitle title={t("Glossary")}>{t("ETF terms in plain language.")}</PageTitle>
      <dl className="rounded-2xl border border-line bg-surface">
        {GLOSSARY.map(([term, meaning]) => (
          <div key={term} className="border-b border-line px-4 py-3 last:border-0">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
