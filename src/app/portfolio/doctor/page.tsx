import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { PortfolioDoctor } from "@/components/portfolio-doctor";

export const metadata: Metadata = { title: "Portfolio review" };

export default async function Page() {
  const t = await getT();
  return <div><PageTitle title={t("Portfolio review")}>{t("A check of one of your portfolios: what it really holds, where it is concentrated, what it costs, and where it could be simpler.")}</PageTitle><PortfolioDoctor /></div>;
}
