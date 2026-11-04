import type { Metadata } from "next";
import { PlannedPage } from "@/components/planned-page";

export const metadata: Metadata = { title: "ETF Academy" };

export default function Page() {
  return (
    <PlannedPage
      title="ETF Academy"
      intro="Learn how ETFs work, from your first fund to analysing tracking difference. Every article will list its references and the date it was last checked."
      phase="phase 4"
      plans={[
        "Learning paths from beginner to advanced, with progress tracking",
        "A glossary, quizzes and step-by-step guides that use real funds from the database",
        "Calculators for fee impact, compound growth and currency effects",
      ]}
      now={{ href: "/indices", label: "Browse indices" }}
    />
  );
}
