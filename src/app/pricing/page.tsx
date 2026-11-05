import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";

export const metadata: Metadata = { title: "Pricing" };

const plans = [
  { name: "Free", price: "€0", items: ["ETF database, search and profiles", "Core screener filters", "Compare 2 ETFs", "Up to 2 watchlists and 10 saved ETFs", "ETF Academy and basic tax education"] },
  { name: "Premium", price: "€9.90 a month or €79.90 a year", items: ["Advanced screener and saved searches", "Compare up to 5 ETFs", "Advanced charts and risk metrics", "Holdings overlap and portfolio analytics", "Tax comparison and simulation where supported", "CSV and Excel exports"] },
];

export default function Page() {
  return (
    <div>
      <PageTitle title="Pricing">Everything available today is free while the product is being built, and no payment is taken. These are the planned plans, and they can change before launch.</PageTitle>
      <div className="grid max-w-4xl gap-8 md:grid-cols-2">
        {plans.map((plan) => (
          <section key={plan.name} className="border-t-[1.5px] border-ink pt-3">
            <h2 className="text-[1.5rem]">{plan.name}</h2>
            <p className="data mt-1 font-semibold">{plan.price}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">{plan.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}
      </div>
      <p className="mt-8 max-w-[68ch] text-muted">Rankings and comparisons will never be influenced by commercial relationships, and any sponsored content will be labelled.</p>
    </div>
  );
}
