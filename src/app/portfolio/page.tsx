import { getT } from "@/lib/i18n/server";
import { use } from "react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { PortfolioTracker } from "@/components/my-lists";

export const metadata: Metadata = { title: "Portfolio Tracker" };

export default function Page() {
  const t = use(getT());
  return <div><PageTitle title={t("Portfolio Tracker")}>{t("Follow hypothetical ETF portfolios and see how they would be doing.")}</PageTitle><PortfolioTracker /></div>;
}
