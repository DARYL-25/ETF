import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { TAX_CHECKED_ON, TAX_COUNTRIES, taxCountry, type Source } from "@/lib/tax/content";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ country: string }> };

export const generateStaticParams = () => TAX_COUNTRIES.map((c) => ({ country: c.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = taxCountry((await params).country);
  return { title: c ? `ETF tax in ${c.name}` : "Tax" };
}

const Sources = ({ sources }: { sources: Source[] }) => (
  <p className="mt-2 text-[0.85rem] text-muted">Source: {sources.map((s, i) => <span key={s.url}>{i ? "; " : ""}<a className="prose-link" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>
);

export default async function Page({ params }: Props) {
  const c = taxCountry((await params).country);
  if (!c) notFound();
  return (
    <article className="max-w-4xl">
      <p className="mb-2"><Link href="/tax" className="prose-link">Tax</Link></p>
      <PageTitle title={`ETFs for a private investor in ${c.name}`}>{c.summary}</PageTitle>
      <p className="mb-8 max-w-[76ch] rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">
        General rules, read from official sources on {formatDate(TAX_CHECKED_ON)}. No tax adviser has reviewed this page. It is not advice, and it does not replace the {c.authority} or a qualified adviser.
      </p>

      <section>
        <h2 className="mb-3 text-[1.3rem]">The rules</h2>
        <ol className="flex flex-col gap-3">
          {c.rules.map((r) => (
            <li key={r.title} className="panel p-5">
              <h3 className="text-[1.1rem]">{r.title}</h3>
              <p className="mt-2 max-w-[70ch]">{r.body}</p>
              <p className="mt-2 max-w-[70ch] text-muted"><span className="font-medium text-ink">What it means for an ETF. </span>{r.why}</p>
              <Sources sources={r.sources} />
            </li>
          ))}
        </ol>
      </section>

      {c.wrappers.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[1.3rem]">Where you hold the ETF</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {c.wrappers.map((w) => (
              <div key={w.name} className="panel p-5">
                <h3 className="text-[1.1rem]">{w.name}</h3>
                <p className="mt-2">{w.body}</p>
                <Sources sources={w.sources} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 text-[1.3rem]">What to compare between two ETFs</h2>
        <div className="overflow-x-auto">
          <table className="table-data">
            <thead><tr><th>Fact on the ETF page</th><th>Why it matters in {c.name}</th></tr></thead>
            <tbody>{c.compare.map((x) => <tr key={x.fact}><td className="whitespace-nowrap font-medium">{x.fact}</td><td>{x.matters}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 flex flex-wrap gap-2">
          {c.code === "CH" ? <Link className="btn btn-primary" href="/screener?six=1">ETFs listed on SIX</Link> : <Link className="btn btn-primary" href="/screener?pea=1">ETFs presented as PEA-eligible</Link>}
          <Link className="btn btn-quiet" href={`/assistant?q=${encodeURIComponent(`MSCI World ETF for a ${c.adjective} investor`)}`}>Ask for a {c.adjective} investor</Link>
        </p>
      </section>

      <section className="mt-10 max-w-[70ch]">
        <h2 className="mb-2 text-[1.3rem]">Not covered yet</h2>
        <ul className="list-disc space-y-1.5 pl-5">{c.open.map((o) => <li key={o}>{o}</li>)}</ul>
      </section>
    </article>
  );
}
