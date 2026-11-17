import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/etf-bits";
import { FR_ENVELOPES, RESIDENCE_CHANGE_CHECKS } from "@/lib/tax/envelopes";
import { TAX_CHECKED_ON, taxCountry } from "@/lib/tax/content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "French accounts for ETFs compared" };

const ROWS: [keyof (typeof FR_ENVELOPES)[number], string][] = [["deposits", "Deposits"], ["etfs", "Which ETFs"], ["income", "Income while invested"], ["exit", "Tax when you take money out"], ["access", "Access to the money"]];

export default async function Page() {
  const t = await getT();
  const fr = taxCountry("FR")!;
  const sources = fr.wrappers.flatMap((w) => w.sources).filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);
  return (
    <div className="max-w-6xl">
      <PageTitle title={t("French accounts for ETFs compared")}>{t("The account an ETF sits in often matters more after tax than a few hundredths of a point of fee. The general rules side by side, each from the official sources listed below.")}</PageTitle>
      <div className="overflow-x-auto">
        <table className="table-data">
          <thead><tr><th />{FR_ENVELOPES.map((e) => <th key={e.name}>{t(e.name)}</th>)}</tr></thead>
          <tbody>{ROWS.map(([k, label]) => <tr key={k}><th scope="row" className="text-left align-top font-semibold">{t(label)}</th>{FR_ENVELOPES.map((e) => <td key={e.name} className="min-w-[11rem] align-top">{t(e[k])}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 flex flex-wrap gap-3"><Link className="btn btn-primary" href="/screener?pea=1">{t("ETFs presented as PEA-eligible")}</Link><Link className="btn btn-quiet" href="/tax/france">{t("All French tax notes")}</Link></p>
      <section className="mt-8">
        <h2 className="text-[1.3rem]">{t("Accumulating or distributing, by account")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("In a compte-titres, a distributing fund is taxed on each payment; an accumulating fund defers tax until you sell.")}</li>
          <li>{t("In a PEA, an assurance-vie or a PER, income stays inside the account, so the difference matters much less.")}</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-[1.3rem]">{t("If you move abroad")}</h2>
        <p className="mt-1 text-muted">{t("We have not loaded the rules for leaving France, because they depend on the new country and its treaty with France. Settle these questions with the tax authority or an adviser before you move:")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{RESIDENCE_CHANGE_CHECKS.map((c) => <li key={c}>{t(c)}</li>)}</ul>
        <p className="mt-2"><Link className="prose-link" href="/tax/switzerland">{t("How Switzerland taxes ETFs")}</Link></p>
      </section>
      <section className="mt-8">
        <h2 className="text-[1.1rem]">{t("Sources")}</h2>
        <ul className="mt-1 space-y-1">{sources.map((s) => <li key={s.url}><a className="prose-link" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        <p className="mt-2 text-[0.85rem] text-muted">{t("Read on {date}. No tax adviser has reviewed these notes, and they are not advice for your situation.", { date: formatDate(TAX_CHECKED_ON, t.lang) })}</p>
      </section>
    </div>
  );
}
