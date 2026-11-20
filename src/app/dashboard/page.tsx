import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function Page() {
  const t = await getT();
  return <div><PageTitle title={t("Dashboard")}>{t("Your portfolio at a glance: what it really holds, what needs attention, and answers to your questions from your own figures.")}</PageTitle><Dashboard /></div>;
}
