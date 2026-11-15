import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageTitle } from "@/components/etf-bits";
import { DATASETS, getFreshness, type SourceState } from "@/lib/data/policy";
import { getCoverage, getDataSources } from "@/lib/etfs/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data and updates" };

const STATE: Record<SourceState, string> = { automatic: "Automatic", "owner file": "Read by a person", unofficial: "Unofficial", "not working": "Not working", "not licensed": "Not licensed yet" };

export default async function Page() {
  const t = await getT();
  const [coverage, sources] = await Promise.all([getCoverage(), getDataSources()]);
  const fresh = Object.fromEntries(getFreshness().map((f) => [f.id, f]));
  // Dates inside a job's detail are shown in the reader's language.
  const detail = (d: { text: string; vars?: Record<string, string | number> } | null | undefined) =>
    d ? `. ${t(d.text, Object.fromEntries(Object.entries(d.vars ?? {}).map(([k, v]) => [k, k === "date" ? formatDate(String(v), t.lang) : typeof v === "number" ? v.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB") : v])))}` : "";
  const n = (v: number) => v.toLocaleString("en-GB");
  const pct = (v: number) => `${Math.round((v / coverage.all_etfs) * 100)}%`;
  return (
    <div className="max-w-5xl">
      <PageTitle title={t("Data and updates")}>{t("Where each figure comes from, how often it is refreshed, and when that last happened.")}</PageTitle>

      <section className="panel grid grid-cols-2 gap-x-6 gap-y-5 p-5 lg:grid-cols-4" aria-label={t("Coverage")}>
        {[[n(coverage.all_etfs), t("ETFs listed"), ""], [n(coverage.with_fee), t("with a fee"), pct(coverage.with_fee)], [n(coverage.with_size), t("with a size"), pct(coverage.with_size)], [n(coverage.with_price), t("with a daily price"), pct(coverage.with_price)]].map(([v, l, share]) => (
          <div key={l}><p className="stat-value">{v}</p><p className="mt-1">{l}{share ? <span className="text-muted"> ({share})</span> : null}</p></div>
        ))}
      </section>
      <p className="mt-3 max-w-[72ch] text-muted">{t("The list aims to hold every ETF in the world. Figures are filled in issuer by issuer, so many funds still show a dash where a figure is missing. A dash is never a zero.")}</p>

      <section className="mt-10">
        <h2 className="mb-3 text-[1.3rem]">{t("Update schedule")}</h2>
        <div className="flex flex-col gap-3">
          {DATASETS.map((d) => (
            <article key={d.id} className="panel p-5" id={d.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="text-[1.1rem]">{t(d.name)}</h3>
                <p className="data"><span className="rounded-full bg-sunken px-2.5 py-0.5 font-medium text-pine">{t(d.cadence)}</span></p>
              </div>
              <p className="mt-1.5 max-w-[72ch]">{t(d.what)}</p>
              <p className="mt-1.5 text-[0.9rem] text-muted">{t("When: ")}{t(d.schedule).replace(/\.$/, "")}{t(". Last run: ")}{formatDate(fresh[d.id]?.lastRun, t.lang)}{detail(fresh[d.id]?.detail)}.</p>
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {d.sources.map((s) => (
                  <li key={s.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2">
                    <span className="min-w-0 flex-1"><a className="prose-link" href={s.url} target="_blank" rel="noreferrer">{t(s.name)}</a><span className="block text-[0.9rem] text-muted">{t(s.covers)}</span>{s.note ? <span className="block text-[0.85rem] text-muted">{t(s.note)}</span> : null}</span>
                    <span className={`text-[0.85rem] ${s.state === "automatic" ? "text-up" : s.state === "owner file" ? "text-muted" : "text-down"}`}>{t(STATE[s.state])}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[1.3rem]">{t("Rules we hold ourselves to")}</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>{t("A figure has a source and a date, or it stays empty. Nothing is filled in from memory or estimated.")}</li>
            <li>{t("Figures read by a program are marked as not yet checked by a person.")}</li>
            <li>{t("A figure older than 120 days is labelled out of date.")}</li>
            <li>{t("TER, OCF and other fee measures keep their own labels, because they are not the same thing.")}</li>
            <li>{t("Returns carry their currency and end date, because funds report differently.")}</li>
            <li>{t("We accept a site's refusal. If a source blocks automated reading, a person downloads its file or we go without.")}</li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-[1.3rem]">{t("What is not here yet")}</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>{t("Live prices. Prices are end-of-day values from issuers, dated on each fund.")}</li>
            <li>{t("Full holdings, overlap between funds, and tracking difference against the index.")}</li>
            <li>{t("Some markets, including Shenzhen and Brazil.")}</li>
            <li>{t("A US fund can appear twice where the register and the exchange list share no identifier.")}</li>
            <li>{t("Region, theme and index on many funds are inferred from the fund's name and can be wrong.")}</li>
          </ul>
          <p className="mt-3 text-muted">{t("This site gives general information. It is not investment, legal or tax advice. Past performance does not predict future returns.")}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-[1.3rem]">{t("Every source in the database (")}{sources.length})</h2>
        <details>
          <summary className="chip list-none">{t("Show the list")}</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="table-data">
              <thead><tr><th>{t("Publisher")}</th><th>{t("Read on")}</th><th>{t("Link")}</th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.url}>
                    <td className="whitespace-nowrap">{s.publisher}</td>
                    <td className="whitespace-nowrap">{formatDate(s.retrieved_on, t.lang)}</td>
                    <td><a className="prose-link break-all" href={s.url} target="_blank" rel="noreferrer">{s.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
