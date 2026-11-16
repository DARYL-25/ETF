"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Lesson } from "@/lib/academy/content";
import { currencyAdjustedReturn, feeImpact, futureValue, reinvestment } from "@/lib/academy/calc";
import { useLocal } from "./local-store";
import { useT } from "@/lib/i18n/client";

export function useProgress() {
  return useLocal<string[]>("academy-done", []);
}

export function PathProgress({ lessons }: { lessons: string[] }) {
  const t = useT();
  const [done] = useProgress();
  const count = lessons.filter((l) => done.includes(l)).length;
  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-pine" style={{ width: `${(count / lessons.length) * 100}%` }} /></div>
      <p className="data mt-1 text-[0.85rem] text-muted">{t("{count} of {total} lessons done", { count, total: lessons.length })}</p>
    </div>
  );
}

export function DoneMark({ slug }: { slug: string }) {
  const t = useT();
  const [done] = useProgress();
  return done.includes(slug) ? <Check size={16} className="inline text-up" aria-label={t("Done")} /> : null;
}

export function Quiz({ lesson }: { lesson: Lesson }) {
  const t = useT();
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, save] = useProgress();
  const answered = Object.keys(picked).length;
  const correct = lesson.quiz.filter((q, i) => picked[i] === q.answer).length;
  const finished = answered === lesson.quiz.length;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-[1.4rem]">{t("Check your understanding")}</h2>
      <ol className="flex flex-col gap-5">
        {lesson.quiz.map((q, i) => (
          <li key={q.question}>
            <p className="mb-2 font-semibold">{q.question}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((option, o) => {
                const chosen = picked[i] === o;
                const show = picked[i] !== undefined;
                const tone = show && o === q.answer ? "border-up bg-sunken" : chosen ? "border-down" : "border-line hover:border-pine";
                return (
                  <button key={option} type="button" disabled={show} onClick={() => setPicked({ ...picked, [i]: o })} className={`cursor-pointer rounded-lg border px-3 py-2 text-left disabled:cursor-default ${tone}`}>
                    {option}
                  </button>
                );
              })}
            </div>
            {picked[i] !== undefined ? <p className="mt-2 text-[0.95rem]" role="status"><strong>{picked[i] === q.answer ? t("Correct.") : t("Not quite.")}</strong> {q.why}</p> : null}
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <p className="font-semibold">{t("{correct} of {total} correct", { correct, total: lesson.quiz.length })}</p>
          {done.includes(lesson.slug)
            ? <span className="text-up">{t("Lesson done")}</span>
            : <button type="button" className="btn btn-primary" onClick={() => save([...done, lesson.slug])}>{t("Mark lesson as done")}</button>}
        </div>
      ) : null}
    </section>
  );
}

const money = (n: number, lang: string) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="text-[0.9rem] font-medium">{label}
      <input className="field data mt-1 font-normal" type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Card({ title, intro, children, result }: { title: string; intro: string; children: React.ReactNode; result: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-[1.3rem]">{title}</h2>
      <p className="mb-3 mt-1 text-muted">{intro}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
      <div className="data mt-4 rounded-xl bg-sunken p-3" role="status">{result}</div>
    </section>
  );
}

export function Calculators() {
  const t = useT();
  const euro = (n: number) => money(n, t.lang);
  const [fee, setFee] = useState({ initial: 10000, monthly: 200, gross: 7, a: 0.07, b: 0.5, years: 30 });
  const [dca, setDca] = useState({ initial: 5000, monthly: 300, rate: 6, years: 20 });
  const [re, setRe] = useState({ initial: 10000, price: 4, yield: 2, years: 20 });
  const [fx, setFx] = useState({ fund: 10, currency: -5 });
  const a = feeImpact(fee.initial, fee.monthly, fee.gross, fee.a, fee.years);
  const b = feeImpact(fee.initial, fee.monthly, fee.gross, fee.b, fee.years);
  const grown = futureValue(dca.initial, dca.monthly, dca.rate, dca.years);
  const paid = dca.initial + dca.monthly * 12 * dca.years;
  const r = reinvestment(re.initial, re.price, re.yield, re.years);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title={t("Fee impact")} intro={t("Compare two yearly fees on the same investment.")} result={<>
        <p>{t("With {fee}%: ", { fee: fee.a })}<strong>{euro(a.withFee)}</strong></p><p>{t("With {fee}%: ", { fee: fee.b })}<strong>{euro(b.withFee)}</strong></p>
        <p className="mt-1">{t("The higher fee leaves you ")}<strong>{euro(a.withFee - b.withFee)}</strong>{t(" less.")}</p></>}>
        <Field label={t("Starting amount (€)")} value={fee.initial} onChange={(v) => setFee({ ...fee, initial: v })} step={100} />
        <Field label={t("Added each month (€)")} value={fee.monthly} onChange={(v) => setFee({ ...fee, monthly: v })} step={10} />
        <Field label={t("Return before fees (% a year)")} value={fee.gross} onChange={(v) => setFee({ ...fee, gross: v })} step={0.1} />
        <Field label={t("Years")} value={fee.years} onChange={(v) => setFee({ ...fee, years: v })} />
        <Field label={t("Fee A (%)")} value={fee.a} onChange={(v) => setFee({ ...fee, a: v })} step={0.01} />
        <Field label={t("Fee B (%)")} value={fee.b} onChange={(v) => setFee({ ...fee, b: v })} step={0.01} />
      </Card>
      <Card title={t("Compound growth")} intro={t("See how regular investing could add up.")} result={<>
        <p>{t("You pay in: ")}<strong>{euro(paid)}</strong></p><p>{t("Final value: ")}<strong>{euro(grown)}</strong></p></>}>
        <Field label={t("Starting amount (€)")} value={dca.initial} onChange={(v) => setDca({ ...dca, initial: v })} step={100} />
        <Field label={t("Added each month (€)")} value={dca.monthly} onChange={(v) => setDca({ ...dca, monthly: v })} step={10} />
        <Field label={t("Return (% a year)")} value={dca.rate} onChange={(v) => setDca({ ...dca, rate: v })} step={0.1} />
        <Field label={t("Years")} value={dca.years} onChange={(v) => setDca({ ...dca, years: v })} />
      </Card>
      <Card title={t("Reinvesting dividends")} intro={t("Compare reinvesting income with taking it as cash, before tax.")} result={<>
        <p>{t("Reinvested: ")}<strong>{euro(r.reinvested)}</strong></p>
        <p>{t("Taken as cash: ")}<strong>{euro(r.notReinvested)}</strong>{t(" plus ")}<strong>{euro(r.cash)}</strong>{t(" in cash received")}</p></>}>
        <Field label={t("Starting amount (€)")} value={re.initial} onChange={(v) => setRe({ ...re, initial: v })} step={100} />
        <Field label={t("Years")} value={re.years} onChange={(v) => setRe({ ...re, years: v })} />
        <Field label={t("Price growth (% a year)")} value={re.price} onChange={(v) => setRe({ ...re, price: v })} step={0.1} />
        <Field label={t("Dividend yield (%)")} value={re.yield} onChange={(v) => setRe({ ...re, yield: v })} step={0.1} />
      </Card>
      <Card title={t("Currency effect")} intro={t("See how a currency move changes your return.")} result={<p>{t("Your return: ")}<strong>{currencyAdjustedReturn(fx.fund, fx.currency).toFixed(2)}%</strong></p>}>
        <Field label={t("Fund return (%)")} value={fx.fund} onChange={(v) => setFx({ ...fx, fund: v })} step={0.5} />
        <Field label={t("Currency move against yours (%)")} value={fx.currency} onChange={(v) => setFx({ ...fx, currency: v })} step={0.5} />
      </Card>
    </div>
  );
}
