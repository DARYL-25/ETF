import type { Metadata } from "next";
import { PlannedPage } from "@/components/planned-page";

export const metadata: Metadata = { title: "Portfolio Tracker" };

export default function Page() {
  return (
    <PlannedPage
      title="Portfolio Tracker"
      intro="Track hypothetical ETF portfolios that you enter by hand. These are never connected to a brokerage account."
      phase="phase 3"
      plans={[
        "Create several virtual portfolios and record purchases, contributions and withdrawals",
        "See value, profit and loss, and allocation by asset, region, sector and currency",
        "Compare a portfolio against a benchmark such as MSCI World",
      ]}
      now={{ href: "/screener", label: "Find ETFs in the screener" }}
    />
  );
}
