import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { use } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { CompareToggle } from "@/components/compare-tray";
import { Change, EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { screenEtfs, screenerOptions, type FilterOption } from "@/lib/etfs/queries";
import { DEFAULT_COLUMNS, OPTIONAL_COLUMNS, defaultDirection, parseScreenerParams, screenerHref, type RawParams, type ScreenerParams, type SortKey } from "@/lib/etfs/screener-params";
import { getLens } from "@/lib/lens-server";
import { assetClassLabel, formatDate, countryName, distributionLabel, formatMoney, formatPct, replicationLabel, styleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF Screener" };

function CheckGroup({ title, name, options, selected, label, open, hideCounts }: {
  title: string; name: string; options: FilterOption[]; selected: string[]; label?: (v: string, fallback: string) => string; open?: boolean; hideCounts?: boolean;
}) {
  const t = use(getT());
  if (!options.length) return null;
  return (
    <details className="border-b border-line py-2" open={open || (!hideCounts && selected.length > 0)}>
      <summary className="cursor-pointer py-1 font-semibold">
        {title}{selected.length && !hideCounts ? <span className="ml-1 font-normal text-muted">({selected.length})</span> : null}
      </summary>
      <div className="mt-1 flex max-h-56 flex-col gap-0.5 overflow-y-auto pb-1">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded px-0.5 py-1 hover:bg-sunken">
            <input type="checkbox" className="mt-1 accent-(--pine)" name={name} value={o.value} defaultChecked={selected.includes(o.value)} />
            <span className="min-w-0 flex-1">{t(label ? label(o.value, o.label) : o.label)}</span>
            {hideCounts ? null : <span className="data text-[0.85rem] text-muted">{o.count}</span>}
          </label>
        ))}
      </div>
    </details>
  );
}

function RangeGroup({ title, hint, minName, maxName, min, max, step }: {
  title: string; hint: string; minName: string; maxName: string; min?: number; max?: number; step: string;
}) {
  const t = use(getT());
  return (
    <fieldset className="border-b border-line py-3">
      <legend className="sr-only">{title}</legend>
      <p className="font-semibold" aria-hidden>{title}</p>
      <p className="mb-1.5 text-[0.85rem] text-muted">{t(hint)}</p>
      <div className="flex gap-2">
        <label className="flex-1 text-[0.85rem]">{t("Minimum")}
          <input key={`${minName}-${min}`} className="field mt-0.5" type="number" min="0" step={step} name={minName} defaultValue={min} inputMode="decimal" />
        </label>
        <label className="flex-1 text-[0.85rem]">{t("Maximum")}
          <input key={`${maxName}-${max}`} className="field mt-0.5" type="number" min="0" step={step} name={maxName} defaultValue={max} inputMode="decimal" />
        </label>
      </div>
    </fieldset>
  );
}

function SortHeader({ params, sort, label, numeric, className }: { params: ScreenerParams; sort: SortKey; label: string; numeric?: boolean; className?: string }) {
  const t = use(getT());
  const current = params.sort === sort;
  const dir = params.dir || defaultDirection(params.sort);
  const nextDir = current ? (dir === "asc" ? "desc" : "asc") : defaultDirection(sort);
  return (
    <th className={`${numeric ? "num" : ""} ${className ?? ""}`} aria-sort={current ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={screenerHref(params, { sort, dir: nextDir })} className={`no-underline hover:underline ${current ? "text-ink" : ""}`} scroll={false}>
        {t(label)}{current ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </Link>
    </th>
  );
}

/** Returns differ in date and currency between funds, so each cell says which it is. */
const returnNote = (row: { nav_return_1y: number | null; nav_return_as_of: string | null; nav_currency: string | null; currency: string | null; market_return_as_of?: string | null }, t: T) =>
  row.nav_return_1y !== null ? t("NAV return in {currency}, to {date}", { currency: row.nav_currency ?? row.currency ?? "", date: formatDate(row.nav_return_as_of, t.lang) }) : row.market_return_as_of ? t("Market price change, to {date}", { date: formatDate(row.market_return_as_of, t.lang) }) : "";

export default async function ScreenerPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const t = await getT();
  const params = parseScreenerParams(await searchParams);
  const [result, options] = await Promise.all([screenEtfs(params), screenerOptions()]);

  const activeFilters = [params.issuer, params.domicile, params.assetClass, params.region, params.factor, params.theme, params.bondType, params.index, params.replication, params.distribution, params.style, params.currency]
    .reduce((sum, list) => sum + list.length, 0)
    + [params.feeMin, params.feeMax, params.aumMin, params.aumMax].filter((v) => v !== undefined).length
    + (params.ucits ? 1 : 0) + (params.q ? 1 : 0) + (params.six ? 1 : 0) + (params.pea ? 1 : 0) + (params.hasFee ? 1 : 0);
  const lens = await getLens();
  const has = (list: string[], v: string) => list.includes(v);
  const flip = (list: string[], v: string) => (has(list, v) ? list.filter((x) => x !== v) : [...list, v]);
  const quick: { label: string; on: boolean; href: string }[] = [
    { label: "UCITS", on: params.ucits === "yes", href: screenerHref(params, { ucits: params.ucits === "yes" ? "" : "yes" }) },
    { label: t("Accumulating"), on: has(params.distribution, "accumulating"), href: screenerHref(params, { distribution: flip(params.distribution, "accumulating") }) },
    { label: t("Distributing"), on: has(params.distribution, "distributing"), href: screenerHref(params, { distribution: flip(params.distribution, "distributing") }) },
    { label: t("Actively managed"), on: has(params.factor, "active"), href: screenerHref(params, { factor: flip(params.factor, "active") }) },
    { label: t("Fee known"), on: Boolean(params.hasFee), href: screenerHref(params, { hasFee: params.hasFee ? "" : "1" }) },
    { label: t("Fee up to 0.10%"), on: params.feeMax === 0.1, href: screenerHref(params, { feeMax: params.feeMax === 0.1 ? undefined : 0.1 }) },
    { label: t("Listed on SIX"), on: Boolean(params.six), href: screenerHref(params, { six: params.six ? "" : "1" }) },
  ];
  if (lens?.code === "CH") quick.unshift(quick.pop()!);
  if (lens?.code === "FR") quick.unshift({ label: "PEA", on: Boolean(params.pea), href: screenerHref(params, { pea: params.pea ? "" : "1" }) });

  const columns = params.cols.length ? params.cols : DEFAULT_COLUMNS;
  const show = (key: string) => columns.includes(key);
  // With the default set, a phone shows only the essentials. Columns someone chose always show.
  const phoneHide = params.cols.length ? "" : "hidden md:table-cell";

  const form = (
    <AutoSubmitForm>
      {/* Carries the search text and the sort order through filter changes. */}
      <input type="hidden" name="sort" value={params.sort} />
      {params.six ? <input type="hidden" name="six" value="1" /> : null}
      {params.pea ? <input type="hidden" name="pea" value="1" /> : null}
      {params.hasFee ? <input type="hidden" name="hasFee" value="1" /> : null}
      {params.dir ? <input type="hidden" name="dir" value={params.dir} /> : null}
      <label className="block pb-3 font-semibold">{t("Name, ISIN or ticker")}
        <input key={params.q} className="field mt-1 font-normal" type="search" name="q" defaultValue={params.q} />
      </label>
      <CheckGroup title={t("Asset class")} name="assetClass" options={options.assetClasses} selected={params.assetClass} label={assetClassLabel} open />
      <CheckGroup title={t("Region")} name="region" options={options.categories.filter((c) => c.kind === "region")} selected={params.region} open />
      <CheckGroup title={t("Index")} name="index" options={options.indices} selected={params.index} />
      <CheckGroup title={t("Issuer")} name="issuer" options={options.issuers} selected={params.issuer} />
      <RangeGroup title={t("Yearly fee (%)")} hint="Filters on TER, or OCF where that is what the issuer publishes." minName="feeMin" maxName="feeMax" min={params.feeMin} max={params.feeMax} step="0.01" />
      <RangeGroup title={t("Fund size (€ million)")} hint="Converted to euro with a stored rate, for comparison only." minName="aumMin" maxName="aumMax" min={params.aumMin} max={params.aumMax} step="100" />
      <CheckGroup title={t("Income")} name="distribution" options={options.distributions} selected={params.distribution} label={distributionLabel} />
      <CheckGroup title={t("Replication")} name="replication" options={options.replications} selected={params.replication} label={replicationLabel} />
      <CheckGroup title={t("Domicile")} name="domicile" options={options.domiciles} selected={params.domicile} label={(v) => countryName(v, t.lang)} />
      <CheckGroup title={t("Approach")} name="style" options={options.styles} selected={params.style} label={styleLabel} />
      <CheckGroup title={t("Style")} name="factor" options={options.categories.filter((c) => c.kind === "style")} selected={params.factor} />
      <CheckGroup title={t("Theme")} name="theme" options={options.categories.filter((c) => c.kind === "theme")} selected={params.theme} />
      <CheckGroup title={t("Bond type")} name="bondType" options={options.categories.filter((c) => c.kind === "bond_type")} selected={params.bondType} />
      <CheckGroup title={t("Share class currency")} name="currency" options={options.currencies} selected={params.currency} />
      <fieldset className="border-b border-line py-3">
        <legend className="font-semibold">{t("UCITS")}</legend>
        <select className="field mt-1" name="ucits" defaultValue={params.ucits} aria-label={t("UCITS status")}>
          <option value="">{t("Any")}</option>
          <option value="yes">{t("UCITS only")}</option>
          <option value="no">{t("Not UCITS")}</option>
        </select>
      </fieldset>
      <CheckGroup title={t("Table columns")} name="cols" options={OPTIONAL_COLUMNS.map((c) => ({ value: c.key, label: c.label, count: 0 }))} selected={columns} hideCounts />
      <noscript><button className="btn btn-primary mt-3 w-full" type="submit">{t("Apply filters")}</button></noscript>
    </AutoSubmitForm>
  );

  return (
    <div>
      <PageTitle title={t("Screener")}>{t("Combine filters to narrow the list. The address updates as you go, so a search can be shared by copying the link.")}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <details className="lg:hidden">
            <summary className="btn btn-quiet w-full list-none">{t("Filters")}{activeFilters ? ` (${activeFilters} on)` : ""}</summary>
            <div className="pt-2">{form}</div>
          </details>
          <div className="hidden lg:block">{form}</div>
        </aside>
        <section className="min-w-0" aria-label={t("Results")}>
          <div className="mb-3 flex flex-wrap gap-1.5" aria-label={t("Quick filters")}>
            {quick.map((q) => <Link key={q.label} href={q.href} scroll={false} aria-current={q.on ? "true" : undefined} className={q.on ? "chip chip-on" : "chip"}>{q.label}</Link>)}
          </div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold" role="status">{result.total.toLocaleString(t.lang === "fr" ? "fr-FR" : "en-GB")} {result.total === 1 || t.lang === "fr" ? "ETF" : "ETFs"}</p>
            <span className="flex gap-4">{activeFilters ? <Link href="/screener" className="prose-link">{t("Reset filters")}</Link> : null}<a href={screenerHref(params, {}).replace("/screener", "/api/v1/etfs/export")} className="prose-link" download>{t("Export CSV")}</a></span>
          </div>
          {result.rows.length === 0 ? (
            <div className="border-y border-line py-8">
              <p className="font-semibold">{t("No ETF matches these filters.")}</p>
              <p className="mt-1 text-muted">{t("Remove a filter, or ")}<Link href="/screener" className="prose-link">{t("reset them all")}</Link>{t(". Funds with an unknown fee or size drop out as soon as you filter on that value.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead>
                  <tr>
                    <th aria-label={t("Compare")} />
                    <SortHeader params={params} sort="name" label="ETF" />
                    {show("issuer") ? <SortHeader params={params} sort="issuer" label={t("Issuer")} /> : null}
                    {show("index") ? <SortHeader params={params} sort="index" label={t("Index")} className={phoneHide} /> : null}
                    {show("domicile") ? <SortHeader params={params} sort="domicile" label={t("Domicile")} /> : null}
                    {show("replication") ? <SortHeader params={params} sort="replication" label={t("Replication")} /> : null}
                    <SortHeader params={params} sort="fee" label={t("Yearly fee")} numeric />
                    <SortHeader params={params} sort="aum" label={t("Size")} numeric />
                    {show("return1y") ? <SortHeader params={params} sort="return1y" label="1Y return" numeric className={phoneHide} /> : null}
                    {show("return3y") ? <SortHeader params={params} sort="return3y" label="3Y return p.a." numeric className={phoneHide} /> : null}
                    {show("yield") ? <SortHeader params={params} sort="yield" label={t("Yield")} numeric /> : null}
                    {show("currency") ? <SortHeader params={params} sort="currency" label={t("Currency")} /> : null}
                  </tr>
                </thead>
                <tbody key={JSON.stringify(params)} className="rows-in">
                  {result.rows.map((row, i) => (
                    <tr key={row.etf_key} style={{ "--i": i } as React.CSSProperties}>
                      <td className="w-px"><CompareToggle isin={row.etf_key!} /></td>
                      <td className="min-w-[10.5rem]"><EtfName row={row} /></td>
                      {show("issuer") ? <td className="whitespace-nowrap">{row.issuer_name}</td> : null}
                      {show("index") ? (
                        <td className={`min-w-[8rem] ${phoneHide}`}>
                          {row.index_slug ? <Link href={`/indices/${row.index_slug}`} className="no-underline hover:underline">{row.index_name}</Link> : "—"}
                        </td>
                      ) : null}
                      {show("domicile") ? <td>{countryName(row.domicile, t.lang)}</td> : null}
                      {show("replication") ? <td className="whitespace-nowrap">{t(replicationLabel(row.replication))}</td> : null}
                      <td className="num"><Fee row={row} />{row.headline_fee_pct !== null ? <span className="fee-meter" aria-hidden style={{ "--p": Math.min(1, row.headline_fee_pct / 0.75) } as React.CSSProperties} /> : null}</td>
                      <td className="num whitespace-nowrap">{formatMoney(row.fund_aum ?? row.class_aum, row.fund_aum_currency ?? row.class_aum_currency, t.lang)}{row.aum_level === "share_class" || row.fund_aum === null && row.class_aum !== null ? <span className="block text-[0.75rem] text-muted">{t("Share class")}</span> : null}</td>
                      {show("return1y") ? <td className={`num ${phoneHide}`} title={returnNote(row, t)}><Change value={row.return_1y} />{row.return_1y !== null && returnNote(row, t) ? <span className="block text-[0.75rem] text-muted">{row.nav_return_1y !== null ? row.nav_currency ?? row.currency ?? "" : "price"}</span> : null}</td> : null}
                      {show("return3y") ? <td className={`num ${phoneHide}`} title={returnNote(row, t)}><Change value={row.return_3y} /></td> : null}
                      {show("yield") ? <td className="num">{formatPct(row.trailing_yield_pct)}</td> : null}
                      {show("currency") ? <td>{row.currency ?? "—"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.pages > 1 ? (
            <nav aria-label={t("Pages")} className="mt-3 flex items-center justify-between gap-2">
              {result.page > 1 ? <Link className="btn btn-quiet" scroll={false} href={screenerHref(params, { page: result.page - 1 })}>{t("Previous")}</Link> : <span />}
              <span className="data text-muted">{t("Page ")}{result.page}{t(" of ")}{result.pages}</span>
              {result.page < result.pages ? <Link className="btn btn-quiet" scroll={false} href={screenerHref(params, { page: result.page + 1 })}>{t("Next")}</Link> : <span />}
            </nav>
          ) : null}
          <p className="mt-4 max-w-[72ch] text-[0.85rem] text-muted">
            {t("Most ETFs here are basic records from official lists. Region, theme, style, index and asset class on those records are inferred from the fund name, so check the factsheet. Size is the whole fund unless marked as a share class, in the currency shown. Returns are official NAV figures where we hold them, otherwise market price change. A dash means no verified figure yet.")}
          </p>
        </section>
      </div>
    </div>
  );
}
