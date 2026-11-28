import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Eye, ListChecks } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { authConfigured, currentUser } from "@/lib/supabase/server";
import { signIn, signInWithGoogle, signUp } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; mode?: string }> }) {
  const t = await getT();
  if (await currentUser()) redirect("/profile");
  const { message, mode } = await searchParams;
  const creating = mode === "signup";

  return (
    <div className="grid items-stretch gap-6 py-4 lg:grid-cols-2 lg:py-10">
      <section className="panel-navy rise hidden flex-col justify-between gap-10 p-10 lg:flex">
        <LogoMark size={52} />
        <div className="flex flex-col gap-4">
          <h1 className="text-[2.6rem] tracking-[-0.045em] text-white">{t("Your ETFs, in one place.")} <span className="font-light text-sky-soft">{t("On every device.")}</span></h1>
          <p className="text-[1.05rem] leading-relaxed text-ice">{t("A free account keeps your portfolio, watchlists and alerts, and brings them to your phone and your computer alike.")}</p>
        </div>
        <ul className="flex flex-col gap-3 text-ice">
          {([[Briefcase, t("Save your portfolio and see it X-rayed")], [ListChecks, t("Watchlists with fee and size alerts")], [Eye, t("Your country and accounts remembered")]] as const).map(([Icon, label]) => (
            <li key={label} className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10 text-white"><Icon size={18} aria-hidden /></span>{label}</li>
          ))}
        </ul>
      </section>

      <section className="panel rise flex flex-col gap-6 p-6 sm:p-10" aria-labelledby="login-title">
        <div className="flex flex-col gap-2">
          <h2 id="login-title" className="text-[2rem]">{creating ? t("Create your account") : t("Welcome back")}</h2>
          <p className="text-muted">{creating ? t("Free, and no card needed.") : t("Sign in to see your portfolio and lists.")}</p>
        </div>
        <div className="seg self-start" role="tablist" aria-label={t("Account")}>
          <Link href="/login" role="tab" aria-selected={!creating}>{t("Sign in")}</Link>
          <Link href="/login?mode=signup" role="tab" aria-selected={creating}>{t("Create account")}</Link>
        </div>
        {message ? <p role="status" className="rounded-xl bg-warn-bg px-4 py-3 text-warn-ink">{t(message)}</p> : null}
        {!authConfigured() ? (
          <p className="rounded-xl bg-warn-bg px-4 py-3 text-warn-ink">{t("Accounts open very soon. Everything else on the site works without one.")}</p>
        ) : (
          <>
            {/* Google comes first: one click, no password to remember. Shown once the Google provider is
                switched on in Supabase and NEXT_PUBLIC_GOOGLE_AUTH=1 is set. Email stays for everyone else. */}
            {process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1" ? (
              <>
                <form action={signInWithGoogle}>
                  <button className="btn btn-quiet w-full gap-3 border border-line" type="submit"><GoogleMark />{t("Continue with Google")}</button>
                </form>
                <div className="flex items-center gap-3 text-[0.8rem] text-muted" aria-hidden><span className="h-px flex-1 bg-line" />{t("or with your email")}<span className="h-px flex-1 bg-line" /></div>
              </>
            ) : null}
            <form className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 font-semibold">{t("Email")}<input className="field font-normal" type="email" name="email" required autoComplete="email" /></label>
              <label className="flex flex-col gap-1.5 font-semibold">{t("Password")}<input className="field font-normal" type="password" name="password" required minLength={8} autoComplete={creating ? "new-password" : "current-password"} />{creating ? <span className="text-[0.8rem] font-normal text-muted">{t("At least 8 characters.")}</span> : null}</label>
              <button className="btn btn-primary w-full" formAction={creating ? signUp : signIn}>{creating ? t("Create account") : t("Sign in")}</button>
            </form>
          </>
        )}
        <p className="text-[0.8rem] text-muted">{t("By creating an account you accept the")} <Link href="/legal/terms" className="prose-link">{t("terms of use")}</Link> {t("and the")} <Link href="/legal/privacy" className="prose-link">{t("privacy policy")}</Link>.</p>
      </section>
    </div>
  );
}

/** Google's "G", as its sign-in branding guidelines ask for on a "Continue with Google" button. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
