import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { CompareToggle } from "@/components/compare-tray";
import { Change, EtfName, Fee, PageTitle } from "@/components/etf-bits";
import { screenEtfs, screenerOptions, type FilterOption } from "@/lib/etfs/queries";
import { DEFAULT_COLUMNS, OPTIONAL_COLUMNS, defaultDirection, parseScreenerParams, screenerHref, type RawParams, type ScreenerParams, type SortKey } from "@/lib/etfs/screener-params";
import { assetClassLabel, countryName, distributionLabel, formatMoney, formatPct, replicationLabel, styleLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ETF Screener" };

function CheckGroup({ title, name, options, selected, label, open, hideCounts }: {
  title: string; name: string; options: FilterOption[]; selected: string[]; label?: (v: string, fallback: string) => string; open?: boolean; hideCounts?: boolean;
}) {
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
            <span className="min-w-0 flex-1">{label ? label(o.value, o.label) : o.label}</span>
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
  return (
    <fieldset className="border-b border-line py-3">
      <legend className="sr-only">{title}</legend>
      <p className="font-semibold" aria-hidden>{title}</p>
      <p className="mb-1.5 text-[0.85rem] text-muted">{hint}</p>
      <div className="flex gap-2">
        <label className="flex-1 text-[0.85rem]">Minimum
          <input key={`${minName}-${min}`} className="field mt-0.5" type="number" min="0" step={step} name={minName} defaultValue={min} inputMode="decimal" />
        </label>
        <label className="flex-1 text-[0.85rem]">Maximum
          <input key={`${maxName}-${max}`} className="field mt-0.5" type="number" min="0" step={step} name={maxName} defaultValue={max} inputMode="decimal" />
        </label>
      </div>
    </fieldset>
  );
}

function SortHeader({ params, sort, label, numeric, className }: { params: ScreenerParams; sort: SortKey; label: string; numeric?: boolean; className?: string }) {
  const current = params.sort === sort;
  const dir = params.dir || defaultDirection(params.sort);
  const nextDir = current ? (dir === "asc" ? "desc" : "asc") : defaultDirection(sort);
  return (
    <th className={`${numeric ? "num" : ""} ${className ?? ""}`} aria-sort={current ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={screenerHref(params, { sort, dir: nextDir })} className={`no-underline hover:underline ${current ? "text-ink" : ""}`} scroll={false}>
        {label}{current ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </Link>
    </th>
  );
}

export default async function ScreenerPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = parseScreenerParams(await searchParams);
  const [result, options] = await Promise.all([screenEtfs(params), screenerOptions()]);

  const activeFilters = [params.issuer, params.domicile, params.assetClass, params.region, params.factor, params.theme, params.bondType, params.index, params.replication, params.distribution, params.style, params.currency]
    .reduce((sum, list) => sum + list.length, 0)
    + [params.feeMin, params.feeMax, params.aumMin, params.aumMax].filter((v) => v !== undefined).length
    + (params.ucits ? 1 : 0) + (params.q ? 1 : 0);

  const columns = params.cols.length ? params.cols : DEFAULT_COLUMNS;
  const show = (key: string) => columns.includes(key);
  // With the default set, a phone shows only the essentials. Columns someone chose always show.
  const phoneHide = params.cols.length ? "" : "hidden md:table-cell";

  const form = (
    <AutoSubmitForm>
      {/* Carries the search text and the sort order through filter changes. */}
      <input type="hidden" name="sort" value={params.sort} />
      {params.dir ? <input type="hidden" name="dir" value={params.dir} /> : null}
      <label className="block pb-3 font-semibold">Name, ISIN or ticker
        <input key={params.q} className="field mt-1 font-normal" type="search" name="q" defaultValue={params.q} />
      </label>
      <CheckGroup title="Asset class" name="assetClass" options={options.assetClasses} selected={params.assetClass} label={assetClassLabel} open />
      <CheckGroup title="Region" name="region" options={options.categories.filter((c) => c.kind === "region")} selected={params.region} open />
      <CheckGroup title="Index" name="index" options={options.indices} selected={params.index} />
      <CheckGroup title="Issuer" name="issuer" options={options.issuers} selected={params.issuer} />
      <RangeGroup title="Yearly fee (%)" hint="Filters on TER, or OCF where that is what the issuer publishes." minName="feeMin" maxName="feeMax" min={params.feeMin} max={params.feeMax} step="0.01" />
      <RangeGroup title="Fund size (€ million)" hint="Converted to euro with a stored rate, for comparison only." minName="aumMin" maxName="aumMax" min={params.aumMin} max={params.aumMax} step="100" />
      <CheckGroup title="Income" name="distribution" options={options.distributions} selected={params.distribution} label={distributionLabel} />
      <CheckGroup title="Replication" name="replication" options={options.replications} selected={params.replication} label={replicationLabel} />
      <CheckGroup title="Domicile" name="domicile" options={options.domiciles} selected={params.domicile} label={countryName} />
      <CheckGroup title="Approach" name="style" options={options.styles} selected={params.style} label={styleLabel} />
      <CheckGroup title="Style" name="factor" options={options.categories.filter((c) => c.kind === "style")} selected={params.factor} />
      <CheckGroup title="Theme" name="theme" options={options.categories.filter((c) => c.kind === "theme")} selected={params.theme} />
      <CheckGroup title="Bond type" name="bondType" options={options.categories.filter((c) => c.kind === "bond_type")} selected={params.bondType} />
      <CheckGroup title="Share class currency" name="currency" options={options.currencies} selected={params.currency} />
      <fieldset className="border-b border-line py-3">
        <legend className="font-semibold">UCITS</legend>
        <select className="field mt-1" name="ucits" defaultValue={params.ucits} aria-label="UCITS status">
          <option value="">Any</option>
          <option value="yes">UCITS only</option>
          <option value="no">Not UCITS</option>
        </select>
      </fieldset>
      <CheckGroup title="Table columns" name="cols" options={OPTIONAL_COLUMNS.map((c) => ({ value: c.key, label: c.label, count: 0 }))} selected={columns} hideCounts />
      <noscript><button className="btn btn-primary mt-3 w-full" type="submit">Apply filters</button></noscript>
    </AutoSubmitForm>
  );

  return (
    <div>
      <PageTitle title="ETF Screener">Combine filters to narrow the list. The page address updates as you go, so you can share a search by copying the link.</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <details className="lg:hidden">
            <summary className="btn btn-quiet w-full list-none">Filters{activeFilters ? ` (${activeFilters} on)` : ""}</summary>
            <div className="pt-2">{form}</div>
          </details>
          <div className="hidden lg:block">{form}</div>
        </aside>
        <section className="min-w-0" aria-label="Results">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold" role="status">{result.total} {result.total === 1 ? "ETF" : "ETFs"}</p>
            {activeFilters ? <Link href="/screener" className="prose-link">Reset filters</Link> : null}
          </div>
          {result.rows.length === 0 ? (
            <div className="border-y border-line py-8">
              <p className="font-semibold">No ETF matches these filters.</p>
              <p className="mt-1 text-muted">Remove a filter, or <Link href="/screener" className="prose-link">reset them all</Link>. Funds with an unknown fee or size drop out as soon as you filter on that value.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead>
                  <tr>
                    <th aria-label="Compare" />
                    <SortHeader params={params} sort="name" label="ETF" />
                    {show("issuer") ? <SortHeader params={params} sort="issuer" label="Issuer" /> : null}
                    {show("index") ? <SortHeader params={params} sort="index" label="Index" className={phoneHide} /> : null}
                    {show("domicile") ? <SortHeader params={params} sort="domicile" label="Domicile" /> : null}
                    {show("replication") ? <SortHeader params={params} sort="replication" label="Replication" /> : null}
                    <SortHeader params={params} sort="fee" label="Yearly fee" numeric />
                    <SortHeader params={params} sort="aum" label="Fund size" numeric />
                    {show("return1y") ? <SortHeader params={params} sort="return1y" label="1Y return" numeric className={phoneHide} /> : null}
                    {show("return3y") ? <SortHeader params={params} sort="return3y" label="3Y return p.a." numeric className={phoneHide} /> : null}
                    {show("yield") ? <SortHeader params={params} sort="yield" label="Yield" numeric /> : null}
                    {show("currency") ? <SortHeader params={params} sort="currency" label="Currency" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.etf_key}>
                      <td className="w-px"><CompareToggle isin={row.etf_key!} /></td>
                      <td className="min-w-[10.5rem]"><EtfName row={row} /></td>
                      {show("issuer") ? <td className="whitespace-nowrap">{row.issuer_name}</td> : null}
                      {show("index") ? (
                        <td className={`min-w-[8rem] ${phoneHide}`}>
                          {row.index_slug ? <Link href={`/indices/${row.index_slug}`} className="no-underline hover:underline">{row.index_name}</Link> : "—"}
                        </td>
                      ) : null}
                      {show("domicile") ? <td>{countryName(row.domicile)}</td> : null}
                      {show("replication") ? <td className="whitespace-nowrap">{replicationLabel(row.replication)}</td> : null}
                      <td className="num"><Fee row={row} /></td>
                      <td className="num whitespace-nowrap">{formatMoney(row.fund_aum, row.fund_aum_currency)}</td>
                      {show("return1y") ? <td className={`num ${phoneHide}`}><Change value={row.return_1y} /></td> : null}
                      {show("return3y") ? <td className={`num ${phoneHide}`}><Change value={row.return_3y} /></td> : null}
                      {show("yield") ? <td className="num">{formatPct(row.trailing_yield_pct)}</td> : null}
                      {show("currency") ? <td>{row.currency ?? "—"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.pages > 1 ? (
            <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-2">
              {result.page > 1 ? <Link className="btn btn-quiet" scroll={false} href={screenerHref(params, { page: result.page - 1 })}>Previous</Link> : <span />}
              <span className="data text-muted">Page {result.page} of {result.pages}</span>
              {result.page < result.pages ? <Link className="btn btn-quiet" scroll={false} href={screenerHref(params, { page: result.page + 1 })}>Next</Link> : <span />}
            </nav>
          ) : null}
          <p className="mt-4 max-w-[72ch] text-[0.85rem] text-muted">
            Most ETFs here are basic records from official lists, with name, identifiers and issuer. Detailed fields appear as issuer data is added, so filters on fees, region or income narrow to researched funds. Asset class on basic records is inferred from the name. A dash means we have no verified figure yet. Size is the whole fund where the issuer gives it, and the share class for iShares, in the currency shown. 1Y and 3Y are official NAV returns from the issuer factsheet where we hold one, otherwise the change in market price. Each ETF page shows which.
          </p>
        </section>
      </div>
    </div>
  );
}
