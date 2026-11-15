import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageTitle } from "@/components/etf-bits";
import { billingConfigured } from "@/lib/billing/stripe";
import { currentPlan } from "@/lib/billing/plan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing" };

const FREE = ["Every ETF, with its source and date", "Screener, index pages and search", "Ask in plain words, ranked for your country", "Compare 2 ETFs side by side", "Lessons, calculators and tax notes", "Watchlists and a practice portfolio, kept on this device"];
const PREMIUM = ["Everything in Free", "Compare up to 5 ETFs side by side", "Export any screener search to CSV", "Supports independent, ad-free research"];

export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const t = await getT();
  const on = billingConfigured();
  const { plan } = await currentPlan();
  const { state } = await searchParams;
  return (
    <div className="max-w-4xl">
      <PageTitle title={t("Pricing")}>{on ? "Start free. Upgrade when you want the extra tools, and cancel at any time." : "Everything is free while the product is being built, and no payment is taken. These are the plans that will apply at launch."}</PageTitle>
      {state === "error" ? <p role="alert" className="mb-4 rounded-xl bg-warn-bg px-3 py-2 text-warn-ink">{t("The payment page could not be opened. Nothing was charged. Try again in a moment.")}</p> : null}
      {state === "off" ? <p role="status" className="mb-4 rounded-xl bg-warn-bg px-3 py-2 text-warn-ink">{t("Payments are not switched on yet. Every feature is open to you for now.")}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <section className="panel flex flex-col p-6">
          <h2 className="text-[1.3rem]">{t("Free")}</h2>
          <p className="stat-value mt-3">€0</p>
          <ul className="mt-5 space-y-2">{FREE.map((i) => <li key={i} className="flex gap-2.5"><Check size={17} aria-hidden className="mt-1 flex-none text-pine" />{i}</li>)}</ul>
          <p className="mt-auto pt-6"><Link href="/screener" className="btn btn-quiet w-full">{t("Open the screener")}</Link></p>
        </section>
        <section className="panel flex flex-col border-pine p-6">
          <h2 className="text-[1.3rem]">{t("Premium")}</h2>
          <p className="stat-value mt-3">€9.90 <span className="text-[0.5em] font-medium text-muted">{t("a month, or €79.90 a year")}</span></p>
          <ul className="mt-5 space-y-2">{PREMIUM.map((i) => <li key={i} className="flex gap-2.5"><Check size={17} aria-hidden className="mt-1 flex-none text-pine" />{i}</li>)}</ul>
          {on && plan !== "premium" ? (
            <form action="/api/billing/checkout" method="post" className="mt-auto flex gap-2 pt-6">
              <button className="btn btn-primary flex-1" name="interval" value="month">{t("Subscribe monthly")}</button>
              <button className="btn btn-quiet flex-1" name="interval" value="year">{t("Subscribe yearly")}</button>
            </form>
          ) : (
            <p className="mt-auto pt-6 text-muted">{on ? "You are on Premium. Manage it from your account page." : "Not on sale yet. You have these features for free until launch."}</p>
          )}
        </section>
      </div>
      <p className="mt-8 max-w-[68ch] text-muted">{t("Rankings and comparisons are never influenced by commercial relationships, and any sponsored content would be labelled. Payments are handled by Stripe, and we never see your card number.")}</p>
    </div>
  );
}
