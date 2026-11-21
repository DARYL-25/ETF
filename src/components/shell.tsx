import { getT } from "@/lib/i18n/server";
import { use } from "react";
import Link from "next/link";
import { BookOpen, Bookmark, Home, Menu, Scale, SlidersHorizontal } from "lucide-react";
import { NavLink } from "./nav-link";
import { Palette } from "./palette";
import { LensPicker } from "./lens-picker";
import { LangSwitch } from "./lang-switch";
import { ThemeToggle } from "./theme-toggle";
import { getLens } from "@/lib/lens-server";
import { Wordmark as Brand } from "./logo";
import { PriceTape } from "./price-tape";
import { Suspense } from "react";
import { cookies } from "next/headers";

const MAIN: { href: string; label: string; also?: string[]; not?: string[]; wide?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/find", label: "FindMyETF" },
  { href: "/screener", label: "Screener", also: ["/etfs", "/launches", "/fees"] },
  { href: "/themes", label: "Themes", wide: true },
  { href: "/compare", label: "Compare", wide: true },
  { href: "/tools", label: "Tools", also: ["/portfolio/doctor"] },
  { href: "/academy", label: "Learn" },
  { href: "/tax", label: "Tax", wide: true },
  { href: "/watchlists", label: "My lists", also: ["/portfolio"], not: ["/portfolio/doctor"] },
];
const MORE = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/tools", label: "Tools" }, { href: "/portfolio/doctor", label: "Portfolio review" }, { href: "/tools/true-cost", label: "True cost" }, { href: "/tools/simulator", label: "Simulator" }, { href: "/launches", label: "New ETFs" }, { href: "/find", label: "FindMyETF" }, { href: "/fees", label: "Fees by index" }, { href: "/compare", label: "Compare" },
  { href: "/assistant", label: "Ask" }, { href: "/themes", label: "Themes" }, { href: "/holdings", label: "Which ETFs hold it" }, { href: "/indices", label: "Indices" }, { href: "/tax", label: "Tax" }, { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" }, { href: "/profile", label: "Account" }, { href: "/data", label: "Data and updates" }, { href: "/methodology", label: "Methodology" },
];

function Wordmark() {
  const t = use(getT());
  return (
    <Link href="/" className="flex flex-none items-center no-underline" aria-label={t("ETF Intelligence, home")}>
      <span className="sm:hidden"><Brand size={32} text="hidden" /></span>
      <span className="hidden sm:inline-flex"><Brand size={34} text="text-[1.3rem]" /></span>
    </Link>
  );
}

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: "Explore", links: [["Screener", "/screener"], ["Themes", "/themes"], ["Compare", "/compare"], ["Indices", "/indices"], ["New ETFs", "/launches"]] },
  { title: "Portfolio", links: [["Portfolio X-Ray", "/portfolio"], ["Portfolio review", "/portfolio/doctor"], ["True cost", "/tools/true-cost"], ["Simulator", "/tools/simulator"]] },
  { title: "Learn", links: [["Lessons", "/academy"], ["Glossary", "/academy/glossary"], ["Tax", "/tax"], ["Methodology", "/methodology"]] },
  { title: "Company", links: [["Pricing", "/pricing"], ["Data and updates", "/data"], ["Terms of use", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Legal notice", "/legal/notice"]] },
];

export async function Shell({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const lens = await getLens();
  // A session cookie is enough to pick the header's words; pages that show private data check the session properly.
  const signedIn = (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.72rem] font-medium text-muted no-underline aria-[current=page]:text-pine";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.1rem] max-w-[84rem] items-center gap-4 px-4 lg:gap-5 lg:px-8">
          <Wordmark />
          <nav aria-label={t("Main")} className="nav-top hidden items-center gap-4 xl:flex">
            {MAIN.map(({ wide, ...item }) => <NavLink key={item.href} {...item} className={wide ? "hidden" : undefined} />)}
          </nav>
          <div className="ml-auto min-w-0 flex-1 sm:max-w-[13rem] lg:max-w-[20rem] xl:max-w-none xl:flex-none xl:w-[11.5rem] 2xl:w-[12rem]"><Palette /></div>
          <LensPicker current={lens?.code ?? null} />
          <div className="hidden md:block"><LangSwitch /></div>
          <Link href={signedIn ? "/profile" : "/login"} className="hidden whitespace-nowrap px-1 font-semibold text-ink no-underline hover:text-pine min-[1840px]:inline">{signedIn ? t("My account") : t("Sign in")}</Link>
          <Link href={signedIn ? "/dashboard" : "/login?mode=signup"} className="btn btn-navy hidden whitespace-nowrap no-underline min-[1600px]:inline-flex">{signedIn ? t("Dashboard") : t("Get started")}</Link>
          <details className="relative hidden lg:block">
            <summary className="chip list-none" aria-label={t("More pages")}><Menu size={15} aria-hidden /></summary>
            <div className="panel absolute right-0 top-full z-50 mt-2 w-56 p-2 shadow-xl">
              <ul>{MORE.filter((m) => !MAIN.some((x) => x.href === m.href && !x.wide)).map((m) => <li key={m.href}><Link href={m.href} className="block rounded-lg px-2 py-1.5 no-underline hover:bg-sunken">{t(m.label)}</Link></li>)}</ul>
              <div className="mt-1 border-t border-line px-2 pt-2"><ThemeToggle /></div>
            </div>
          </details>
        </div>
      </header>
      <Suspense><PriceTape /></Suspense>
      <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-7 lg:px-8 lg:py-10">{children}</main>
      <footer className="border-t border-line bg-surface pb-24 lg:pb-0">
        <div className="mx-auto flex max-w-[84rem] flex-col gap-10 px-4 py-12 text-[0.9rem] text-muted lg:flex-row lg:justify-between lg:px-8">
          <div className="flex max-w-[26rem] flex-col gap-3">
            <Link href="/" className="no-underline" aria-label={t("ETF Intelligence, home")}><Brand size={30} text="text-[1.15rem]" /></Link>
            <p className="leading-relaxed">{t("General information, not investment or tax advice. Prices are end-of-day values, never real time. Figures come from issuers and official lists and can contain errors, so check the issuer's documents before you act.")}</p>
            <div className="md:hidden"><LangSwitch /></div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-4">
            {FOOTER.map((col) => (
              <div key={col.title} className="flex flex-col gap-2.5">
                <b className="font-display text-ink">{t(col.title)}</b>
                {col.links.map(([label, href]) => <Link key={href} href={href} className="no-underline hover:text-pine">{t(label)}</Link>)}
              </div>
            ))}
          </div>
        </div>
      </footer>
      <nav aria-label={t("Main, phone")} className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <NavLink href="/" label={t("Home")} className={tab}><Home size={19} aria-hidden /></NavLink>
        <NavLink href="/screener" label={t("Screener")} also={["/etfs"]} className={tab}><SlidersHorizontal size={19} aria-hidden /></NavLink>
        <NavLink href="/compare" label={t("Compare")} className={tab}><Scale size={19} aria-hidden /></NavLink>
        <NavLink href="/academy" label={t("Learn")} className={tab}><BookOpen size={19} aria-hidden /></NavLink>
        <NavLink href="/watchlists" label={t("Lists")} also={["/portfolio"]} className={tab}><Bookmark size={19} aria-hidden /></NavLink>
        <details className="relative flex-1">
          <summary className={`${tab} cursor-pointer list-none`}><Menu size={19} aria-hidden /><span>{t("More")}</span></summary>
          <div className="panel absolute bottom-full right-2 mb-2 w-56 p-2 shadow-xl">
            <ul>{MORE.map((m) => <li key={m.href}><Link href={m.href} className="block rounded-lg px-2 py-2 no-underline hover:bg-sunken">{t(m.label)}</Link></li>)}</ul>
            <div className="mt-1 border-t border-line px-2 pt-2"><ThemeToggle /></div>
          </div>
        </details>
      </nav>
    </div>
  );
}
