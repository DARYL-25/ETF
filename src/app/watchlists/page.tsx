import { getT } from "@/lib/i18n/server";
import { use } from "react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { Watchlists } from "@/components/my-lists";

export const metadata: Metadata = { title: "Watchlists" };

export default function Page() {
  const t = use(getT());
  return <div><PageTitle title={t("Watchlists")}>{t("Keep lists of ETFs you follow, with your own notes.")}</PageTitle><Watchlists /></div>;
}
