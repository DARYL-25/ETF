import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/etf-bits";
import { authConfigured, currentUser } from "@/lib/supabase/server";
import { signIn, signInWithGoogle, signUp } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  if (await currentUser()) redirect("/profile");
  const { message } = await searchParams;

  if (!authConfigured()) {
    return (
      <div className="max-w-[60ch]">
        <PageTitle title="Sign in">Accounts are not switched on for this copy of the site.</PageTitle>
        <p>The screener, ETF pages and comparison all work without an account. To switch accounts on, add the Supabase settings described in the project README.</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <PageTitle title="Sign in" />
      {message ? <p role="status" className="mb-4 rounded bg-warn-bg px-3 py-2 text-warn-ink">{message}</p> : null}
      <form className="flex flex-col gap-3">
        <label className="font-medium">Email<input className="field mt-1 font-normal" type="email" name="email" required autoComplete="email" /></label>
        <label className="font-medium">Password<input className="field mt-1 font-normal" type="password" name="password" required minLength={8} autoComplete="current-password" /></label>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" formAction={signIn}>Sign in</button>
          <button className="btn btn-quiet" formAction={signUp}>Create account</button>
        </div>
      </form>
      <form action={signInWithGoogle} className="mt-4 border-t border-line pt-4">
        <button className="btn btn-quiet w-full" type="submit">Continue with Google</button>
      </form>
    </div>
  );
}
