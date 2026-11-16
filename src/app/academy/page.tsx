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
      <section>
        <h2 className="mb-3 text-[1.5rem]">{t("Learning paths")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PATHS.map((path) => (
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
