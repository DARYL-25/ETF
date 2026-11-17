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
    <Link href="/" className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight text-ink no-underline" aria-label={t("ETF Intelligence, home")}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><circle cx="11" cy="11" r="10" fill="var(--pine)" /><path d="M5.5 13.5 9 10l2.6 2.4 4.9-5" fill="none" stroke="var(--pine-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="hidden whitespace-nowrap sm:inline">{t("ETF Intelligence")}</span>
    </Link>
  );
}

export async function Shell({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const lens = await getLens();
  const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.72rem] font-medium text-muted no-underline aria-[current=page]:text-pine";
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[3.75rem] max-w-[84rem] items-center gap-4 px-4 lg:gap-7 lg:px-8">
          <Wordmark />
          <nav aria-label={t("Main")} className="nav-top hidden items-center gap-5 lg:flex">
            {MAIN.map(({ wide, ...item }) => <NavLink key={item.href} {...item} className={wide ? "hidden 2xl:inline-flex" : undefined} />)}
          </nav>
          <div className="ml-auto min-w-0 flex-1 sm:max-w-[15rem] lg:flex-none lg:w-[15rem]"><Palette /></div>
          <LensPicker current={lens?.code ?? null} />
          <LangSwitch />
          <details className="relative hidden lg:block">
            <summary className="chip list-none" aria-label={t("More pages")}><Menu size={15} aria-hidden /></summary>
            <div className="panel absolute right-0 top-full z-50 mt-2 w-56 p-2 shadow-xl">
              <ul>{MORE.filter((m) => !MAIN.some((x) => x.href === m.href && !x.wide)).map((m) => <li key={m.href}><Link href={m.href} className="block rounded-lg px-2 py-1.5 no-underline hover:bg-sunken">{t(m.label)}</Link></li>)}</ul>
              <div className="mt-1 border-t border-line px-2 pt-2"><ThemeToggle /></div>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-7 lg:px-8 lg:py-10">{children}</main>
      <footer className="border-t border-line pb-24 lg:pb-0">
        <div className="mx-auto flex max-w-[84rem] flex-col gap-2 px-4 py-6 text-[0.85rem] text-muted lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="max-w-[72ch]">{t("General information, not investment or tax advice. Prices are end-of-day values, never real time. Figures come from issuers and official lists and can contain errors, so check the issuer's documents before you act.")}</p>
          <p className="flex flex-none flex-wrap gap-x-4 gap-y-1"><Link href="/data" className="prose-link">{t("Data and updates")}</Link><Link href="/pricing" className="prose-link">{t("Pricing")}</Link><Link href="/legal/terms" className="prose-link">{t("Terms of use")}</Link><Link href="/legal/privacy" className="prose-link">{t("Privacy")}</Link><Link href="/legal/notice" className="prose-link">{t("Legal notice")}</Link></p>
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
