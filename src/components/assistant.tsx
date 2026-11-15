"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { formatMoney, formatPct, formatSignedPct } from "@/lib/format";
import type { AssistantReply, ChatMessage } from "@/lib/assistant/agent";
import { IssuerInitials } from "./issuer-initials";

const EXAMPLES = [
  "Nasdaq-100 ETF for a Swiss investor",
  "Cheapest accumulating MSCI World UCITS ETF",
  "Physical S&P 500 ETF for a French resident",
  "Short-duration euro government bond ETFs",
];

/** The ask bar and its answer. Works without AI: the ranked list always comes from the database. */
export function Assistant({ initial, hero = false, home }: { initial?: string; hero?: boolean; home?: string | null }) {
  const t = useT();
  const [text, setText] = useState(initial ?? "");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [asked, setAsked] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const results = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError("");
    setAsked(q);
    const messages: ChatMessage[] = [...history, { role: "user", content: q }];
    try {
      const res = await fetch("/api/v1/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setReply(body);
      setHistory([...messages, { role: "assistant", content: body.text }]);
      setText("");
      requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message || t("The search failed. Try again."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initial && !started.current) { started.current = true; void ask(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const taxHref = reply?.etfs.length ? reply.taxHref ?? null : null;

  return (
    <div className="flex flex-col gap-8">
      <form className={hero ? "mx-auto w-full max-w-3xl" : "w-full max-w-3xl"} onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <div className="ask">
          <textarea id="ask" rows={1} maxLength={2000} value={text} aria-label={t("Describe what you are looking for")}
            onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(text); } }}
            placeholder={history.length ? t("Refine it: only accumulating, under 0.2%, physical…") : home ? t("An ETF for an investor in {country}…", { country: home }) : t("An index, a theme, and where you live")} />
          <button type="submit" disabled={busy || !text.trim()} aria-label={t("Search")}>{busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowUp size={19} aria-hidden />}</button>
        </div>
        {!history.length ? (
          <div className={`mt-4 flex flex-wrap gap-2 ${hero ? "justify-center" : ""}`}>
            {EXAMPLES.map((ex) => <button key={ex} type="button" className="chip" onClick={() => { setText(t(ex)); void ask(t(ex)); }}>{t(ex)}</button>)}
          </div>
        ) : null}
      </form>
      {error ? <p role="alert" className="mx-auto rounded-xl bg-warn-bg px-3 py-2 text-warn-ink">{error}</p> : null}
      {reply ? (
        <div ref={results} className="arrive flex scroll-mt-24 flex-col gap-6" aria-live="polite">
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[1.5rem]">{reply.etfs.length ? t("Closest matches") : "No match"}</h2>
              <button type="button" className="chip" onClick={() => { setHistory([]); setReply(null); setAsked(""); }}><RotateCcw size={13} aria-hidden />{t("Start again")}</button>
            </div>
            <p className="mt-1 text-muted">{t("For “")}{asked}”</p>
            <p className="mt-3 max-w-[72ch] whitespace-pre-line leading-relaxed">{reply.text}</p>
            <p className="mt-1.5 text-[0.85rem] text-muted">{reply.aiUsed ? t("Written by AI from database results, and it can make mistakes.") : t("No AI was used for this answer.")}{t(" Research support, not investment or tax advice.")}</p>
          </section>
          {reply.etfs.length ? (
            <ol className="arrive flex flex-col gap-2.5">
              {reply.etfs.map(({ row, score, reasons, cautions }, i) => (
                <li key={row.etf_key ?? row.isin} className="panel p-4 transition-colors hover:border-pine">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="data mt-1.5 w-5 flex-none text-right text-[0.85rem] text-muted">{i + 1}</span>
                      <IssuerInitials name={row.name} />
                      <div className="min-w-[12rem] flex-1">
                        <Link href={`/etfs/${row.etf_key ?? row.isin}`} className="font-semibold no-underline hover:text-pine">{row.name}</Link>
                        <span className="data block text-[0.85rem] text-muted">{[row.ticker, row.isin].filter(Boolean).join(", ")}</span>
                      </div>
                    </div>
                    <dl className="data flex gap-6 text-right">
                      <div><dt className="text-[0.8rem] text-muted">{t("Fee")}</dt><dd>{formatPct(row.headline_fee_pct)}</dd></div>
                      <div><dt className="text-[0.8rem] text-muted">{t("Size")}</dt><dd>{formatMoney(row.fund_aum ?? row.class_aum, row.fund_aum_currency ?? row.class_aum_currency, t.lang)}</dd></div>
                      <div><dt className="text-[0.8rem] text-muted">1Y</dt><dd>{formatSignedPct(row.nav_return_1y ?? row.return_1y)}</dd></div>
                      <div title={t("Our weighting of fee, size and data available. Not a recommendation.")}><dt className="text-[0.8rem] text-muted">{t("Match")}</dt><dd className="font-semibold text-pine">{score}</dd></div>
                    </dl>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
                    {reasons.map((r) => <span key={r} className="rounded-full bg-sunken px-2.5 py-0.5 text-[0.82rem]">{r}</span>)}
                    {cautions.map((c) => <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-[0.82rem] text-muted">{t("Check: ")}{c.charAt(0).toLowerCase() + c.slice(1)}</span>)}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {reply.applied.length ? <section className="panel p-4"><h2 className="mb-2 text-[1.05rem]">{t("What we took into account")}</h2><ul className="list-disc space-y-1 pl-5">{reply.applied.map((a) => <li key={a}>{a}</li>)}<li>{t("Ranked by fee, size, UCITS status and data available")}</li></ul></section> : null}
            <section className="panel p-4"><h2 className="mb-2 text-[1.05rem]">{t("What we could not check")}</h2><ul className="list-disc space-y-1 pl-5">{reply.notChecked.map((a) => <li key={a}>{a}</li>)}</ul>
              {taxHref ? <p className="mt-2"><Link className="prose-link" href={taxHref}>{t("Read the tax notes")}</Link></p> : null}
            </section>
          </div>
          {reply.lessons.length ? <p>{t("Learn more: ")}{reply.lessons.map((l, i) => <span key={l.slug}>{i ? ", " : ""}<Link className="prose-link" href={`/academy/${l.slug}`}>{l.title}</Link></span>)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
