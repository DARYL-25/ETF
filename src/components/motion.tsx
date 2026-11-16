"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Page-wide motion, all of it answering something the reader did: a line at the top while the next page
 * loads, charts that draw when scrolled into view, and totals that count up once. Honours reduced motion.
 */
export function Motion() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const bar = useRef<HTMLDivElement>(null);

  // The loading line starts on a click on an internal link and ends when the address changes.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      if (bar.current) bar.current.dataset.state = "loading";
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  useEffect(() => {
    if (bar.current?.dataset.state === "loading") bar.current.dataset.state = "done";
  }, [pathname, search]);

  // Mark charts as seen when they enter the screen, and count totals up once.
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      const locale = el.dataset.locale || "en-GB";
      if (still || !Number.isFinite(target)) return;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 900);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString(locale);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.dataset.seen = "";
        if (el.dataset.count) count(el);
        io.unobserve(el);
      }
    }, { threshold: 0.15 });
    const scan = () => document.querySelectorAll<HTMLElement>(".mosaic:not([data-seen]), [data-reveal]:not([data-seen]), [data-count]:not([data-seen])").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return <div ref={bar} className="route-progress" aria-hidden />;
}
