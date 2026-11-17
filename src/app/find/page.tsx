import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db/client";
import type { EtfRow } from "@/lib/etfs/queries";
import { PageTitle, EtfName } from "@/components/etf-bits";
import { getLens } from "@/lib/lens-server";
import { LENS_COUNTRIES } from "@/lib/lens";
import { ACCOUNTS, accountById, accountsFor, DEFAULT_OWN_RATE, DEFAULT_YIELD, fitsAccount, holdingFor, taxDrag } from "@/lib/tax/drag";
import { allGroupStats, FEE_CEILING } from "@/lib/etfs/stats";
import { assessEtf } from "@/lib/etfs/assess";
import { fundExposures } from "@/lib/etfs/portfolio-data";
import { replicationAdvice, isEuropeanIndex } from "@/lib/tax/replication";
import { taxCountry, taxNotes } from "@/lib/tax/content";
import { themeBySlug } from "@/lib/etfs/themes";
import { countryName, formatMoney } from "@/lib/format";
import { Check, Minus } from "lucide-react";

export const metadata: Metadata = { title: "FindMyETF" };
export const dynamic = "force-dynamic";

type Search = { account?: string; group?: string; index?: string; theme?: string; income?: string; amount?: string; monthly?: string; years?: string; yield?: string; rate?: string; growth?: string };

const num = (v: string | undefined, d: number, min: number, max: number) => { const n = Number(v); return Number.isFinite(n) && v !== undefined && v !== "" ? Math.min(max, Math.max(min, n)) : d; };

/** What a yearly drag costs in money: the gap between growing at the gross return and at the gross return minus the drag. */
function costInMoney(amount: number, monthly: number, years: number, grossPct: number, dragPct: number) {
  const fv = (r: number) => { const m = Math.pow(1 + r / 100, 1 / 12) - 1; let v = amount; for (let i = 0; i < years * 12; i++) v = v * (1 + m) + monthly; return v; };
  return fv(grossPct) - fv(grossPct - dragPct);
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const lens = await getLens();
  const { indices, themes } = await allGroupStats();
  const group = sp.group ?? (sp.index ? `index:${sp.index}` : sp.theme ? `theme:${sp.theme}` : "");
  const [kind, slug] = group.split(":") as ["index" | "theme" | "", string];
  const account = accountById(sp.account) ?? (sp.account ? null : accountsFor(lens?.code)[lens?.code === "FR" ? 1 : 0] ?? null);
  const country = account?.country ?? (sp.account?.endsWith("-NONE") ? sp.account.slice(0, 2) : lens?.code ?? null);
  const amount = num(sp.amount, 10000, 0, 1e9), monthly = num(sp.monthly, 0, 0, 1e7), years = num(sp.years, 10, 1, 50), growth = num(sp.growth, 6, -10, 20);
  const income = sp.income === "accumulating" || sp.income === "distributing" ? sp.income : "";
  const ownRate = sp.rate ? num(sp.rate, 0, 0, 60) : null;
  const yieldIn = sp.yield ? num(sp.yield, 1.5, 0, 15) : null;

  let rows: EtfRow[] = [];
  if (kind === "index" && slug) rows = await query<EtfRow>(`select * from public.etf_directory where index_slug = $1 and not ('leveraged-inverse' = any(category_slugs)) limit 400`, [slug]);
  if (kind === "theme" && slug) rows = await query<EtfRow>(`select * from public.etf_directory where $1 = any(category_slugs) and not ('leveraged-inverse' = any(category_slugs)) limit 400`, [slug]);
  const stats = kind === "index" ? indices.find((g) => g.slug === slug) : themes.find((g) => g.slug === slug);
  const groupLabel = kind === "index" ? stats?.label ?? rows[0]?.index_name ?? slug : themeBySlug(slug)?.label ?? slug;

  const excluded = { account: 0, income: 0, fee: 0 };
  const kept = rows.filter((r) => {
    if (fitsAccount(r, account) === "no" || (account?.id === "FR-PEA" && fitsAccount(r, account) === "check")) { excluded.account++; return false; }
    if (income && r.distribution_policy !== income) { excluded.income++; return false; }
    if (r.headline_fee_pct === null || r.headline_fee_pct > FEE_CEILING) { excluded.fee++; return false; }
    return true;
  });
  const exposures = await fundExposures(kept.slice(0, 120).map((r) => ({ key: r.etf_key ?? r.isin!, name: r.name })));
  const scored = kept.map((r) => {
    const key = r.etf_key ?? r.isin!;
    const us = exposures.find((e) => e.key === key)?.us_pct ?? null;
    const drag = taxDrag({ row: r, account, usSharePct: us, yieldPct: yieldIn, ownRate, holdingYears: years });
    return { r, key, us, drag, money: costInMoney(amount, monthly, years, growth, drag.totalPct), fit: fitsAccount(r, account) };
  }).sort((a, b) => a.drag.totalPct - b.drag.totalPct || (b.r.size_eur ?? 0) - (a.r.size_eur ?? 0));
  const top = scored.slice(0, 12);
  // Peer ranks among the funds that match, for the strengths and weaknesses of each result.
  const feeSorted = [...kept].sort((a, b) => a.headline_fee_pct! - b.headline_fee_pct!);
  const sizeSorted = kept.filter((r) => r.size_eur).sort((a, b) => b.size_eur! - a.size_eur!);
  const group0 = stats ?? null;
  const yieldUsed = yieldIn ?? DEFAULT_YIELD.equity;
  const usForGroup = top.find((x) => x.drag.assumptions.usSharePct !== null)?.drag.assumptions.usSharePct ?? null;
  const replication = rows.length && (rows[0].asset_class === "equity" || !rows[0].asset_class) ? replicationAdvice({ usSharePct: usForGroup, european: rows[0] ? isEuropeanIndex(rows[0]) : null, account, yieldPct: yieldUsed }) : null;
  const holding = holdingFor(account);
  const tc = taxCountry(country);
  const money = (v: number) => new Intl.NumberFormat(t.lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const field = "field mt-1 font-normal";

  return (
    <div>
      <PageTitle title={t("FindMyETF")}>{t("Say where you live, which account you invest through and what you want to follow. We list the matching ETFs, ranked by what they are likely to cost you each year once fees and tax are counted, and say why each one is strong or weak.")}</PageTitle>
      <form action="/find" className="panel grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
        <label className="text-[0.85rem] text-muted md:col-span-1">{t("Country and account")}
          <select name="account" className={field} defaultValue={account?.id ?? (country ? `${country}-NONE` : "")}>
            {LENS_COUNTRIES.map((c) => {
              const accs = ACCOUNTS.filter((a) => a.country === c.code);
              return <optgroup key={c.code} label={countryName(c.code, t.lang)}>{accs.length ? accs.map((a) => <option key={a.id} value={a.id}>{countryName(c.code, t.lang)} · {t(a.label)}</option>) : <option value={`${c.code}-NONE`}>{countryName(c.code, t.lang)} · {t("Any account (tax rules not loaded)")}</option>}</optgroup>;
            })}
          </select>
        </label>
        <label className="text-[0.85rem] text-muted md:col-span-2 xl:col-span-1">{t("Index or theme to follow")}
          <select name="group" className={field} defaultValue={group} required>
            <option value="">{t("Choose…")}</option>
            <optgroup label={t("Indices")}>{indices.map((g) => <option key={g.slug} value={`index:${g.slug}`}>{g.label} ({g.n})</option>)}</optgroup>
            <optgroup label={t("Themes")}>{themes.map((g) => <option key={g.slug} value={`theme:${g.slug}`}>{t(g.label)} ({g.n})</option>)}</optgroup>
          </select>
        </label>
        <label className="text-[0.85rem] text-muted">{t("Income")}
          <select name="income" className={field} defaultValue={income}><option value="">{t("Either")}</option><option value="accumulating">{t("Reinvested (accumulating)")}</option><option value="distributing">{t("Paid out (distributing)")}</option></select>
        </label>
        <label className="text-[0.85rem] text-muted">{t("Amount invested")}<input name="amount" className={field} type="number" min={0} step={1000} defaultValue={amount} /></label>
        <label className="text-[0.85rem] text-muted">{t("Each month")}<input name="monthly" className={field} type="number" min={0} step={50} defaultValue={monthly} /></label>
        <label className="text-[0.85rem] text-muted">{t("Years")}<input name="years" className={field} type="number" min={1} max={50} defaultValue={years} /></label>
        <details className="md:col-span-3 xl:col-span-4">
          <summary className="cursor-pointer text-[0.9rem]">{t("Assumptions")}</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <label className="text-[0.85rem] text-muted">{t("Dividend yield, %")}<input name="yield" className={field} type="number" step={0.1} min={0} placeholder={String(yieldUsed)} defaultValue={sp.yield ?? ""} /></label>
            <label className="text-[0.85rem] text-muted">{t("Your income tax rate, % (where it depends on you)")}<input name="rate" className={field} type="number" step={0.5} min={0} placeholder={account && DEFAULT_OWN_RATE[account.id] !== undefined ? String(DEFAULT_OWN_RATE[account.id]) : ""} defaultValue={sp.rate ?? ""} /></label>
            <label className="text-[0.85rem] text-muted">{t("Index return a year, %")}<input name="growth" className={field} type="number" step={0.5} defaultValue={growth} /></label>
          </div>
        </details>
        <div className="md:col-span-3 xl:col-span-4"><button className="btn btn-primary" type="submit">{t("Find ETFs")}</button></div>
      </form>

      {!slug ? <p className="mt-6 text-muted">{t("Choose an index or a theme to see the matching ETFs.")}</p> : (
        <div className="mt-6 flex flex-col gap-5">
          <section className="grid gap-3 lg:grid-cols-2">
            <div className="panel p-4">
              <h2 className="text-[1.1rem]">{t("Your situation")}</h2>
              <p className="mt-1">{country ? countryName(country, t.lang) : t("No country chosen")}{account ? ` · ${t(account.label)}` : ""}</p>
              {account ? <p className="mt-1 text-muted">{t(account.note)}</p> : null}
              {holding ? <p className="mt-1">{t(holding.effect)}</p> : null}
              {tc ? <p className="mt-2 text-[0.9rem]">{t(tc.summary)} <Link className="prose-link" href={`/tax/${tc.slug}`}>{t("Tax notes")}</Link></p> : country ? <p className="mt-2 text-[0.9rem] text-muted">{t("Tax rules for this country are not loaded yet, so the ranking counts fees and fund-level withholding only.")}</p> : null}
            </div>
            <div className="panel p-4">
              <h2 className="text-[1.1rem]">{t("{group}: the group", { group: t(groupLabel) })}</h2>
              {group0 ? <p className="mt-1">{t("Typical fee here: median {median}%, average {avg}%, from {min}% to {max}% across {n} funds.", { median: group0.median!.toFixed(2), avg: group0.avg!.toFixed(2), min: group0.min!.toFixed(2), max: group0.max!.toFixed(2), n: group0.withFee })}</p> : null}
              {replication ? <><p className="mt-2 font-semibold">{t("Physical or synthetic for this index?")}</p><ul className="mt-1 space-y-1 text-[0.95rem]">{replication.points.map((p) => <li key={p.text}>{t(p.text, p.vars)}</li>)}</ul></> : null}
            </div>
          </section>

          <section>
            <h2 className="text-[1.3rem]">{t("{n} ETFs match, cheapest to hold first", { n: kept.length })}</h2>
            {excluded.account + excluded.income + excluded.fee ? <p className="mt-1 text-[0.9rem] text-muted">{t("Left out: {account} not available in this account, {income} with the other income policy, {fee} without a reliable fee.", { account: excluded.account, income: excluded.income, fee: excluded.fee })}</p> : null}
            <ol className="mt-3 flex flex-col gap-3">
              {top.map((x, i) => {
                const notes = country ? taxNotes(x.r, country).slice(0, 2) : [];
                const a = assessEtf(x.r, group0 ? { group: group0, feeRank: feeSorted.findIndex((r) => r === x.r) + 1, sizeRank: x.r.size_eur ? sizeSorted.findIndex((r) => r === x.r) + 1 : null, withSize: sizeSorted.length, syntheticPeers: kept.filter((r) => r.replication === "synthetic_swap" && r !== x.r).length } : null, { country, account, usSharePct: x.us });
                return (
                  <li key={x.key} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0"><span className="mr-2 text-muted">{i + 1}.</span><EtfName row={x.r} />{x.fit === "likely" ? <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[0.75rem]">{t("PEA: likely, from its name")}</span> : x.fit === "check" ? <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[0.75rem]">{t("Check it is offered in this account")}</span> : null}</div>
                      <div className="text-right"><p className="stat-value">{x.drag.totalPct.toFixed(2)}%</p><p className="text-[0.8rem] text-muted">{t("estimated a year, fee and tax")}</p></div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem]">
                      {x.drag.parts.map((p) => <span key={p.id}>{t(p.label)}: <strong className="data">{p.pct.toFixed(2)}%</strong> <span className="text-muted">({t(p.basis, p.vars)})</span></span>)}
                    </div>
                    <p className="mt-1.5">{t("Over {years} years on your plan, about {money} goes to fees and yearly tax.", { years, money: money(x.money) })}{x.drag.unknown.length ? <span className="text-muted"> {t("Not counted: {what}.", { what: x.drag.unknown.map((u) => t(u)).join(", ") })}</span> : null}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <ul className="space-y-1">{a.pros.slice(0, 3).map((p) => <li key={p.text} className="flex gap-2 text-[0.92rem]"><Check size={15} className="mt-1 flex-none text-up" aria-hidden />{t(p.text, p.vars)}</li>)}</ul>
                      <ul className="space-y-1">{a.cons.slice(0, 3).map((p) => <li key={p.text} className="flex gap-2 text-[0.92rem]"><Minus size={15} className="mt-1 flex-none text-down" aria-hidden />{t(p.text, p.vars)}</li>)}</ul>
                    </div>
                    {notes.length ? <ul className="mt-2 space-y-0.5 text-[0.85rem] text-muted">{notes.map((n) => <li key={n.text}>{t(n.text, n.vars)}</li>)}</ul> : null}
                    <p className="mt-2 flex flex-wrap gap-3 text-[0.9rem]"><Link className="prose-link" href={`/etfs/${x.key}`}>{t("Fund page")}</Link>{top[0] && x.key !== top[0].key ? <Link className="prose-link" href={`/tools/true-cost?a=${encodeURIComponent(top[0].key)}&b=${encodeURIComponent(x.key)}`}>{t("Compare the true cost with the first")}</Link> : null}<span className="text-muted">{t("Size")}: {formatMoney(x.r.size_eur ?? x.r.fund_aum, x.r.size_eur ? "EUR" : x.r.fund_aum_currency, t.lang)}</span></p>
                  </li>
                );
              })}
            </ol>
            {!top.length ? <p className="mt-2">{t("No ETF on this index or theme fits these choices. Try another account or income policy.")}</p> : null}
          </section>
          <p className="max-w-[78ch] text-[0.85rem] text-muted">{t("Ranked by estimated yearly cost: the fund's fee, US dividend tax lost inside the fund, and yearly tax on its income in your account. Tax on the gain when you sell is not spread into this figure; see the holding periods above. These funds match your criteria; this is general information, not a recommendation, and no tax adviser has reviewed the rules.")} <Link className="prose-link" href="/methodology#find">{t("Methodology")}</Link></p>
        </div>
      )}
    </div>
  );
}
