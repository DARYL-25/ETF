"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useState } from "react";
import { useLocal } from "./local-store";
import type { Portfolio } from "./portfolio-tools";

/** Copies a shared portfolio into the reader's own portfolios, sized to an amount they choose. */
export function CopyShared({ name, funds }: { name: string; funds: { key: string; weight_pct: number; nav: number | null }[] }) {
  const t = useT();
  const [portfolios, save] = useLocal<Portfolio[]>("portfolios", []);
  const [amount, setAmount] = useState(10000);
  const [done, setDone] = useState<string | null>(null);
  const priced = funds.filter((f) => f.nav);
  const copy = () => {
    const id = Math.random().toString(36).slice(2, 10);
    const today = new Date().toISOString().slice(0, 10);
    save([...portfolios, { id, name: `${name} (${t("copy")})`, positions: priced.map((f) => ({ id: Math.random().toString(36).slice(2, 10), key: f.key, quantity: Number(((amount * f.weight_pct) / 100 / f.nav!).toFixed(4)), price: f.nav!, date: today })), targets: Object.fromEntries(funds.map((f) => [f.key, Number(f.weight_pct.toFixed(1))])) }]);
    setDone(id);
  };
  return (
    <div className="panel p-4">
      <p className="font-semibold">{t("Try this mix in your own portfolios")}</p>
      <p className="mt-1 text-[0.9rem] text-muted">{t("Creates a hypothetical portfolio with these shares as targets, sized to the amount you choose at today's NAV. Funds without a NAV are left out.")}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[0.85rem] text-muted">{t("Amount")}<input className="field mt-1 w-36" type="number" min={100} step={1000} value={amount} onChange={(e) => setAmount(Math.max(100, Number(e.target.value)))} /></label>
        <button type="button" className="btn btn-primary" disabled={!priced.length} onClick={copy}>{t("Copy to my portfolios")}</button>
        {done ? <Link className="btn btn-quiet" href={`/dashboard?p=${done}`}>{t("Open it")}</Link> : null}
      </div>
    </div>
  );
}
