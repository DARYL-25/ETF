import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageTitle } from "@/components/etf-bits";
import { TAX_CHECKED_ON, TAX_COUNTRIES } from "@/lib/tax/content";
import { getLens } from "@/lib/lens-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Tax" };

export default async function Page() {
  const lens = await getLens();
  return (
    <div className="max-w-5xl">
      <PageTitle title="Tax, by where you live">Two ETFs on the same index can leave you with different amounts after tax. These notes state the general rules for private investors, each quoted from an official source.</PageTitle>
      <ul className="grid gap-3 md:grid-cols-2">
        {TAX_COUNTRIES.map((c) => (
          <li key={c.code}>
            <Link href={`/tax/${c.slug}`} className="panel group flex h-full flex-col gap-2 p-5 no-underline transition-colors hover:border-pine">
              <span className="flex items-center justify-between text-[1.3rem] font-semibold">{c.name}{lens?.code === c.code ? <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[0.8rem] font-medium text-pine">Your country</span> : <ArrowRight size={18} aria-hidden className="text-muted group-hover:text-pine" />}</span>
              <span className="text-muted">{c.summary}</span>
              <span className="mt-auto pt-2 text-[0.85rem] text-muted">{c.rules.length} rules, {c.rules.reduce((n, r) => n + r.sources.length, 0)} official references</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-10 max-w-[70ch]">
        <h2 className="text-[1.3rem]">How to read these notes</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>They were read from official sources on {formatDate(TAX_CHECKED_ON)}. No tax adviser has reviewed them yet.</li>
          <li>They describe general rules. They do not calculate your tax, and they are not advice for your situation.</li>
          <li>Tax has layers: inside the fund, on what it pays you, and on what you gain when you sell. A note says which layer it covers.</li>
          <li>Other countries are not written yet. For them, an ETF page shows only structural facts such as domicile and income treatment.</li>
        </ul>
      </section>
    </div>
  );
}
