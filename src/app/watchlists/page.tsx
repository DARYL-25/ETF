import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { Watchlists } from "@/components/my-lists";

export const metadata: Metadata = { title: "Watchlists" };

export default function Page() {
  return <div><PageTitle title="Watchlists">Keep lists of ETFs you follow, with your own notes.</PageTitle><Watchlists /></div>;
}
