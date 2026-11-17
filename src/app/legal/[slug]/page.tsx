import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { LEGAL_PAGES, LEGAL_UPDATED, legalBySlug, operator } from "@/lib/legal/content";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = legalBySlug((await params).slug);
  const t = await getT();
  return page ? { title: t(page.title), description: t(page.summary) } : { title: "Not found" };
}

export default async function LegalPage({ params }: Props) {
  const page = legalBySlug((await params).slug);
  if (!page) notFound();
  const t = await getT();
  const who = operator();
  return (
    <article className="flex max-w-[70ch] flex-col gap-6">
      <PageTitle title={t(page.title)}>{t(page.summary)}</PageTitle>
      <p className="rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn-ink">{t("Draft of {date}. A lawyer has not reviewed this text yet. It will be reviewed before the service opens to the public.", { date: formatDate(LEGAL_UPDATED, t.lang) })}</p>
      {page.slug === "notice" ? (
        <section>
          <h2 className="mb-2 text-[1.3rem]">{t("Operator")}</h2>
          {who.name ? (
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">{t("Name")}</dt><dd>{who.name}</dd>
              {who.address ? <><dt className="text-muted">{t("Address")}</dt><dd>{who.address}</dd></> : null}
              {who.email ? <><dt className="text-muted">{t("Contact")}</dt><dd><a className="prose-link" href={`mailto:${who.email}`}>{who.email}</a></dd></> : null}
              {who.law ? <><dt className="text-muted">{t("Applicable law and courts")}</dt><dd>{who.law}</dd></> : null}
            </dl>
          ) : <p className="leading-relaxed">{t("The operator's name, address and contact details are published here before the service opens to the public.")}</p>}
        </section>
      ) : null}
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-2 text-[1.3rem]">{t(section.heading)}</h2>
          {section.paragraphs.map((p) => <p key={p.slice(0, 32)} className="mb-3 leading-relaxed">{t(p)}</p>)}
        </section>
      ))}
      <nav aria-label={t("Legal pages")} className="flex flex-wrap gap-2 border-t border-line pt-5">
        {LEGAL_PAGES.filter((p) => p.slug !== page.slug).map((p) => <Link key={p.slug} className="chip" href={`/legal/${p.slug}`}>{t(p.title)}</Link>)}
        <Link className="chip" href="/data">{t("Data and updates")}</Link>
      </nav>
    </article>
  );
}
