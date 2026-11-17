import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageTitle } from "@/components/etf-bits";

export const metadata: Metadata = { title: "Tools" };

const TOOLS = [
  { href: "/find", title: "FindMyETF", text: "Your country, your account and the index or theme you want: matching ETFs ranked by what they cost you a year, fees and tax included." },
  { href: "/fees", title: "Fees by index and theme", text: "The median and average fee of every group of comparable ETFs, with the cheapest and the largest." },
  { href: "/dashboard", title: "Dashboard", text: "Your portfolio, what stands out in it, what changed on your watchlists, and questions answered from your own figures." },
  { href: "/portfolio/doctor", title: "Portfolio review", text: "The three biggest weaknesses of a portfolio, its overlaps and costs, and options to simplify it." },
  { href: "/tools/true-cost", title: "True ETF cost calculator", text: "Fee, tracking, spread, broker and currency conversion, in money over 5 to 30 years." },
  { href: "/tools/simulator", title: "Portfolio simulator", text: "Saving and withdrawing, with the range of outcomes, and two strategies side by side." },
  { href: "/portfolio", title: "Portfolios", text: "Enter or import positions, set target shares and keep a journal of your decisions." },
  { href: "/launches", title: "New ETFs", text: "Funds launched in the last twelve months, newest first." },
  { href: "/tax/envelopes", title: "French accounts compared", text: "PEA, compte-titres, assurance-vie and PER on the points that matter for ETFs." },
  { href: "/academy/calculators", title: "Calculators", text: "Compound growth, fee impact, reinvestment and currency effect." },
];

export default async function Page() {
  const t = await getT();
  return (
    <div>
      <PageTitle title={t("Tools")}>{t("Work with your own numbers. Every tool shows its assumptions, and none stores what you enter unless you save a portfolio.")}</PageTitle>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((x) => (
          <li key={x.href}><Link href={x.href} className="panel group flex h-full flex-col gap-2 p-5 no-underline transition-colors hover:border-pine"><span className="flex items-center justify-between text-[1.15rem] font-semibold">{t(x.title)}<ArrowRight size={18} aria-hidden className="text-muted group-hover:text-pine" /></span><span className="text-muted">{t(x.text)}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}
