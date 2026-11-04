import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { authConfigured, currentUser, supabaseServer } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { savePreferences } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!authConfigured()) {
    return (
      <div className="max-w-[60ch]">
        <PageTitle title="User Profile">Accounts are not switched on for this copy of the site.</PageTitle>
        <p>You can use the <Link className="prose-link" href="/screener">screener</Link> and <Link className="prose-link" href="/compare">comparison</Link> without an account.</p>
      </div>
    );
  }
  const user = await currentUser();
  if (!user) redirect("/login");

  const supabase = await supabaseServer();
  const { data: preferences } = await supabase.from("user_preferences").select("currency, preferred_market").eq("user_id", user.id).maybeSingle();
  const { saved } = await searchParams;

  return (
    <div className="max-w-md">
      <PageTitle title="User Profile">Signed in as {user.email}</PageTitle>
      {saved ? <p role="status" className="mb-4 font-medium text-up">Preferences saved.</p> : null}
      <form action={savePreferences} className="flex flex-col gap-3">
        <label className="font-medium">Preferred currency
          <select name="currency" className="field mt-1 font-normal" defaultValue={preferences?.currency ?? "EUR"}>
            {["EUR", "CHF", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="font-medium">Preferred ETF market
          <select name="preferred_market" className="field mt-1 font-normal" defaultValue={preferences?.preferred_market ?? "europe"}>
            <option value="europe">Europe (UCITS)</option>
          </select>
        </label>
        <div><button className="btn btn-primary" type="submit">Save preferences</button></div>
      </form>
      <form action={signOut} className="mt-6 border-t border-line pt-4"><button className="btn btn-quiet" type="submit">Sign out</button></form>
    </div>
  );
}
