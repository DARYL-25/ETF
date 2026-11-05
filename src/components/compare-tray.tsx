"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";

const KEY = "compare-isins";
const EVENT = "compare-change";
export const MAX_COMPARE = 5;

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

function write(isins: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(isins));
  } catch {
    // Storage can be blocked. The comparison page still works from its URL.
  }
  window.dispatchEvent(new Event(EVENT));
}

function useCompareList() {
  const [isins, setIsins] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIsins(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return isins;
}

export function CompareToggle({ isin, wide = false }: { isin: string; wide?: boolean }) {
  const isins = useCompareList();
  const selected = isins.includes(isin);
  const full = !selected && isins.length >= MAX_COMPARE;
  const toggle = useCallback(() => {
    const current = read();
    write(current.includes(isin) ? current.filter((i) => i !== isin) : [...current, isin].slice(0, MAX_COMPARE));
  }, [isin]);

  if (wide) {
    return (
      <button type="button" onClick={toggle} disabled={full} aria-pressed={selected} className="btn btn-quiet disabled:opacity-50">
        {selected ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
        {selected ? "Added to comparison" : full ? "Comparison is full" : "Add to comparison"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={full}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${isin} from comparison` : `Add ${isin} to comparison`}
      title={full ? `You can compare up to ${MAX_COMPARE} ETFs` : selected ? "Remove from comparison" : "Add to comparison"}
      className={`flex size-8 cursor-pointer items-center justify-center rounded border-[1.5px] disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-pine bg-pine text-pine-ink" : "border-line hover:border-ink"}`}
    >
      {selected ? <Check size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
    </button>
  );
}

export function CompareTray() {
  const isins = useCompareList();
  if (!isins.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-lg px-4 py-2.5 lg:left-[14.5rem] lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{isins.length} of {MAX_COMPARE} ETFs selected{isins.length < 2 ? ". Add one more to compare." : "."}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-quiet" onClick={() => write([])}>Clear</button>
          {isins.length >= 2 ? <Link className="btn btn-primary" href={`/compare?isins=${isins.join(",")}`}>Compare {isins.length} ETFs</Link> : null}
        </div>
      </div>
    </div>
  );
}
