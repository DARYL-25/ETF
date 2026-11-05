"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, later }: { href: string; label: string; later?: boolean }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 font-medium no-underline ${active ? "bg-sunken text-pine" : "hover:bg-sunken"}`}
    >
      <span>{label}</span>
      {later ? <span className="text-[0.75rem] font-normal text-muted">Later</span> : null}
    </Link>
  );
}
