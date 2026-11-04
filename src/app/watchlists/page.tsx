import type { Metadata } from "next";
import { PlannedPage } from "@/components/planned-page";

export const metadata: Metadata = { title: "Watchlists" };

export default function Page() {
  return (
    <PlannedPage
      title="Watchlists"
      intro="Keep lists of ETFs you follow, with your own notes, and synchronise them across devices."
      phase="phase 2"
      plans={[
        "Create, rename, reorder and delete lists, and add notes to each ETF",
        "See fee, fund size and recent price change with the date of each figure",
        "Set email alerts for price levels, fee changes and fund size",
      ]}
      now={{ href: "/compare", label: "Compare ETFs" }}
    />
  );
}
