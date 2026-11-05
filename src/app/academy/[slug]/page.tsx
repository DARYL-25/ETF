import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Quiz } from "@/components/academy";
import { LAST_UPDATED, LESSONS } from "@/lib/academy/content";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => LESSONS.map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: LESSONS.find((l) => l.slug === slug)?.title ?? "ETF Academy" };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const index = LESSONS.findIndex((l) => l.slug === slug);
  if (index < 0) notFound();
  const lesson = LESSONS[index];
  const next = LESSONS[index + 1];
  return (
    <article className="flex max-w-[70ch] flex-col gap-6">
      <header>
        <p><Link className="prose-link" href="/academy">ETF Academy</Link></p>
        <h1 className="mt-2 text-[clamp(1.9rem,3.4vw,2.7rem)]">{lesson.title}</h1>
        <p className="mt-2 text-[1.1rem] text-muted">{lesson.summary}</p>
      </header>
      {lesson.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-2 text-[1.4rem]">{section.heading}</h2>
          {section.paragraphs.map((p) => <p key={p.slice(0, 30)} className="mb-3 leading-relaxed">{p}</p>)}
        </section>
      ))}
      {lesson.tryIt ? <p><Link className="btn btn-quiet" href={lesson.tryIt.href}>{lesson.tryIt.label}</Link></p> : null}
      <Quiz lesson={lesson} />
      <footer className="text-[0.9rem] text-muted">
        <p>Last updated {formatDate(LAST_UPDATED)}. Educational only, not investment or tax advice. This draft has not yet had an expert review.</p>
        {lesson.references.length ? (
          <ul className="mt-2 list-disc pl-5">{lesson.references.map((r) => <li key={r.url}><a className="prose-link" href={r.url} target="_blank" rel="noreferrer">{r.label}</a></li>)}</ul>
        ) : null}
        {next ? <p className="mt-4"><Link className="btn btn-primary" href={`/academy/${next.slug}`}>Next: {next.title}</Link></p> : null}
      </footer>
    </article>
  );
}
