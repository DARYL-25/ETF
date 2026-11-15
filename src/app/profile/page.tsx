import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { authConfigured, currentUser, supabaseServer } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { savePreferences } from "./actions";
import { LensPicker } from "@/components/lens-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLens } from "@/lib/lens-server";
import { currentPlan } from "@/lib/billing/plan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

async function OnThisDevice() {
  const t = await getT();
  const lens = await getLens();
  const { plan, locked, customerId } = await currentPlan();
  return (
    <div className="flex flex-col gap-3">
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-[1.1rem]">{t("Where you live")}</h2><p className="mt-1 max-w-[46ch] text-muted">{lens ? `Pages are tuned for an investor in ${lens.name}.` : "Choose your country and pages show what matters there."}{t(" Stored in this browser only.")}</p></div>
        <LensPicker current={lens?.code ?? null} />
      </section>
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-[1.1rem]">{t("Appearance")}</h2><p className="mt-1 text-muted">{t("Light, dark, or the same as your device.")}</p></div>
        <ThemeToggle />
      </section>
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-[1.1rem]">{t("Plan")}</h2><p className="mt-1 max-w-[46ch] text-muted">{!locked ? "Every feature is free while the product is being built." : plan === "premium" ? "Premium." : "Free."}</p></div>
        {locked && customerId ? <form action="/api/billing/portal" method="post"><button className="btn btn-quiet">{t("Manage subscription")}</button></form> : <Link className="btn btn-quiet" href="/pricing">{t("See plans")}</Link>}
      </section>
      <section className="panel p-5">
        <h2 className="text-[1.1rem]">{t("Your lists")}</h2>
        <p className="mt-1 max-w-[60ch] text-muted">{t("Watchlists, the practice portfolio and lesson progress are kept in this browser. They are not sent to us, and clearing your browser data removes them.")}</p>
        <p className="mt-3 flex gap-2"><Link className="btn btn-quiet" href="/watchlists">{t("Watchlists")}</Link><Link className="btn btn-quiet" href="/portfolio">{t("Portfolio")}</Link></p>
      </section>
    </div>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; subscribed?: string }> }) {
  const t = await getT();
  if (!authConfigured()) {
    return (
      <div className="max-w-3xl">
        <PageTitle title={t("Account")}>{t("Sign-in is not switched on yet, and nothing here needs it. Your settings live in this browser.")}</PageTitle>
        <OnThisDevice />
      </div>
    );
  }
  const user = await currentUser();
  if (!user) redirect("/login");

  const supabase = await supabaseServer();
  const { data: preferences } = await supabase.from("user_preferences").select("currency, preferred_market").eq("user_id", user.id).maybeSingle();
  const { saved, subscribed } = await searchParams;

  return (
    <div className="max-w-3xl">
      <PageTitle title={t("Account")}>{t("Signed in as ")}{user.email}</PageTitle>
      {saved ? <p role="status" className="mb-4 font-medium text-up">{t("Preferences saved.")}</p> : null}
      {subscribed ? <p role="status" className="mb-4 font-medium text-up">{t("Thank you. Premium is active as soon as the payment is confirmed, usually within a minute.")}</p> : null}
      <OnThisDevice />
      <form action={savePreferences} className="panel mt-3 flex max-w-md flex-col gap-3 p-5">
        <label className="font-medium">{t("Preferred currency")}
          <select name="currency" className="field mt-1 font-normal" defaultValue={preferences?.currency ?? "EUR"}>
            {["EUR", "CHF", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <input type="hidden" name="preferred_market" value={preferences?.preferred_market ?? "europe"} />
        <div><button className="btn btn-primary" type="submit">{t("Save preferences")}</button></div>
      </form>
      <form action={signOut} className="mt-6"><button className="btn btn-quiet" type="submit">{t("Sign out")}</button></form>
    </div>
  );
}
