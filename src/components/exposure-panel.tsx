"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import world from "@/lib/geo/world.json";
import { localCountry, mapName, type Slice } from "@/lib/geo/exposure";

type World = { width: number; height: number; countries: { id: string; name: string; d: string; c: [number, number] }[]; points: { name: string; c: [number, number] }[] };
const W = world as unknown as World;
const POLY = new Set(W.countries.map((c) => c.name));

/** Ice blue to sky to navy, on the square root of the share so small exposures still show. */
function shade(share: number) {
  const stops = [[234, 244, 255], [124, 192, 255], [26, 140, 255], [10, 42, 94]];
  const t = Math.min(1, Math.sqrt(share)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(",")})`;
}

export function WorldMap({ rows, label }: { rows: Slice[]; label: string }) {
  const t = useT();
  const [hover, setHover] = useState<string | null>(null);
  const by = new Map<string, Slice>();
  for (const r of rows) { const n = mapName(r.label); const prev = by.get(n); by.set(n, { label: r.label, weight_pct: (prev?.weight_pct ?? 0) + r.weight_pct }); }
  const max = Math.max(...rows.map((r) => r.weight_pct), 1);
  const dots = W.points.filter((p) => by.has(p.name) && !POLY.has(p.name));
  const hv = hover ? by.get(hover) : null;
  return (
    <figure className="m-0">
      <div className="relative">
        <svg viewBox={`0 0 ${W.width} ${W.height}`} className="w-full" role="img" aria-label={label}>
          {W.countries.map((c) => {
            const r = by.get(c.name);
            return (
              <path key={c.id + c.name} d={c.d} fill={r ? shade(r.weight_pct / max) : "var(--sunken)"} stroke="var(--surface)" strokeWidth={0.6}
                onMouseEnter={() => setHover(r ? c.name : null)} onMouseLeave={() => setHover(null)} className={r ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}>
                {r ? <title>{`${r.label}: ${r.weight_pct.toFixed(1)}%`}</title> : null}
              </path>
            );
          })}
          {dots.map((p) => { const r = by.get(p.name)!; return <circle key={p.name} cx={p.c[0]} cy={p.c[1]} r={5} fill={shade(r.weight_pct / max)} stroke="var(--navy)" strokeWidth={1} onMouseEnter={() => setHover(p.name)} onMouseLeave={() => setHover(null)}><title>{`${r.label}: ${r.weight_pct.toFixed(1)}%`}</title></circle>; })}
        </svg>
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-xl bg-surface/90 px-3 py-2 text-[0.85rem] shadow backdrop-blur" aria-live="polite">
          {hv ? <><b>{localCountry(hv.label, t.lang)}</b> {hv.weight_pct.toFixed(1)}%</> : <span className="text-muted">{t("Hover a country")}</span>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[0.78rem] text-muted" aria-hidden>
        <span>0%</span><span className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(0.01)}, ${shade(0.25)}, ${shade(0.6)}, ${shade(1)})` }} /><span>{max.toFixed(0)}%</span>
      </div>
    </figure>
  );
}

function Bars({ rows, labelOf }: { rows: Slice[]; labelOf?: (l: string) => string }) {
  const top = Math.max(...rows.map((r) => r.weight_pct), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.slice(0, 12).map((r, i) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-[0.92rem]"><span className="truncate">{labelOf ? labelOf(r.label) : r.label}</span><span className="data">{r.weight_pct.toFixed(1)}%</span></div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-sunken"><div className="grow-bar h-full rounded-full" style={{ width: `${((r.weight_pct / top) * 100).toFixed(1)}%`, backgroundColor: i === 0 ? "var(--pine)" : "var(--sky-soft)", animationDelay: `${i * 40}ms` }} /></div>
        </li>
      ))}
      {rows.length > 12 ? <li className="text-[0.82rem] text-muted">{`+ ${rows.length - 12}`}</li> : null}
    </ul>
  );
}

export type ExposureData = { countries: Slice[]; sectors: Slice[]; currencies: Slice[]; providers?: Slice[]; providerCountries?: Slice[]; domiciles?: Slice[]; note?: string };

/** Map first, then the same money cut by currency, sector and, for a portfolio, by provider. */
export function ExposurePanel({ data, title }: { data: ExposureData; title?: string }) {
  const t = useT();
  const tabs = ([
    ["map", t("Map"), data.countries.length > 0],
    ["countries", t("Countries"), data.countries.length > 0],
    ["currencies", t("Currencies"), data.currencies.length > 0],
    ["sectors", t("Sectors"), data.sectors.length > 1],
    ["providers", t("Providers"), (data.providers?.length ?? 0) > 0],
    ["providerCountries", t("Provider countries"), (data.providerCountries?.length ?? 0) > 0],
    ["domiciles", t("Fund domiciles"), (data.domiciles?.length ?? 0) > 0],
  ] as [string, string, boolean][]).filter(([, , on]) => on);
  const [tab, setTab] = useState(tabs[0]?.[0] ?? "map");
  if (!tabs.length) return null;
  const country = (l: string) => localCountry(l, t.lang);
  return (
    <div className="flex flex-col gap-4">
      {title ? <h3 className="text-[1.1rem]">{title}</h3> : null}
      <div role="tablist" aria-label={t("Exposure")} className="seg flex-wrap self-start">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <div role="tabpanel">
        {tab === "map" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-center">
            <WorldMap rows={data.countries} label={t("Countries this money is invested in")} />
            <Bars rows={data.countries.slice(0, 8)} labelOf={country} />
          </div>
        ) : tab === "countries" ? <Bars rows={data.countries} labelOf={country} />
          : tab === "currencies" ? <Bars rows={data.currencies} labelOf={(l) => (l === "Other" ? t("Other") : l)} />
          : tab === "sectors" ? <Bars rows={data.sectors} labelOf={(l) => t(l)} />
          : tab === "providers" ? <Bars rows={data.providers!} labelOf={(l) => (l === "Other" ? t("Other") : l)} />
          : tab === "providerCountries" ? <><Bars rows={data.providerCountries!} labelOf={(l) => (l === "Other" ? t("Other") : country(l))} /><p className="mt-2 text-[0.82rem] text-muted">{t("Where the companies behind your funds are based. Your money is held by the fund and its custodian, not by the provider, but a provider's country decides which regulator watches it.")}</p></>
          : <><Bars rows={data.domiciles!} labelOf={(l) => (l === "Other" ? t("Other") : country(l))} /><p className="mt-2 text-[0.82rem] text-muted">{t("The country a fund is legally set up in decides how foreign dividends are taxed before they reach the fund, and how your own country taxes it.")}</p></>}
      </div>
      {data.note ? <p className="text-[0.82rem] text-muted">{data.note}</p> : null}
    </div>
  );
}
