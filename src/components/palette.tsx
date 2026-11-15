"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, Sparkles } from "lucide-react";

type Hit = { etf_key: string; isin: string | null; name: string; ticker: string | null; index_name: string | null };
type Item = { key: string; label: string; detail?: string; href: string; kind: "etf" | "page" | "ask" };

const PAGES: [string, string, string][] = [
  ["Screener", "/screener", "filter every ETF"],
  ["Compare ETFs", "/compare", "side by side"],
  ["Indices", "/indices", "funds that track the same index"],
  ["Which ETFs hold it", "/holdings", "find funds by a company they own"],
  ["Learn", "/academy", "lessons and calculators"],
  ["Tax", "/tax", "Switzerland and France"],
  ["Watchlists", "/watchlists", "ETFs you saved"],
  ["Portfolio", "/portfolio", "a hypothetical portfolio"],
  ["Ask", "/assistant", "describe what you need"],
  ["Pricing", "/pricing", "plans"],
  ["Data and updates", "/data", "sources and schedule"],
  ["Account", "/profile", "sign in and preferences"],
];

/** One box for everything: find an ETF, jump to a page, or ask a question in plain words. */
export function Palette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);

  const open = () => { if (!dialog.current?.open) dialog.current?.showModal(); };
  const close = () => { dialog.current?.close(); setText(""); setHits([]); setActive(0); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "")) { e.preventDefault(); open(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2) { setHits([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const body = await (await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })).json();
        setHits((body.results ?? []).slice(0, 7));
        setActive(0);
      } catch { /* A failed lookup leaves pages and Ask usable. */ }
    }, 120);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text]);

  const term = text.trim();
  const pages = PAGES.filter(([label, , detail]) => !term || `${label} ${detail}`.toLowerCase().includes(term.toLowerCase()));
  const items: Item[] = [
    ...hits.map((h): Item => ({ key: h.etf_key, label: h.name, detail: [h.ticker, h.isin].filter(Boolean).join(", "), href: `/etfs/${h.etf_key}`, kind: "etf" })),
    ...(term.length >= 6 ? [{ key: "ask", label: `Ask: ${term}`, detail: "Ranked matches with reasons", href: `/assistant?q=${encodeURIComponent(term)}`, kind: "ask" } as Item] : []),
    ...pages.slice(0, term ? 4 : 11).map(([label, href, detail]): Item => ({ key: href, label, detail, href, kind: "page" })),
    ...(term.length >= 2 ? [{ key: "all", label: `See all ETFs matching "${term}"`, href: `/screener?q=${encodeURIComponent(term)}`, kind: "page" } as Item] : []),
  ];
  const go = (item: Item | undefined) => { if (!item) return; close(); router.push(item.href); };

  return (
    <>
      <button type="button" onClick={open} aria-label="Search ETFs, pages or ask a question" className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-left text-muted transition-colors hover:border-pine">
        <Search size={16} aria-hidden />
        <span className="flex-1 truncate">Search or ask</span>
        <kbd className="hidden rounded-md border border-line px-1.5 text-[0.75rem] sm:block">Ctrl K</kbd>
      </button>
      <dialog ref={dialog} className="palette" aria-label="Search" onClose={() => { setText(""); setHits([]); }} onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <form onSubmit={(e) => { e.preventDefault(); go(items[active]); }}>
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search size={18} aria-hidden className="text-muted" />
            <input
              autoFocus value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              }}
              role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" aria-label="Search ETFs by name, ISIN, ticker or index"
              placeholder="Name, ISIN, ticker, or a question" autoComplete="off"
              className="h-14 flex-1 bg-transparent text-[1.05rem] outline-none placeholder:text-muted"
            />
            <button type="button" onClick={close} className="cursor-pointer rounded-md border border-line px-1.5 text-[0.75rem] text-muted">Esc</button>
          </div>
          <ul id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-1.5">
            {items.map((item, i) => (
              <li key={item.key} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(item)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? "bg-sunken" : ""}`}>
                  {item.kind === "ask" ? <Sparkles size={16} aria-hidden className="flex-none text-pine" /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    {item.detail ? <span className="data block truncate text-[0.85rem] text-muted">{item.detail}</span> : null}
                  </span>
                  {i === active ? <CornerDownLeft size={14} aria-hidden className="flex-none text-muted" /> : null}
                </button>
              </li>
            ))}
            {term.length >= 2 && !hits.length ? <li className="px-3 py-2 text-[0.9rem] text-muted">No ETF matches that name yet. Try an ISIN, a ticker or an index.</li> : null}
          </ul>
        </form>
      </dialog>
    </>
  );
}
