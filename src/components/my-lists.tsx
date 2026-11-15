"use client";

import { useT } from "@/lib/i18n/client";
import { PortfolioInsight } from "./portfolio-insight";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { formatDate, formatMoney, formatPct, formatSignedPct, MISSING } from "@/lib/format";
import { useLocal } from "./local-store";

type Row = { etf_key: string; name: string; ticker: string | null; isin: string | null; headline_fee_pct: number | null; fund_aum: number | null; fund_aum_currency: string | null; nav: number | null; nav_currency: string | null; nav_as_of: string | null; return_1y: number | null };
type Watchlist = { id: string; name: string; items: { key: string; note: string }[] };
type Position = { id: string; key: string; quantity: number; price: number; date: string };
type Portfolio = { id: string; name: string; positions: Position[] };

const newId = () => Math.random().toString(36).slice(2, 10);

function useRows(keys: string[]) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const joined = keys.join(",");
  useEffect(() => {
    if (!joined) return;
    fetch(`/api/v1/etfs/batch?keys=${encodeURIComponent(joined)}`).then((r) => r.json()).then((b) => {
      setRows(Object.fromEntries((b.rows as Row[]).map((r) => [r.etf_key, r])));
    }).catch(() => undefined);
  }, [joined]);
  return rows;
}

const DEVICE_NOTE = "Saved on this device only, until accounts are switched on.";

export function SaveToWatchlist({ etfKey }: { etfKey: string }) {
  const t = useT();
  const [lists, save] = useLocal<Watchlist[]>("watchlists", []);
  const inList = lists.filter((l) => l.items.some((i) => i.key === etfKey));
  const toggle = (id: string) => save(lists.map((l) => l.id !== id ? l : { ...l, items: l.items.some((i) => i.key === etfKey) ? l.items.filter((i) => i.key !== etfKey) : [...l.items, { key: etfKey, note: "" }] }));
  return (
    <details className="relative">
      <summary className="btn btn-quiet cursor-pointer list-none"><Bookmark size={16} aria-hidden /> {inList.length ? `In ${inList.length} watchlist${inList.length > 1 ? "s" : ""}` : t("Add to watchlist")}</summary>
      <div className="absolute z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-3 shadow-lg">
        {lists.map((l) => (
          <label key={l.id} className="flex cursor-pointer items-center gap-2 py-1">
            <input type="checkbox" className="accent-(--pine)" checked={l.items.some((i) => i.key === etfKey)} onChange={() => toggle(l.id)} />{l.name}
          </label>
        ))}
        <button type="button" className="prose-link mt-1 cursor-pointer" onClick={() => save([...lists, { id: newId(), name: `Watchlist ${lists.length + 1}`, items: [{ key: etfKey, note: "" }] }])}>{t("Create a list with this ETF")}</button>
      </div>
    </details>
  );
}

export function Watchlists() {
  const t = useT();
  const [lists, save] = useLocal<Watchlist[]>("watchlists", []);
  const keys = useMemo(() => [...new Set(lists.flatMap((l) => l.items.map((i) => i.key)))], [lists]);
  const rows = useRows(keys);
  const update = (id: string, change: Partial<Watchlist>) => save(lists.map((l) => (l.id === id ? { ...l, ...change } : l)));
  const move = (index: number, by: number) => {
    const next = [...lists];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, index + by), 0, item);
    save(next);
  };
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">{t(DEVICE_NOTE)}</p>
      <div><button type="button" className="btn btn-primary" onClick={() => save([...lists, { id: newId(), name: `Watchlist ${lists.length + 1}`, items: [] }])}>{t("Create watchlist")}</button></div>
      {lists.length === 0 ? <p>{t("You have no watchlists yet. Create one here, or use Add to watchlist on any ETF page.")}</p> : null}
      {lists.map((list, index) => (
        <section key={list.id}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input aria-label={t("Watchlist name")} className="field max-w-xs font-semibold" value={list.name} onChange={(e) => update(list.id, { name: e.target.value })} />
            <button type="button" className="btn btn-quiet" disabled={index === 0} onClick={() => move(index, -1)}>{t("Move up")}</button>
            <button type="button" className="btn btn-quiet" disabled={index === lists.length - 1} onClick={() => move(index, 1)}>{t("Move down")}</button>
            <button type="button" className="btn btn-quiet" onClick={() => save(lists.filter((l) => l.id !== list.id))}>{t("Delete list")}</button>
          </div>
          {list.items.length === 0 ? <p className="text-muted">{t("No ETFs yet. Open an ETF and choose Add to watchlist.")}</p> : (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead><tr><th>{t("ETF")}</th><th className="num">{t("Latest NAV")}</th><th className="num">{t("1Y return")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th><th>{t("Your note")}</th><th aria-label={t("Remove")} /></tr></thead>
                <tbody>
                  {list.items.map((item) => {
                    const r = rows[item.key];
                    return (
                      <tr key={item.key}>
                        <td className="min-w-[15rem]"><Link className="font-medium no-underline hover:underline" href={`/etfs/${item.key}`}>{r?.name ?? item.key}</Link><span className="data block text-[0.85rem] text-muted">{r ? [r.ticker, r.isin].filter(Boolean).join(", ") : ""}</span></td>
                        <td className="num whitespace-nowrap">{r?.nav != null ? `${r.nav.toFixed(2)} ${r.nav_currency}` : MISSING}<span className="block text-[0.75rem] text-muted">{r?.nav_as_of ? formatDate(r.nav_as_of, t.lang) : ""}</span></td>
                        <td className="num">{formatSignedPct(r?.return_1y)}</td>
                        <td className="num">{formatPct(r?.headline_fee_pct)}</td>
                        <td className="num whitespace-nowrap">{formatMoney(r?.fund_aum, r?.fund_aum_currency, t.lang)}</td>
                        <td className="min-w-[10rem]"><input aria-label={t("Your note")} className="field" value={item.note} onChange={(e) => update(list.id, { items: list.items.map((i) => (i.key === item.key ? { ...i, note: e.target.value } : i)) })} /></td>
                        <td><button type="button" aria-label={t("Remove from list")} className="cursor-pointer p-1 text-muted hover:text-down" onClick={() => update(list.id, { items: list.items.filter((i) => i.key !== item.key) })}><Trash2 size={16} aria-hidden /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export function PortfolioTracker() {
  const t = useT();
  const [portfolios, save] = useLocal<Portfolio[]>("portfolios", []);
  const keys = useMemo(() => [...new Set(portfolios.flatMap((p) => p.positions.map((x) => x.key)))], [portfolios]);
  const rows = useRows(keys);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<{ etf_key: string; name: string; ticker: string | null }[]>([]);
  const [draft, setDraft] = useState({ portfolio: "", key: "", name: "", quantity: 10, price: 100, date: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    if (search.trim().length < 2) { setHits([]); return; }
    const timer = setTimeout(() => fetch(`/api/v1/search?q=${encodeURIComponent(search)}`).then((r) => r.json()).then((b) => setHits(b.results)).catch(() => undefined), 150);
    return () => clearTimeout(timer);
  }, [search]);

  const addPosition = (id: string) => {
    if (!draft.key || draft.quantity <= 0 || draft.price <= 0) return;
    save(portfolios.map((p) => p.id !== id ? p : { ...p, positions: [...p.positions, { id: newId(), key: draft.key, quantity: draft.quantity, price: draft.price, date: draft.date }] }));
    setDraft({ ...draft, key: "", name: "" });
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">{t("These are hypothetical portfolios you enter yourself, and they are not linked to any brokerage account. ")}{t(DEVICE_NOTE)}</p>
      <div><button type="button" className="btn btn-primary" onClick={() => save([...portfolios, { id: newId(), name: `Portfolio ${portfolios.length + 1}`, positions: [] }])}>{t("Create portfolio")}</button></div>
      {portfolios.length === 0 ? <p>{t("You have no portfolios yet.")}</p> : null}
      {portfolios.map((p) => {
        const lines = p.positions.map((x) => {
          const r = rows[x.key];
          const value = r?.nav != null ? r.nav * x.quantity : null;
          const cost = x.price * x.quantity;
          return { x, r, value, cost, gain: value != null ? value - cost : null };
        });
        const priced = lines.filter((l) => l.value != null);
        const currencies = new Set(priced.map((l) => l.r!.nav_currency));
        const single = currencies.size === 1 ? [...currencies][0] : null;
        const totalValue = priced.reduce((s, l) => s + l.value!, 0);
        const totalCost = priced.reduce((s, l) => s + l.cost, 0);
        return (
          <section key={p.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input aria-label={t("Portfolio name")} className="field max-w-xs font-semibold" value={p.name} onChange={(e) => save(portfolios.map((o) => (o.id === p.id ? { ...o, name: e.target.value } : o)))} />
              <button type="button" className="btn btn-quiet" onClick={() => save(portfolios.filter((o) => o.id !== p.id))}>{t("Delete portfolio")}</button>
            </div>
            {priced.length && single ? (
              <p className="data mb-2 font-semibold" role="status">{t("Value ")}{totalValue.toLocaleString("en-GB", { maximumFractionDigits: 0 })} {single}, {totalValue - totalCost >= 0 ? "up" : "down"} {Math.abs(totalValue - totalCost).toLocaleString("en-GB", { maximumFractionDigits: 0 })} {single} ({formatSignedPct(((totalValue - totalCost) / totalCost) * 100)}){priced.length < lines.length ? t(", for the {n} of {total} positions with a NAV", { n: priced.length, total: lines.length }) : ""}</p>
            ) : priced.length ? <p className="mb-2 text-muted">{t("This portfolio mixes currencies, so no total is shown yet.")}</p> : null}
            {lines.length ? (
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("ETF")}</th><th className="num">{t("Quantity")}</th><th className="num">{t("Your price")}</th><th className="num">{t("Latest NAV")}</th><th className="num">{t("Value")}</th><th className="num">{t("Gain or loss")}</th><th aria-label={t("Remove")} /></tr></thead>
                  <tbody>
                    {lines.map(({ x, r, value, gain }) => (
                      <tr key={x.id}>
                        <td className="min-w-[14rem]"><Link className="font-medium no-underline hover:underline" href={`/etfs/${x.key}`}>{r?.name ?? x.key}</Link><span className="block text-[0.85rem] text-muted">{t("Bought ")}{formatDate(x.date, t.lang)}</span></td>
                        <td className="num">{x.quantity}</td>
                        <td className="num">{x.price.toFixed(2)}</td>
                        <td className="num whitespace-nowrap">{r?.nav != null ? `${r.nav.toFixed(2)} ${r.nav_currency}` : MISSING}</td>
                        <td className="num">{value != null ? value.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : MISSING}</td>
                        <td className={`num ${gain == null ? "" : gain >= 0 ? "text-up" : "text-down"}`}>{gain != null ? gain.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : MISSING}</td>
                        <td><button type="button" aria-label={t("Remove position")} className="cursor-pointer p-1 text-muted hover:text-down" onClick={() => save(portfolios.map((o) => (o.id === p.id ? { ...o, positions: o.positions.filter((y) => y.id !== x.id) } : o)))}><Trash2 size={16} aria-hidden /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <PortfolioInsight positions={p.positions.map((x) => ({ key: x.key, quantity: x.quantity }))} />
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 font-semibold">{t("Add a position")}</p>
              <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <div className="relative">
                  <input aria-label={t("Find an ETF")} placeholder={t("Find an ETF")} className="field" value={draft.portfolio === p.id ? (draft.name || search) : ""} onFocus={() => setDraft({ ...draft, portfolio: p.id })} onChange={(e) => { setDraft({ ...draft, portfolio: p.id, key: "", name: "" }); setSearch(e.target.value); }} />
                  {draft.portfolio === p.id && hits.length && !draft.key ? (
                    <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
                      {hits.map((h) => <li key={h.etf_key}><button type="button" className="w-full cursor-pointer px-3 py-2 text-left hover:bg-sunken" onClick={() => setDraft({ ...draft, key: h.etf_key, name: h.name })}>{h.name}</button></li>)}
                    </ul>
                  ) : null}
                </div>
                <input aria-label={t("Quantity")} className="field data" type="number" min="0" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
                <input aria-label={t("Purchase price")} className="field data" type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
                <input aria-label={t("Purchase date")} className="field data" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                <button type="button" className="btn btn-primary" disabled={!draft.key || draft.portfolio !== p.id} onClick={() => addPosition(p.id)}>{t("Add")}</button>
              </div>
              <p className="mt-2 text-[0.85rem] text-muted">{t("Enter your price in the ETF's NAV currency. Value uses the latest issuer NAV, so ETFs without one show a dash.")}</p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
