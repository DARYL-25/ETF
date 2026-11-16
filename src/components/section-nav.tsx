"use client";

import { useEffect, useState } from "react";

/**
 * The strip that follows the reader down a long fund page: the fund's name once its title has scrolled
 * away, and a link to each section with the current one marked. Sections are read from the page itself.
 */
export function SectionNav({ name, figure, label }: { name: string; figure?: string | null; label: string }) {
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  const [current, setCurrent] = useState("");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const heads = [...document.querySelectorAll<HTMLElement>("article section[data-nav] > h2")];
    setSections(heads.map((h) => ({ id: h.parentElement!.id, title: h.textContent ?? "" })));
    const onScroll = () => {
      setStuck(window.scrollY > 220);
      let now = "";
      for (const h of heads) if (h.getBoundingClientRect().top < 160) now = h.parentElement!.id;
      setCurrent(now);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav aria-label={label} className="section-nav sticky top-[3.75rem] z-20 -mx-4 min-h-[2.9rem] border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:-mx-8 lg:px-8" data-stuck={stuck ? "" : undefined}>
      <div className="flex items-center gap-4">
        <p className="section-nav-name hidden min-w-0 max-w-[22rem] flex-none items-baseline gap-2 truncate font-semibold lg:flex" aria-hidden={!stuck}>
          <span className="truncate">{name}</span>{figure ? <span className="data flex-none text-[0.9rem] font-medium text-muted">{figure}</span> : null}
        </p>
        <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]">
          {sections.map((s) => (
            <li key={s.id} className="flex-none">
              <a href={`#${s.id}`} aria-current={current === s.id ? "true" : undefined} className="block rounded-full px-3 py-1.5 text-[0.9rem] text-muted no-underline transition-colors hover:text-ink aria-[current=true]:bg-sunken aria-[current=true]:text-ink">{s.title}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
