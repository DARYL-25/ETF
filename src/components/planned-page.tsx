import { getT } from "@/lib/i18n/server";
import { use } from "react";
import Link from "next/link";
import { PageTitle } from "./etf-bits";

/** A section on the roadmap. States what is coming without pretending it exists. */
export function PlannedPage({ title, intro, phase, plans, now }: {
  title: string; intro: string; phase: string; plans: string[]; now: { href: string; label: string };
}) {
  const t = use(getT());
  return (
    <div className="max-w-[68ch]">
      <PageTitle title={title}>{intro}</PageTitle>
      <p className="font-semibold">{t("Not built yet. Planned for ")}{phase}.</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        {plans.map((plan) => <li key={plan}>{plan}</li>)}
      </ul>
      <p className="mt-6"><Link href={now.href} className="btn btn-primary">{now.label}</Link></p>
    </div>
  );
}
