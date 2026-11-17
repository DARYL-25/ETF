import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { TrueCostCalculator } from "@/components/true-cost";

export const metadata: Metadata = { title: "True ETF cost calculator" };

export default async function Page() {
  const t = await getT();
  return <div><PageTitle title={t("True ETF cost calculator")}>{t("The yearly fee is only part of what an ETF costs. Add tracking, the spread, your broker and currency conversion, and see the money over 5 to 30 years.")}</PageTitle><TrueCostCalculator /></div>;
}
