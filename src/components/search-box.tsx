"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { etf_key: string; isin: string | null; name: string; ticker: string | null; issuer_name: string; index_name: string | null };

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const body = await res.json();
        setHits(body.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // An aborted or failed lookup leaves the form usable: Enter still opens the screener.
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (hit: Hit) => {
    setOpen(false);
    setText("");
    router.push(`/etfs/${hit.etf_key}`);
  };

  return (
    <form
      ref={box}
      role="search"
      action="/screener"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && hits[active]) return go(hits[active]);
        setOpen(false);
        router.push(`/screener?q=${encodeURIComponent(text.trim())}`);
      }}
    >
      <input
        className="field"
        type="search"
        name="q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search by name, ISIN, ticker or index"
        aria-label="Search ETFs by name, ISIN, ticker or index"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open ? (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded border-[1.5px] border-ink bg-surface">
          {hits.length === 0 ? (
            <li className="px-3 py-2.5 text-muted">No ETF matches. Try an ISIN, a ticker or an index name.</li>
          ) : hits.map((hit, i) => (
            <li key={hit.etf_key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => go(hit)}
                className={`block w-full cursor-pointer px-3 py-2 text-left hover:bg-sunken ${i === active ? "bg-sunken" : ""}`}
              >
                <span className="block font-medium">{hit.name}</span>
                <span className="data block text-[0.85rem] text-muted">{[hit.ticker, hit.isin].filter(Boolean).join(", ")}{hit.index_name ? `, tracks ${hit.index_name}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
