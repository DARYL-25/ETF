import type { Metadata } from "next";
import { Calculators } from "@/components/academy";
import { PageTitle } from "@/components/etf-bits";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "ETF Calculators" };

export default async function CalculatorsPage() {
  const t = await getT();
  return (
    <div>
      <PageTitle title={t("Calculators")}>{t("Try your own numbers. Results use constant returns and ignore tax and trading costs, so they illustrate ideas and are not forecasts.")}</PageTitle>
      <Calculators />
    </div>
  );
}
