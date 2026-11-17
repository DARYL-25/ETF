"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Copy, FileUp, Share2, Trash2 } from "lucide-react";
import { drift } from "@/lib/portfolio/rebalance";
import { encodeShared } from "@/lib/portfolio/share";
import { formatDate } from "@/lib/format";

export type Position = { id: string; key: string; quantity: number; price: number; date: string };
export type JournalEntry = { id: string; date: string; key: string; action: "buy" | "sell" | "hold" | "note"; reason: string };
export type Portfolio = { id: string; name: string; positions: Position[]; targets?: Record<string, number>; threshold?: number; journal?: JournalEntry[]; note?: string };
type Row = { name: string; nav: number | null; nav_currency: string | null };

const newId = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

type Imported = { line: number; identifier: string; quantity: number; price: number | null; date: string | null; note: string | null; match: { key: string; name: string; nav_currency: string | null } | null };

/** Positions from a broker file or pasted cells. Every row is shown for checking before it is added. */
export function ImportPanel({ onImport }: { onImport: (positions: Position[]) => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: string; rows: Imported[]; skipped: { line: number; text: string; reason: string }[] } | null>(null);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const file = useRef<HTMLInputElement>(null);

  const read = async (body: BodyInit, json: boolean) => {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch("/api/v1/portfolio/import", { method: "POST", body, headers: json ? { "content-type": "application/json" } : undefined });
      const b = await r.json();
      if (!r.ok) { setError(b.error ?? t("We could not read this file. Export it as CSV, or paste the rows.")); return; }
      setResult(b);
      setPicked(Object.fromEntries((b.rows as Imported[]).map((x) => [x.line, Boolean(x.match)])));
    } catch {
      setError(t("We could not read this file. Export it as CSV, or paste the rows."));
    } finally { setBusy(false); }
  };
  const upload = () => { const f = file.current?.files?.[0]; if (!f) return; const form = new FormData(); form.append("file", f); read(form, false); };
  const add = () => {
    if (!result) return;
    const rows = result.rows.filter((r) => r.match && picked[r.line]);
    onImport(rows.map((r) => ({ id: newId(), key: r.match!.key, quantity: r.quantity, price: r.price ?? 0, date: r.date ?? today() })));
    setResult(null); setText("");
  };
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer font-semibold"><FileUp size={16} className="mr-1 inline" aria-hidden />{t("Import positions")}</summary>
      <p className="mt-2 text-[0.9rem] text-muted">{t("Upload a CSV, Excel or PDF statement from your broker, or paste rows copied from a spreadsheet. We read the file in memory and do not keep it. You check every row before it is added.")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input ref={file} type="file" accept=".csv,.tsv,.txt,.xlsx,.pdf" aria-label={t("Broker file")} className="text-[0.9rem]" />
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={upload}>{t("Read file")}</button>
      </div>
      <textarea aria-label={t("Pasted rows")} className="field mt-2 min-h-24 font-mono text-[0.85rem]" placeholder={t("ISIN;Quantity;Price;Date")} value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" className="btn btn-quiet mt-2" disabled={busy || !text.trim()} onClick={() => read(JSON.stringify({ text }), true)}>{t("Read pasted rows")}</button>
      {busy ? <p className="mt-2 text-muted" role="status">{t("Reading…")}</p> : null}
      {error ? <p className="mt-2 text-down" role="alert">{error}</p> : null}
      {result ? (
        <div className="mt-3">
          {result.rows.length ? (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead><tr><th>{t("Add")}</th><th>{t("Found")}</th><th>{t("ETF")}</th><th className="num">{t("Quantity")}</th><th className="num">{t("Price")}</th><th>{t("Date")}</th></tr></thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.line}>
                      <td><input type="checkbox" aria-label={t("Add this row")} className="accent-(--pine)" disabled={!r.match} checked={Boolean(picked[r.line])} onChange={(e) => setPicked({ ...picked, [r.line]: e.target.checked })} /></td>
                      <td className="data">{r.identifier}</td>
                      <td className="min-w-[12rem]">{r.match ? r.match.name : <span className="text-down">{t("Not in our database")}</span>}{r.note ? <span className="block text-[0.8rem] text-muted">{t(r.note)}</span> : null}</td>
                      <td className="num">{r.quantity}</td>
                      <td className="num">{r.price ?? "—"}</td>
                      <td>{r.date ? formatDate(r.date, t.lang) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>{t("No position found. Check that the file has an ISIN or ticker column and a quantity column.")}</p>}
          {result.skipped.length ? <p className="mt-2 text-[0.85rem] text-muted">{t("{n} lines skipped, such as totals or lines without an identifier and a quantity.", { n: result.skipped.length })}</p> : null}
          {result.kind === "pdf" ? <p className="mt-1 text-[0.85rem] text-muted">{t("Read from a PDF: statements are laid out differently by each broker, so check every quantity.")}</p> : null}
          <button type="button" className="btn btn-primary mt-2" disabled={!result.rows.some((r) => r.match && picked[r.line])} onClick={add}>{t("Add the ticked rows")}</button>
        </div>
      ) : null}
    </details>
  );
}

/** Target shares per fund, the drift from them, and the trades or the split of a new contribution that would restore them. */
export function RebalancePanel({ portfolio, rows, onChange }: { portfolio: Portfolio; rows: Record<string, Row>; onChange: (p: Portfolio) => void }) {
  const t = useT();
  const [contribution, setContribution] = useState(0);
  const holdings = useMemo(() => {
    const by = new Map<string, number>();
    for (const x of portfolio.positions) { const r = rows[x.key]; if (r?.nav != null) by.set(x.key, (by.get(x.key) ?? 0) + r.nav * x.quantity); }
    return [...by.entries()].map(([key, value]) => ({ key, name: rows[key]?.name ?? key, value }));
  }, [portfolio.positions, rows]);
  const currencies = new Set(portfolio.positions.map((x) => rows[x.key]?.nav_currency).filter(Boolean));
  const targets = portfolio.targets ?? {};
  const threshold = portfolio.threshold ?? 5;
  const d = drift(holdings, targets, threshold, contribution);
  const money = (v: number) => Math.round(v).toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB");
  if (!holdings.length) return null;
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3" open={d.breached}>
      <summary className="cursor-pointer font-semibold">{t("Target allocation and rebalancing")}{d.breached ? <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 text-[0.8rem] text-warn-ink">{t("{pts} points off target", { pts: d.max_drift_pts.toFixed(1) })}</span> : null}</summary>
      {currencies.size > 1 ? <p className="mt-2 text-[0.85rem] text-muted">{t("Funds in different currencies are added at their NAV without conversion, so treat the amounts as approximate.")}</p> : null}
      <div className="mt-2 flex flex-wrap gap-3">
        <label className="text-[0.85rem] text-muted">{t("Alert when a fund drifts by, in points")}<input className="field mt-1 w-28" type="number" min={1} max={50} value={threshold} onChange={(e) => onChange({ ...portfolio, threshold: Number(e.target.value) || 5 })} /></label>
        <label className="text-[0.85rem] text-muted">{t("New money to invest")}<input className="field mt-1 w-36" type="number" min={0} step={100} value={contribution} onChange={(e) => setContribution(Math.max(0, Number(e.target.value)))} /></label>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>{t("ETF")}</th><th className="num">{t("Now")}</th><th className="num">{t("Target, %")}</th><th className="num">{t("Drift")}</th><th className="num">{t("Trade to target")}</th>{contribution > 0 ? <th className="num">{t("Put new money")}</th> : null}</tr></thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.key}>
                <td className="min-w-[12rem]">{r.name}</td>
                <td className="num">{r.weight_pct.toFixed(1)}%</td>
                <td className="num"><input aria-label={t("Target share for {name}", { name: r.name })} className="field w-20 text-right" type="number" min={0} max={100} step={1} value={targets[r.key] ?? ""} onChange={(e) => onChange({ ...portfolio, targets: { ...targets, [r.key]: Math.max(0, Number(e.target.value)) } })} /></td>
                <td className={`num ${Math.abs(r.drift_pts) >= threshold && d.target_sum > 0 ? "font-semibold text-warn-ink" : ""}`}>{d.target_sum > 0 ? `${r.drift_pts >= 0 ? "+" : ""}${r.drift_pts.toFixed(1)}` : "—"}</td>
                <td className="num">{d.target_sum > 0 ? `${r.trade >= 0 ? "+" : "−"}${money(Math.abs(r.trade))}` : "—"}</td>
                {contribution > 0 ? <td className="num">{d.target_sum > 0 ? money(r.contribution) : "—"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {d.target_sum > 0 && Math.abs(d.target_sum - 100) > 0.5 ? <p className="mt-1 text-[0.85rem] text-muted">{t("Your targets add up to {sum}%, so they are scaled to 100%.", { sum: d.target_sum.toFixed(0) })}</p> : null}
      <p className="mt-2 text-[0.82rem] text-muted">{t("Amounts are in each fund's NAV currency. A plus means buy, a minus sell, before trading costs and tax. Directing new money to the funds below target restores the mix without selling.")}</p>
    </details>
  );
}

const ACTIONS: { value: JournalEntry["action"]; label: string }[] = [{ value: "buy", label: "Bought" }, { value: "sell", label: "Sold" }, { value: "hold", label: "Kept" }, { value: "note", label: "Note" }];

/** Why the reader bought, sold or kept a fund, in their own words, dated. Kept with the portfolio. */
export function JournalPanel({ portfolio, rows, onChange }: { portfolio: Portfolio; rows: Record<string, Row>; onChange: (p: Portfolio) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Omit<JournalEntry, "id">>({ date: today(), key: "", action: "buy", reason: "" });
  const entries = [...(portfolio.journal ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const keys = [...new Set(portfolio.positions.map((p) => p.key))];
  const save = () => { if (!draft.reason.trim()) return; onChange({ ...portfolio, journal: [...(portfolio.journal ?? []), { ...draft, id: newId(), reason: draft.reason.slice(0, 1000) }].slice(-200) }); setDraft({ ...draft, reason: "" }); };
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer font-semibold">{t("Investment journal")}{entries.length ? <span className="ml-2 text-muted">({entries.length})</span> : null}</summary>
      <p className="mt-2 text-[0.9rem] text-muted">{t("Write down why you made each decision. Reading it later is the best defence against reacting to the market.")}</p>
      <div className="mt-2 grid gap-2 md:grid-cols-[9rem_8rem_1fr]">
        <input aria-label={t("Date")} className="field" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <select aria-label={t("Action")} className="field" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value as JournalEntry["action"] })}>{ACTIONS.map((a) => <option key={a.value} value={a.value}>{t(a.label)}</option>)}</select>
        <select aria-label={t("ETF")} className="field" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })}><option value="">{t("Whole portfolio")}</option>{keys.map((k) => <option key={k} value={k}>{rows[k]?.name ?? k}</option>)}</select>
      </div>
      <textarea aria-label={t("Your reason")} className="field mt-2 min-h-20" placeholder={t("For example: buying every month, whatever the market does, for retirement in 2050.")} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
      <button type="button" className="btn btn-quiet mt-2" disabled={!draft.reason.trim()} onClick={save}>{t("Add to journal")}</button>
      {entries.length ? (
        <ul className="mt-3 space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3 border-t border-line pt-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.85rem] text-muted">{formatDate(e.date, t.lang)} · {t(ACTIONS.find((a) => a.value === e.action)?.label ?? "Note")}{e.key ? ` · ${rows[e.key]?.name ?? e.key}` : ""}</p>
                <p className="whitespace-pre-wrap">{e.reason}</p>
              </div>
              <button type="button" aria-label={t("Delete entry")} className="cursor-pointer p-1 text-muted hover:text-down" onClick={() => onChange({ ...portfolio, journal: (portfolio.journal ?? []).filter((x) => x.id !== e.id) })}><Trash2 size={15} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

/** A public link with each fund's share only: no amounts, prices or journal. Nothing is stored on our side. */
export function ShareButton({ portfolio, rows }: { portfolio: Portfolio; rows: Record<string, Row> }) {
  const t = useT();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const make = () => {
    const by = new Map<string, number>();
    for (const x of portfolio.positions) { const r = rows[x.key]; if (r?.nav != null) by.set(x.key, (by.get(x.key) ?? 0) + r.nav * x.quantity); }
    const total = [...by.values()].reduce((s, v) => s + v, 0);
    if (!total) return;
    const code = encodeShared({ name: portfolio.name, note: portfolio.note ?? "", weights: [...by.entries()].map(([k, v]) => [k, (v / total) * 100]) });
    setLink(`${window.location.origin}${t.lang === "fr" ? "/fr" : ""}/shared?c=${code}`);
  };
  const copy = async () => { if (!link) return; try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* The link stays visible to copy by hand. */ } };
  return (
    <div className="mt-3">
      <button type="button" className="btn btn-quiet" onClick={make}><Share2 size={15} aria-hidden /> {t("Share as a public link")}</button>
      {link ? (
        <div className="mt-2 rounded-xl border border-line bg-surface p-3">
          <p className="text-[0.85rem] text-muted">{t("The link shows each fund's share in percent and your note, never amounts or prices. Anyone with the link can see it. Nothing is stored on our side.")}</p>
          <div className="mt-2 flex gap-2"><input readOnly aria-label={t("Public link")} className="field data text-[0.8rem]" value={link} /><button type="button" className="btn btn-quiet" onClick={copy}>{copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}<span className="sr-only">{t("Copy")}</span></button><Link className="btn btn-quiet" href={link.replace(window.location.origin, "")}>{t("Open")}</Link></div>
        </div>
      ) : null}
    </div>
  );
}
