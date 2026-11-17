import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { Simulator } from "@/components/simulator";

export const metadata: Metadata = { title: "Portfolio simulator" };

export default async function Page() {
  const t = await getT();
  return <div><PageTitle title={t("Portfolio simulator")}>{t("What monthly saving could grow to, the range around it, the falls along the way and how long withdrawals last, for one strategy or two side by side.")}</PageTitle><Simulator /></div>;
}
