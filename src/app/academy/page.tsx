import type { Metadata } from "next";
import Link from "next/link";
import { DoneMark, PathProgress } from "@/components/academy";
import { PageTitle } from "@/components/etf-bits";
import { localLessons, localPaths } from "@/lib/academy/content.fr";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "ETF Academy" };

export default async function AcademyPage() {
  const t = await getT();
  const byLevel = ["Beginner", "Intermediate", "Advanced", "Tax"] as const;
  const LESSONS = localLessons(t.lang);
  const PATHS = localPaths(t.lang);
  return (
    <div className="flex flex-col gap-10">
      <PageTitle title={t("ETF Academy")}>
        {t("Learn how ETFs work, from your first fund to reading risk. Your progress is saved on this device. See also the ")}<Link className="prose-link" href="/academy/glossary">{t("glossary")}</Link>{t(" and ")}<Link className="prose-link" href="/academy/calculators">{t("calculators")}</Link>.
      </PageTitle>
      {(() => { const course = PATHS.find((p) => p.slug === "start-here"); return course ? (
        <section className="panel-navy flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-[44rem] flex-col gap-2">
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-sky-soft">{t("Start here")}</span>
              <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] text-white">{course.title}</h2>
              <p className="text-ice">{course.description} {t("{n} lessons, about {m} minutes in all, each with a short quiz.", { n: course.lessons.length, m: course.lessons.reduce((sum, slug) => sum + (LESSONS.find((l) => l.slug === slug)?.minutes ?? 0), 0) })}</p>
            </div>
            <Link href={`/academy/${course.lessons[0]}`} className="rounded-[14px] bg-pine px-5 py-3 font-semibold text-white no-underline hover:brightness-110">{t("Start the course")}</Link>
          </div>
          <div className="text-ice"><PathProgress lessons={course.lessons} /></div>
          <ol className="grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {course.lessons.map((slug, i) => { const l = LESSONS.find((x) => x.slug === slug)!; return (
              <li key={slug}><Link href={`/academy/${slug}`} className="flex h-full gap-3 rounded-xl bg-white/[0.07] p-3 text-white no-underline hover:bg-white/[0.14]"><span className="font-display text-sky-soft">{String(i + 1).padStart(2, "0")}</span><span className="text-[0.92rem] leading-snug">{l.title} <DoneMark slug={slug} /></span></Link></li>
            ); })}
          </ol>
        </section>
      ) : null; })()}
      <section>
        <h2 className="mb-3 text-[1.5rem]">{t("Learning paths")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PATHS.filter((path) => path.slug !== "start-here").map((path) => (
            <div key={path.slug} className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="text-[1.15rem]">{path.title}</h3>
              <p className="text-muted">{path.description}</p>
              <PathProgress lessons={path.lessons} />
              <ol className="mt-2 list-decimal space-y-0.5 pl-5">
                {path.lessons.map((slug) => (
                  <li key={slug}><Link className="no-underline hover:text-pine hover:underline" href={`/academy/${slug}`}>{LESSONS.find((l) => l.slug === slug)!.title}</Link> <DoneMark slug={slug} /></li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
      {byLevel.map((level) => (
        <section key={level}>
          <h2 className="mb-3 text-[1.5rem]">{level === "Tax" ? t("Tax and regulation") : t(level)}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {LESSONS.filter((l) => l.level === level).map((l) => (
              <Link key={l.slug} href={`/academy/${l.slug}`} className="panel p-4 no-underline">
                <span className="font-semibold">{l.title}</span> <DoneMark slug={l.slug} />
                <span className="block text-muted">{l.summary}</span>
                <span className="data mt-1 block text-[0.85rem] text-muted">{t("{n} minutes", { n: l.minutes })}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
