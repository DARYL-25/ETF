import Link from "next/link";
import { Menu } from "lucide-react";
import { NavLink } from "./nav-link";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

type Item = { href: string; label: string; later?: boolean };

const NAV: { heading: string; items: Item[] }[] = [
  {
    heading: "Research",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/screener", label: "ETF Screener" },
      { href: "/etfs", label: "ETF Database" },
      { href: "/indices", label: "Index Database" },
      { href: "/compare", label: "ETF Comparison" },
    ],
  },
  {
    heading: "Track",
    items: [
      { href: "/portfolio", label: "Portfolio Tracker" },
      { href: "/watchlists", label: "Watchlists" },
    ],
  },
  {
    heading: "Learn",
    items: [
      { href: "/academy", label: "ETF Academy" },
      { href: "/tax", label: "Tax Intelligence", later: true },
      { href: "/assistant", label: "AI Assistant" },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/pricing", label: "Pricing" },
      { href: "/profile", label: "User Profile" },
      { href: "/data", label: "Data and methods" },
    ],
  },
];

function NavList() {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="px-2 pb-1 text-[0.8rem] text-muted">{group.heading}</p>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} later={item.later} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="font-display text-[1.3rem] font-bold leading-none tracking-tight text-pine no-underline">
      ETF Intelligence
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2"><Wordmark /></div>
        <NavList />
        <div className="mt-auto px-2"><ThemeToggle /></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden"><Wordmark /></div>
            <details className="group ml-auto lg:hidden">
              <summary className="btn btn-quiet cursor-pointer list-none px-2.5" aria-label="Open menu"><Menu size={18} aria-hidden /></summary>
              <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-surface px-3 py-4">
                <NavList />
                <div className="mt-4 px-2"><ThemeToggle /></div>
              </div>
            </details>
            <div className="hidden w-full max-w-xl lg:block"><SearchBox /></div>
          </div>
          <div className="mt-2 lg:hidden"><SearchBox /></div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <footer className="border-t border-line px-4 py-5 text-[0.85rem] text-muted lg:px-8">
          <p className="max-w-[72ch]">
            General information, not investment or tax advice. Prices are delayed closing prices, never real time.
            Figures are read from issuer publications and can contain errors, so check the issuer&apos;s documents before you act.{" "}
            <Link href="/data" className="prose-link">How the data works</Link>.
          </p>
        </footer>
      </div>
    </div>
  );
}
