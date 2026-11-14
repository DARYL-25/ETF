"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, also = [], children, className }: { href: string; label: string; also?: string[]; children?: React.ReactNode; className?: string }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : [href, ...also].some((h) => path.startsWith(h));
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
      <span>{label}</span>
    </Link>
  );
}
