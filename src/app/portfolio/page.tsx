import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { PortfolioTracker } from "@/components/my-lists";

export const metadata: Metadata = { title: "Portfolio Tracker" };

export default function Page() {
  return <div><PageTitle title="Portfolio Tracker">Follow hypothetical ETF portfolios and see how they would be doing.</PageTitle><PortfolioTracker /></div>;
}
