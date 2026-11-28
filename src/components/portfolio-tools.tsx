"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileUp, Share2, Trash2 } from "lucide-react";
import { drift } from "@/lib/portfolio/rebalance";
import { encodeShared } from "@/lib/portfolio/share";
import { netPositions, performance, milestones, netOfSubscriptions, type Subscription } from "@/lib/portfolio/performance";
import { taxPoints } from "@/lib/tax/advice";
import { PriceChart } from "./price-chart";
import { ACCOUNTS, accountById, holdingFor } from "@/lib/tax/drag";
import { formatDate } from "@/lib/format";

export type Position = { id: string; key: string; quantity: number; price: number; date: string; side?: "buy" | "sell"; fee?: number };
export type JournalEntry = { id: string; date: string; key: string; action: "buy" | "sell" | "hold" | "note"; reason: string };
export type Portfolio = { id: string; name: string; positions: Position[]; targets?: Record<string, number>; threshold?: number; journal?: JournalEntry[]; note?: string; account?: string; opened?: string; subscriptions?: Subscription[] };
type Row = { name: string; nav: number | null; nav_currency: string | null; distribution_policy?: string | null; asset_class?: string | null; pea_eligible?: boolean | null; headline_fee_pct?: number | null };

const newId = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

type Imported = { line: number; identifier: string; quantity: number; price: number | null; date: string | null; note: string | null; side?: "buy" | "sell"; fee?: number | null; match: { key: string; name: string; nav_currency: string | null } | null };

/** Positions from a broker file or pasted cells. Every row is shown for checking before it is added. */
export function ImportPanel({ onImport }: { onImport: (positions: Position[]) => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: string; ai?: boolean; rows: Imported[]; skipped: { line: number; text: string; reason: string }[] } | null>(null);
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
    onImport(rows.map((r) => ({ id: newId(), key: r.match!.key, quantity: r.quantity, price: r.price ?? 0, date: r.date ?? today(), side: r.side ?? "buy", fee: r.fee ?? 0 })));
    setResult(null); setText("");
  };
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer font-semibold"><FileUp size={16} className="mr-1 inline" aria-hidden />{t("Import positions")}</summary>
      <p className="mt-2 text-[0.9rem] text-muted">{t("Upload a CSV, Excel or PDF statement from your broker, or paste rows copied from a spreadsheet. We read the file in memory and do not keep it. You check every row before it is added.")}</p>
      <p className="mt-1 text-[0.85rem] text-muted">{t("Exports from Degiro, Interactive Brokers, Boursorama, Scalable, Swissquote and Revolut are read as they come, and PDF statements such as Trade Republic's too. For any other layout, our AI finds which column is which; the figures are still read by our code.")}</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.9rem]">
        <span className="text-muted">{t("Or fill our template:")}</span>
        <a className="btn btn-quiet" href={t.lang === "fr" ? "/templates/etf-intelligence-modele-portefeuille.xlsx" : "/templates/etf-intelligence-portfolio-template.xlsx"} download>{t("Download the Excel template")}</a>
      </p>
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
          {result.ai ? <p className="mb-2 rounded-lg bg-(--warn-bg) px-3 py-2 text-[0.9rem] text-(--warn-ink)" role="status">{t("We did not know this layout, so our AI read where the positions are. Check each row carefully before adding it.")}</p> : null}
          {result.rows.length ? (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead><tr><th>{t("Add")}</th><th>{t("Found")}</th><th>{t("ETF")}</th><th>{t("Operation")}</th><th className="num">{t("Quantity")}</th><th className="num">{t("Price")}</th><th className="num">{t("Fee")}</th><th>{t("Date")}</th></tr></thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.line}>
                      <td><input type="checkbox" aria-label={t("Add this row")} className="accent-(--pine)" disabled={!r.match} checked={Boolean(picked[r.line])} onChange={(e) => setPicked({ ...picked, [r.line]: e.target.checked })} /></td>
                      <td className="data">{r.identifier}</td>
                      <td className="min-w-[12rem]">{r.match ? r.match.name : <span className="text-down">{t("Not in our database")}</span>}{r.note ? <span className="block text-[0.8rem] text-muted">{t(r.note)}</span> : null}</td>
                      <td>{r.side === "sell" ? t("Sale") : t("Purchase")}</td>
                      <td className="num">{r.quantity}</td>
                      <td className="num">{r.price ?? "—"}</td>
                      <td className="num">{r.fee ?? "—"}</td>
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
    for (const x of netPositions(portfolio.positions)) { const r = rows[x.key]; if (r?.nav != null) by.set(x.key, (by.get(x.key) ?? 0) + r.nav * x.quantity); }
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
    for (const x of netPositions(portfolio.positions)) { const r = rows[x.key]; if (r?.nav != null) by.set(x.key, (by.get(x.key) ?? 0) + r.nav * x.quantity); }
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

const pctFmt = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`);

/** The account a portfolio sits in and its opening date, with the holding periods that follow from them. */
export function AccountPanel({ portfolio, onChange, lens }: { portfolio: Portfolio; onChange: (p: Portfolio) => void; lens: string | null }) {
  const t = useT();
  const account = accountById(portfolio.account);
  const holding = holdingFor(account);
  const perPurchase = account?.id === "IE-BROKER";
  const marks = milestones(account, portfolio.opened ?? null, portfolio.positions, holding?.years ?? null, perPurchase);
  const options = ACCOUNTS.filter((a) => !lens || a.country === lens || a.id === portfolio.account);
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3" open={Boolean(account)}>
      <summary className="cursor-pointer font-semibold">{t("Account and tax clock")}{account ? <span className="ml-2 text-muted">{t(account.label)}</span> : null}</summary>
      <div className="mt-2 flex flex-wrap gap-3">
        <label className="text-[0.85rem] text-muted">{t("Account type")}
          <select className="field mt-1" value={portfolio.account ?? ""} onChange={(e) => onChange({ ...portfolio, account: e.target.value || undefined })}>
            <option value="">{t("Not set")}</option>
            {options.map((a) => <option key={a.id} value={a.id}>{a.country} · {t(a.label)}</option>)}
          </select>
        </label>
        {!perPurchase ? <label className="text-[0.85rem] text-muted">{t("Opened on")}<input className="field mt-1" type="date" value={portfolio.opened ?? ""} onChange={(e) => onChange({ ...portfolio, opened: e.target.value || undefined })} /></label> : null}
      </div>
      {account ? <p className="mt-2">{t(account.note)}</p> : <p className="mt-2 text-muted">{t("Choose the account to see its tax clock. The country list follows the country chosen at the top of the page.")}</p>}
      {holding?.effect ? <p className="mt-1">{t(holding.effect)}</p> : null}
      {marks.length ? (
        <ul className="mt-2 space-y-1">
          {marks.slice(0, 12).map((m, i) => <li key={i} className={m.passed ? "text-up" : ""}>{m.key ? `${m.key} · ` : ""}{m.passed ? t("Reached on {date}", { date: formatDate(m.date, t.lang) }) : t("Reaches {years} years on {date}", { years: holding!.years, date: formatDate(m.date, t.lang) })}</li>)}
        </ul>
      ) : account && holding?.years && !perPurchase && !portfolio.opened ? <p className="mt-1 text-muted">{t("Enter the opening date to see when the period ends.")}</p> : null}
    </details>
  );
}

/** Gains, fees and the money-weighted return (XIRR) from the reader's own buys and sells. */
export function PerformancePanel({ portfolio, rows, onChange }: { portfolio: Portfolio; rows: Record<string, Row>; onChange?: (p: Portfolio) => void }) {
  const t = useT();
  const prices = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { nav: r.nav, currency: r.nav_currency, name: r.name }]));
  const perf = performance(portfolio.positions, prices);
  const subs = portfolio.subscriptions ?? [];
  const net = netOfSubscriptions(perf, subs);
  const brokerFees = perf.funds.reduce((sum, f) => sum + f.fees, 0);
  const fundFeesYear = perf.funds.reduce((sum, f) => sum + (f.value ?? 0) * ((rows[f.key]?.headline_fee_pct ?? 0) / 100), 0);
  const m = (v: number | null, ccy: string | null) => (v === null ? "—" : `${Math.round(v).toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB")}${ccy ? ` ${ccy}` : ""}`);
  if (!perf.funds.length) return null;
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3" open>
      <summary className="cursor-pointer font-semibold">{t("Performance from your transactions")}</summary>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {perf.currencies.map((c) => (
          <div key={c.currency} className="rounded-xl bg-sunken p-3">
            <p className="text-[0.85rem] text-muted">{t("In {ccy}", { ccy: c.currency })}</p>
            <p className="stat-value">{pctFmt(c.xirr)}<span className="ml-1 text-[0.8rem] font-normal text-muted">{t("a year (XIRR)")}</span></p>
            <p className="text-[0.9rem]">{t("Paid in {in}, taken out {out}, worth {value}: gain {gain}.", { in: m(c.paidIn, null), out: m(c.takenOut, null), value: m(c.value, null), gain: m(c.gain, null) })}</p>
            {!c.complete ? <p className="text-[0.8rem] text-muted">{t("Some funds have no NAV, so the return is not shown.")}</p> : null}
            {(() => { const n = net.find((x) => x.currency === c.currency); return n && n.subscriptions > 0 ? <p className="mt-1 text-[0.9rem]"><b>{t("After subscriptions")}</b>: {t("gain {gain}, {xirr} a year", { gain: m(n.netGain, null), xirr: pctFmt(n.netXirr) })}</p> : null; })()}
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="table-data">
          <thead><tr><th>{t("ETF")}</th><th className="num">{t("Units held")}</th><th className="num">{t("Average cost")}</th><th className="num">{t("Value")}</th><th className="num">{t("Unrealised")}</th><th className="num">{t("Realised")}</th><th className="num">{t("Fees paid")}</th><th className="num">{t("XIRR")}</th><th className="num">{t("Held for")}</th></tr></thead>
          <tbody>
            {perf.funds.map((f) => (
              <tr key={f.key}>
                <td className="min-w-[12rem]">{f.name}</td>
                <td className="num">{Number(f.held.toFixed(4))}</td>
                <td className="num">{f.avgCost === null ? "—" : f.avgCost.toFixed(2)}</td>
                <td className="num">{m(f.value, f.currency)}</td>
                <td className={`num ${f.unrealised === null ? "" : f.unrealised >= 0 ? "text-up" : "text-down"}`}>{m(f.unrealised, null)}</td>
                <td className={`num ${f.realised >= 0 ? "" : "text-down"}`}>{f.realised ? m(f.realised, null) : "—"}</td>
                <td className="num">{f.fees ? f.fees.toFixed(2) : "—"}</td>
                <td className="num">{f.days !== null && f.days < 365 ? <span title={t("Under a year, the total return is shown: a yearly rate would exaggerate it.")}>{pctFmt(f.paidIn ? ((f.value ?? 0) + f.takenOut - f.paidIn) / f.paidIn : null)} <span className="text-[0.75rem] text-muted">{t("total")}</span></span> : pctFmt(f.xirr)}</td>
                <td className="num whitespace-nowrap">{f.days === null ? "—" : f.days >= 365 ? t("{n} years", { n: (f.days / 365.25).toFixed(1) }) : t("{n} days", { n: f.days })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-sunken p-3"><p className="text-[0.85rem] text-muted">{t("Broker fees paid")}</p><p className="stat-value">{m(brokerFees, perf.currencies.length === 1 ? perf.currencies[0].currency : null)}</p></div>
        <div className="rounded-xl bg-sunken p-3"><p className="text-[0.85rem] text-muted">{t("Subscriptions paid")}</p><p className="stat-value">{net.reduce((x, n) => x + n.subscriptions, 0) ? net.filter((n) => n.subscriptions).map((n) => m(n.subscriptions, n.currency)).join(" + ") : "—"}</p></div>
        <div className="rounded-xl bg-sunken p-3"><p className="text-[0.85rem] text-muted">{t("Fund fees, per year at today's value")}</p><p className="stat-value">{fundFeesYear ? m(fundFeesYear, perf.currencies.length === 1 ? perf.currencies[0].currency : null) : "—"}</p></div>
      </div>
      {onChange ? <SubscriptionsEditor subs={subs} onChange={(next) => onChange({ ...portfolio, subscriptions: next })} /> : null}
      {perf.warnings.map((w) => <p key={w.text + JSON.stringify(w.vars)} className="mt-1 text-[0.85rem] text-muted">{t(w.text, w.vars)}</p>)}
      <p className="mt-2 text-[0.82rem] text-muted">{t("Average cost method; fees are added to purchases and deducted from sales. XIRR is the yearly return that balances your payments, withdrawals and today's value at their dates; it is shown once a fund has been held for more than a day. Values use the latest NAV in the fund's currency, before tax.")}</p>
    </details>
  );
}

/** Recurring costs outside the trades, so the profit shown is what is really left. */
function SubscriptionsEditor({ subs, onChange }: { subs: Subscription[]; onChange: (s: Subscription[]) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Omit<Subscription, "id">>({ label: "", amount: 0, currency: "EUR", every: "month", from: today() });
  return (
    <div className="mt-4 rounded-xl border border-line p-3">
      <p className="font-semibold">{t("Recurring costs")}</p>
      <p className="text-[0.85rem] text-muted">{t("Custody fees, a broker or app subscription, an adviser: anything you pay to invest, so the gain shown is what you really keep.")}</p>
      {subs.length ? (
        <ul className="mt-2 space-y-1">
          {subs.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
              <span>{x.label || t("Subscription")} · {x.amount} {x.currency} {x.every === "month" ? t("a month") : t("a year")} · {t("since {date}", { date: formatDate(x.from, t.lang) })}{x.to ? ` → ${formatDate(x.to, t.lang)}` : ""}</span>
              <button type="button" aria-label={t("Remove")} className="cursor-pointer p-1 text-muted hover:text-down" onClick={() => onChange(subs.filter((y) => y.id !== x.id))}><Trash2 size={15} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1fr_auto]">
        <input aria-label={t("What it is")} placeholder={t("What it is, e.g. broker plan")} className="field" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value.slice(0, 80) })} />
        <input aria-label={t("Amount")} className="field data" type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Math.max(0, Number(e.target.value)) })} />
        <input aria-label={t("Currency")} className="field data uppercase" maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} />
        <select aria-label={t("How often")} className="field" value={draft.every} onChange={(e) => setDraft({ ...draft, every: e.target.value as "month" | "year" })}><option value="month">{t("Monthly")}</option><option value="year">{t("Yearly")}</option></select>
        <input aria-label={t("Since")} className="field data" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <button type="button" className="btn btn-quiet" disabled={!(draft.amount > 0) || !draft.from} onClick={() => { onChange([...subs, { ...draft, id: newId() }]); setDraft({ ...draft, label: "", amount: 0 }); }}>{t("Add")}</button>
      </div>
    </div>
  );
}

/** Each fund's price history with the reader's own purchases and sales marked on it. */
export function TradesChartPanel({ portfolio, rows }: { portfolio: Portfolio; rows: Record<string, Row> }) {
  const t = useT();
  const keys = [...new Set(portfolio.positions.map((p) => p.key))];
  const [key, setKey] = useState(keys[0] ?? "");
  const [data, setData] = useState<{ name: string; ticker: string | null; currency: string | null; fee_pct: number | null; points: { date: string; close: number }[] } | null>(null);
  const active = keys.includes(key) ? key : keys[0] ?? "";
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    setData(null);
    fetch(`/api/v1/etfs/${encodeURIComponent(active)}/prices`, { signal: c.signal }).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => undefined);
    return () => c.abort();
  }, [active]);
  const trades = useMemo(() => portfolio.positions.filter((p) => p.key === active).map((p) => ({ date: p.date, side: p.side ?? "buy", quantity: p.quantity, price: p.price } as const)), [portfolio.positions, active]);
  if (!keys.length) return null;
  const before = data?.points.length ? trades.filter((x) => x.date < data.points[0].date).length : 0;
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3" open>
      <summary className="cursor-pointer font-semibold">{t("Your trades on the chart")}</summary>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select aria-label={t("ETF")} className="field max-w-md" value={active} onChange={(e) => setKey(e.target.value)}>{keys.map((k) => <option key={k} value={k}>{rows[k]?.name ?? k}</option>)}</select>
        <span className="inline-flex items-center gap-1.5 text-[0.85rem]"><span aria-hidden className="size-3 rounded-full bg-up" />{t("Purchase")}</span>
        <span className="inline-flex items-center gap-1.5 text-[0.85rem]"><span aria-hidden className="size-3 rounded-full bg-down" />{t("Sale")}</span>
      </div>
      <div className="mt-3">
        {data && data.points.length >= 5 ? <PriceChart series={[{ label: `${data.ticker ?? data.name} (${data.currency ?? ""})`, currency: data.currency, points: data.points }]} feePct={data.fee_pct} trades={trades} />
          : data ? <p className="text-muted">{t("We do not hold enough price history for this ETF yet to draw your trades.")}</p>
          : <p className="text-muted" role="status">{t("Loading…")}</p>}
      </div>
      {before ? <p className="mt-1 text-[0.85rem] text-muted">{t("{n} of your trades are older than the price history we hold, so they are not drawn.", { n: before })}</p> : null}
    </details>
  );
}

/** Tax points for the reader's own positions, and a short plan written from them by an open-weight model. */
export function TaxAdvicePanel({ portfolio, rows, lens }: { portfolio: Portfolio; rows: Record<string, Row>; lens: string | null }) {
  const t = useT();
  const [plan, setPlan] = useState<{ text: string | null; model: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const account = accountById(portfolio.account);
  const prices = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { nav: r.nav, currency: r.nav_currency, name: r.name }]));
  const perf = performance(portfolio.positions, prices);
  const facts = Object.entries(rows).map(([key, r]) => ({ key, name: r.name, distribution_policy: r.distribution_policy ?? null, asset_class: r.asset_class ?? null, pea_eligible: r.pea_eligible ?? null }));
  const points = taxPoints({ account, opened: portfolio.opened ?? null, lots: portfolio.positions, funds: perf.funds, facts });
  if (!perf.funds.length) return null;
  const write = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/v1/portfolio/tax-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        account: account?.label ?? null, country: account?.country ?? lens, points: points.map((p) => t(p.text, p.vars)),
        funds: perf.funds.map((f) => ({ name: f.name, held_years: f.days === null ? null : Number((f.days / 365.25).toFixed(1)), gain: f.unrealised === null ? null : Math.round(f.unrealised), currency: f.currency })),
      }) });
      setPlan(r.ok ? await r.json() : { text: null, model: null });
    } finally { setBusy(false); }
  };
  const tone = { act: "border-l-pine", wait: "border-l-saffron", info: "border-l-line-strong" } as const;
  return (
    <details className="mt-3 rounded-xl border border-line bg-surface p-3" open>
      <summary className="cursor-pointer font-semibold">{t("Tax points for this portfolio")}{points.length ? <span className="ml-2 text-muted">({points.length})</span> : null}</summary>
      <ul className="mt-2 flex flex-col gap-2">
        {points.map((p) => <li key={p.id} className={`rounded-lg border-l-4 bg-sunken px-3 py-2 ${tone[p.level]}`}>{t(p.text, p.vars)}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-navy" disabled={busy || !points.length} onClick={write}>{busy ? t("Writing…") : t("Write my tax plan")}</button>
        <span className="text-[0.82rem] text-muted">{t("Written by an open-source AI model from the points above only.")}</span>
      </div>
      {plan ? (plan.text ? (
        <div className="mt-3 rounded-xl border border-line p-3">
          <div className="whitespace-pre-wrap leading-relaxed">{plan.text}</div>
          {plan.model ? <p className="mt-2 text-[0.78rem] text-muted">{t("Model: {model}", { model: plan.model })}</p> : null}
        </div>
      ) : <p className="mt-2 text-muted">{t("The AI model is not available right now. The points above are complete without it.")}</p>) : null}
      <p className="mt-2 text-[0.82rem] text-muted">{t("Estimates from the rules on our tax pages and your own entries, before allowances and personal circumstances. General information, not tax advice.")} <Link className="prose-link" href="/tax">{t("Tax notes by country")}</Link></p>
    </details>
  );
}
