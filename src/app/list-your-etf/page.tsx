import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileText, Globe2 } from "lucide-react";
import { PageTitle } from "@/components/etf-bits";
import { alternatesFor, getT } from "@/lib/i18n/server";
import { sendListingRequest } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("List your ETFs"),
    description: t("ETF issuers, large or small, can ask for their funds to be added to ETF Intelligence, free of charge."),
    alternates: await alternatesFor("/list-your-etf"),
  };
}

const ERRORS: Record<string, string> = {
  fields: "Fill in your company, your name and a valid email address.",
  offline: "Requests cannot be received right now. Please try again later.",
  save: "Your request could not be sent. Please try again in a moment.",
};

export default async function ListYourEtfPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const t = await getT();
  const { sent, error } = await searchParams;
  const field = "field font-normal";
  const label = "flex flex-col gap-1.5 font-semibold";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-6">
        <PageTitle title={t("List your ETFs")}>
          {t("ETF Intelligence covers thousands of funds, but some are still missing, often from smaller or newer issuers. If yours are not on the site yet, tell us and we will add them, free of charge.")}
        </PageTitle>
        <ul className="flex flex-col gap-4">
          {([
            [Globe2, t("Every issuer, any size"), t("We list funds on their facts, not on who manages them. A new issuer with one ETF is as welcome as the largest.")],
            [FileText, t("Official documents only"), t("Every figure comes from your factsheet, KID or holdings file, shown with its source and date. Nothing is paid for and nothing is ranked higher for a fee.")],
            [BadgeCheck, t("Already listed but something is wrong?"), t("Use the same form to send a correction, with a link to the document that shows the right figure.")],
          ] as const).map(([Icon, title, text]) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-pine"><Icon size={19} aria-hidden /></span>
              <div><b className="font-display">{title}</b><p className="leading-relaxed text-muted">{text}</p></div>
            </li>
          ))}
        </ul>
        <p className="text-[0.9rem] text-muted">{t("To check whether a fund is already listed, search for its ISIN or ticker in the")} <Link href="/screener" className="prose-link">{t("screener")}</Link>.</p>
      </div>

      <section className="panel flex flex-col gap-5 p-6 sm:p-8" aria-labelledby="request-title">
        <h2 id="request-title" className="text-[1.4rem]">{t("Request a listing")}</h2>
        {sent ? (
          <p role="status" className="rounded-xl bg-sunken px-4 py-3">{t("Thank you. Your request has been received, and we will reply by email.")}</p>
        ) : (
          <form action={sendListingRequest} className="flex flex-col gap-4">
            {error && ERRORS[error] ? <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-warn-ink">{t(ERRORS[error])}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>{t("Company")}<input className={field} name="company" required minLength={2} maxLength={200} autoComplete="organization" /></label>
              <label className={label}>{t("Your name")}<input className={field} name="contact_name" required minLength={2} maxLength={200} autoComplete="name" /></label>
              <label className={label}>{t("Work email")}<input className={field} type="email" name="email" required maxLength={254} autoComplete="email" /></label>
              <label className={label}>{t("Website")}<input className={field} type="url" name="website" maxLength={500} placeholder="https://" autoComplete="url" /></label>
            </div>
            <label className={label}>{t("Funds to add")}<textarea className={`${field} min-h-24`} name="funds" maxLength={4000} placeholder={t("ISINs or tickers, one per line")} /></label>
            <label className={label}>{t("Message")}<span className="text-[0.8rem] font-normal text-muted">{t("Optional. Links to factsheets or holdings files help us list your funds faster.")}</span><textarea className={`${field} min-h-24`} name="message" maxLength={4000} /></label>
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Fax<input name="fax" tabIndex={-1} autoComplete="off" /></label></div>
            <button className="btn btn-primary self-start" type="submit">{t("Send request")}</button>
            <p className="text-[0.8rem] text-muted">{t("We use these details only to answer your request. See the")} <Link href="/legal/privacy" className="prose-link">{t("privacy policy")}</Link>.</p>
          </form>
        )}
      </section>
    </div>
  );
}
