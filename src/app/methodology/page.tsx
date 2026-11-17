import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { QUALITY_METHOD } from "@/lib/etfs/quality";

export const metadata: Metadata = { title: "Methodology" };

const REVIEW_RULES = [
  "One company above 5% of the whole portfolio, seen through every fund; above 10% is marked important.",
  "The ten largest underlying companies above 25% of the portfolio; above 35% is marked important.",
  "Two funds whose holdings overlap by 20% or more; 50% or more is marked important. Overlap is the sum, over shared securities, of the smaller of the two weights.",
  "Two or more funds on the same index.",
  "A blended yearly fee above 0.30%; above 0.50% is marked important.",
  "A fund on the same index, with the same income policy and currency hedging, charging at least 0.05 points less.",
  "Six funds or more, three of them under 5% each.",
  "More than 70% in US companies, or more than 35% in technology sectors, of the part seen through.",
  "Funds under 100 million euro, funds younger than a year, and leveraged or inverse funds.",
  "More than 80% of the companies seen through priced outside the euro.",
  "For readers in France, distributing funds, because of how a compte-titres taxes each payment.",
];

const PRINCIPLES = [
  "No issuer or broker pays to be ranked, scored or shown. If we ever earn a commission from a broker, the page says so, and it never enters a ranking or a score.",
  "Every figure carries its source and date. A missing figure stays missing: it is never filled from memory or set to zero.",
  "Rankings and scores use published rules, applied in code. The AI explains results; it cannot change them or add figures.",
  "We describe options and their costs. We do not tell anyone what to buy or sell, and nothing here is investment or tax advice.",
  "Historical figures, estimates and simulations are labelled as such, and simulations always show their assumptions.",
];

export default async function Page() {
  const t = await getT();
  return (
    <div className="max-w-[78ch]">
      <PageTitle title={t("Methodology")}>{t("How every score, ranking and review on this site is calculated, so you can check it and disagree with it.")}</PageTitle>
      <section>
        <h2 className="text-[1.3rem]">{t("Independence")}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">{PRINCIPLES.map((p) => <li key={p}>{t(p)}</li>)}</ul>
      </section>
      <section className="mt-8" id="quality">
        <h2 className="text-[1.3rem]">{t("ETF quality score")}</h2>
        <p className="mt-1">{t("Five parts, each scored 0 to 100, averaged with the weights below over the parts we can score. A fund needs its cost and two more parts, covering half the weight, to get a score. Grades: A from 80, B from 65, C from 50, D from 35, E below.")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>{t("Part")}</th><th className="num">{t("Weight")}</th><th>{t("Rule")}</th></tr></thead>
            <tbody>{QUALITY_METHOD.map((m) => <tr key={m.id}><td className="font-semibold">{t(m.label)}</td><td className="num">{m.weight}%</td><td className="min-w-[24rem]">{t(m.rule)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="mt-8" id="ranking">
        <h2 className="text-[1.3rem]">{t("Search and ranking")}</h2>
        <p className="mt-1">{t("A plain-language request becomes filters you can see: index, region, asset class, income policy, replication, country. Matching funds get a score that weighs fee, size, UCITS status and how much data we hold. The score, its reasons and what could not be checked are shown with each result.")} <Link className="prose-link" href="/assistant">{t("Ask")}</Link></p>
      </section>
      <section className="mt-8" id="review">
        <h2 className="text-[1.3rem]">{t("Portfolio review")}</h2>
        <p className="mt-1">{t("The review applies these rules to the figures we hold for a portfolio. The three biggest weaknesses are the most serious findings, excluding notes about missing data.")}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">{REVIEW_RULES.map((r) => <li key={r}>{t(r)}</li>)}</ul>
        <p className="mt-2">{t("Options to simplify appear where two funds overlap by 60% or more or share an index. The cheaper fund is kept, the larger one on a tie, and the switching cost counts the spread on both trades and two broker orders.")}</p>
      </section>
      <section className="mt-8" id="watch">
        <h2 className="text-[1.3rem]">{t("Watchlist alerts")}</h2>
        <p className="mt-1">{t("When you add an ETF to a list, we keep its fee, size and name. Later visits report a fee change of 0.005 points or more, a fall in size of 25% or more, a rise of 50% or more, a new name, and a fund that is no longer in our database.")}</p>
      </section>
      <section className="mt-8" id="simulations">
        <h2 className="text-[1.3rem]">{t("Calculators and simulations")}</h2>
        <p className="mt-1">{t("The true cost calculator works month by month with the inputs it shows. The simulator draws 2,000 random monthly paths from the return and volatility assumptions on its page, with fixed correlations between asset classes, and reports their middle and range. Neither is a forecast.")}</p>
      </section>
    </div>
  );
}
