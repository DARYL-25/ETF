"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney, formatPct, formatSignedPct } from "@/lib/format";
import type { AssistantReply, ChatMessage } from "@/lib/assistant/agent";
import { IssuerInitials } from "./issuer-initials";

const EXAMPLES = [
  "Nasdaq-100 ETF for a Swiss investor",
  "Cheapest accumulating MSCI World UCITS ETF",
  "Physical S&P 500 ETF for a French resident",
  "Short-duration euro government bond ETFs",
  "What is the difference between TER and tracking difference?",
];

export function Assistant({ initial }: { initial?: string }) {
  const [text, setText] = useState(initial ?? "");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    const messages: ChatMessage[] = [...history, { role: "user", content: q }];
    try {
      const res = await fetch("/api/v1/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setReply(body);
      setHistory([...messages, { role: "assistant", content: body.text }]);
      setText("");
    } catch (e) {
      setError((e as Error).message || "The search failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initial && !started.current) { started.current = true; void ask(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="flex flex-col gap-6">
      <form className="hero-panel flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <label htmlFor="ask" className="font-display text-[1.3rem] font-semibold">Describe what you are looking for</label>
        <textarea id="ask" rows={2} className="field py-2" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(text); } }}
          placeholder="For example: Nasdaq-100 ETF for a Swiss investor, accumulating, with low fees" />
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Searching" : "Search"}</button>
          {history.length ? <button type="button" className="btn btn-quiet" onClick={() => { setHistory([]); setReply(null); }}>Start again</button> : null}
        </div>
        {!history.length ? (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => <button key={ex} type="button" className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-[0.9rem] hover:border-pine" onClick={() => { setText(ex); void ask(ex); }}>{ex}</button>)}
          </div>
        ) : null}
      </form>
      {error ? <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-warn-ink">{error}</p> : null}
      {reply ? (
        <>
          <section aria-live="polite">
            <p className="max-w-[72ch] whitespace-pre-line text-[1.05rem] leading-relaxed">{reply.text}</p>
            <p className="mt-2 text-[0.85rem] text-muted">{reply.aiUsed ? "Written by AI from database results, and it can make mistakes." : "No AI was used for this answer."} Research support, not investment or tax advice.</p>
          </section>
          {reply.etfs.length ? (
            <section>
              <h2 className="mb-3 text-[1.4rem]">Closest matches</h2>
              <ol className="flex flex-col gap-3">
                {reply.etfs.map(({ row, score, reasons, cautions }) => (
                  <li key={row.etf_key ?? row.isin} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <IssuerInitials name={row.name} />
                        <div className="min-w-[12rem]">
                          <Link href={`/etfs/${row.etf_key ?? row.isin}`} className="font-semibold no-underline hover:text-pine hover:underline">{row.name}</Link>
                          <span className="data block text-[0.85rem] text-muted">{[row.ticker, row.isin].filter(Boolean).join(", ")}</span>
                        </div>
                      </div>
                      <div className="data flex gap-5 text-right">
                        <div><span className="block text-[0.8rem] text-muted">Fee</span>{formatPct(row.headline_fee_pct)}</div>
                        <div><span className="block text-[0.8rem] text-muted">Size</span>{formatMoney(row.fund_aum, row.fund_aum_currency)}</div>
                        <div><span className="block text-[0.8rem] text-muted">1Y</span>{formatSignedPct(row.return_1y)}</div>
                        <div title="Our weighting of fee, size and data available. Not a recommendation."><span className="block text-[0.8rem] text-muted">Match</span><strong className="text-pine">{score}</strong></div>
                      </div>
                    </div>
                    {reasons.length ? <p className="mt-2 text-[0.9rem]">{reasons.join(", ")}.</p> : null}
                    {cautions.length ? <p className="mt-0.5 text-[0.9rem] text-muted">Check: {cautions.join(", ").toLowerCase()}.</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {reply.applied.length ? <section className="rounded-2xl border border-line bg-surface p-4"><h2 className="mb-2 text-[1.1rem]">What we took into account</h2><ul className="list-disc space-y-1 pl-5">{reply.applied.map((a) => <li key={a}>{a}</li>)}<li>Ranked by fee, size, UCITS status and data available</li></ul></section> : null}
            <section className="rounded-2xl border border-line bg-surface p-4"><h2 className="mb-2 text-[1.1rem]">What we could not check</h2><ul className="list-disc space-y-1 pl-5">{reply.notChecked.map((a) => <li key={a}>{a}</li>)}</ul></section>
          </div>
          {reply.lessons.length ? <p>Learn more: {reply.lessons.map((l, i) => <span key={l.slug}>{i ? ", " : ""}<Link className="prose-link" href={`/academy/${l.slug}`}>{l.title}</Link></span>)}</p> : null}
        </>
      ) : null}
    </div>
  );
}
