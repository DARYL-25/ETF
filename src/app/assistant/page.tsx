import type { Metadata } from "next";
import { PlannedPage } from "@/components/planned-page";

export const metadata: Metadata = { title: "AI Assistant" };

export default function Page() {
  return (
    <PlannedPage
      title="AI Assistant"
      intro="Ask questions about ETFs in plain language. Answers will come from this database and reviewed articles, with their sources and dates."
      phase="phase 6"
      plans={[
        "Search such as: the cheapest accumulating UCITS ETFs on the S&P 500",
        "Comparisons and explanations that state what is fact, what is assumption and what is missing",
        "No invented fees, returns, holdings or tax rules",
      ]}
      now={{ href: "/screener?index=sp-500&distribution=accumulating&sort=fee", label: "Run that search in the screener" }}
    />
  );
}
