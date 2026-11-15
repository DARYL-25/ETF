import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageTitle } from "@/components/etf-bits";
import { MISSING, formatPct } from "@/lib/format";
import { getHolders, searchSecurities } from "@/lib/etfs/holdings";
import { query } from "@/lib/db/client";


export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Which ETFs hold a company" };

const eur = (v: number | null) => (v === null ? MISSING : v >= 1e9 ? `€${(v / 1e9).toFixed(1)}bn` : `€${Math.round(v / 1e6)}m`);

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; key?: string }> }) {
  const t = await getT();
  const { q = "", key } = await searchParams;
  const [securities, holders, coverage] = await Promise.all([
    q && !key ? searchSecurities(q.slice(0, 60)) : [],
    key ? getHolders(key.slice(0, 80)) : [],
    query<{ etfs: number; securities: number }>("select (select count(*)::int from public.holdings_summary) as etfs, (select count(distinct holding_key)::int from public.holdings) as securities"),
  ]);
  const security = holders[0];
  return (
    <div className="max-w-4xl">
      <PageTitle title={t("Which ETFs hold it?")}>{t("Type a company or a ticker to see every ETF that owns it, and how much of each fund it makes up.")}</PageTitle>
      <form action="/holdings" className="flex max-w-xl gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t("Company name or ticker")}</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder={t("Nvidia, NESN, ASML…")} className="field pl-10" autoComplete="off" />
        </label>
        <button className="btn btn-primary" type="submit">{t("Search")}</button>
      </form>
      <p className="mt-2 text-[0.85rem] text-muted">{t("Covers the ")}{coverage[0].etfs.toLocaleString("en-GB")}{t(" ETFs whose issuers publish a holdings file, and ")}{coverage[0].securities.toLocaleString("en-GB")}{t(" securities. Other ETFs may hold it too.")}</p>

      {q && !key ? (
        <section className="mt-8">
          <h2 className="mb-2 text-[1.3rem]">{securities.length ? t("Pick the security") : t("No security starts with that")}</h2>
          {securities.length ? (
            <ul className="flex flex-col gap-2">
              {securities.map((s) => (
                <li key={s.holding_key}>
                  <Link href={`/holdings?key=${encodeURIComponent(s.holding_key)}`} className="panel flex items-center justify-between gap-4 px-4 py-3 no-underline transition-colors hover:border-pine">
                    <span><span className="font-semibold">{s.name}</span>{s.ticker ? <span className="data ml-2 text-muted">{s.ticker}</span> : null}</span>
                    <span className="data whitespace-nowrap text-muted">{s.etfs} {s.etfs === 1 ? "ETF" : "ETFs"}{t(", up to ")}{s.max_weight.toFixed(1)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted">{t("Try the start of the company's name as issuers write it, or its exchange ticker.")}</p>}
        </section>
      ) : null}

      {key ? (
        <section className="mt-8">
          {security ? (
            <>
              <h2 className="text-[1.3rem]">{security.security}{security.security_ticker ? <span className="data ml-2 text-[1rem] font-normal text-muted">{security.security_ticker}</span> : null}</h2>
              <p className="mb-3 mt-1 text-muted">{t("Held by ")}{holders.length}{holders.length === 100 ? t(" or more") : ""}{t(" ETFs, heaviest weight first.")}</p>
              <div className="overflow-x-auto">
                <table className="table-data">
                  <thead><tr><th>{t("ETF")}</th><th className="num">{t("Weight in the fund")}</th><th className="num">{t("Yearly fee")}</th><th className="num">{t("Size")}</th></tr></thead>
                  <tbody>
                    {holders.map((h) => (
                      <tr key={h.etf_key}>
                        <td className="min-w-[15rem]"><Link className="font-medium no-underline hover:text-pine" href={`/etfs/${h.etf_key}`}>{h.name}</Link><span className="data block text-[0.85rem] text-muted">{[h.ticker, h.isin].filter(Boolean).join(", ")}</span></td>
                        <td className="num">{h.weight_pct.toFixed(2)}%</td>
                        <td className="num">{formatPct(h.headline_fee_pct)}</td>
                        <td className="num whitespace-nowrap">{eur(h.size_eur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-muted">{t("No ETF on file holds that security.")}</p>}
        </section>
      ) : null}
    </div>
  );
}
