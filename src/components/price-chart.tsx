"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AreaSeries, ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

export type ChartSeries = { label: string; currency: string | null; points: { date: string; close: number }[] };

const RANGES = [
  { key: "1Y", years: 1 },
  { key: "3Y", years: 3 },
  { key: "5Y", years: 5 },
  { key: "10Y", years: 10 },
  { key: "MAX", years: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const toTime = (date: string) => (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function cutoffDate(lastDate: string, years: number | null): string | null {
  if (years === null) return null;
  const d = new Date(`${lastDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Rebases a series so its first point in view equals 100. */
export function rebase(points: { date: string; close: number }[]) {
  if (!points.length) return [];
  const base = points[0].close;
  return points.map((p) => ({ date: p.date, close: (p.close / base) * 100 }));
}

export function PriceChart({ series }: { series: ChartSeries[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<RangeKey>("5Y");
  const [view, setView] = useState<"price" | "rebased">(series.length > 1 ? "rebased" : "price");
  const [kind, setKind] = useState<"area" | "line">("area");
  const [readout, setReadout] = useState<{ date: string; values: string[] } | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const multi = series.length > 1;

  useEffect(() => {
    const bump = () => setThemeTick((t) => t + 1);
    window.addEventListener("themechange", bump);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", bump);
    return () => {
      window.removeEventListener("themechange", bump);
      media.removeEventListener("change", bump);
    };
  }, []);

  const inView = useMemo(() => {
    // For several series, start where all of them have data, so rebasing compares like with like.
    const lastDate = series.flatMap((s) => s.points.at(-1)?.date ?? []).sort().at(-1) ?? "";
    const years = RANGES.find((r) => r.key === range)!.years;
    let start = cutoffDate(lastDate, years) ?? "";
    if (multi) {
      const latestFirst = series.map((s) => s.points[0]?.date ?? "").sort().at(-1) ?? "";
      if (latestFirst > start) start = latestFirst;
    }
    return series.map((s) => {
      const points = s.points.filter((p) => p.date >= start);
      return { ...s, points: view === "rebased" ? rebase(points) : points };
    });
  }, [series, range, view, multi]);

  useEffect(() => {
    if (!holder.current) return;
    const colors = [cssVar("--pine"), cssVar("--saffron"), cssVar("--down"), cssVar("--ink"), cssVar("--muted")];
    const chart: IChartApi = createChart(holder.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--muted"), fontFamily: "Public Sans Variable, system-ui, sans-serif", attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVar("--line"), style: LineStyle.Solid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderColor: cssVar("--line"), fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { dateFormat: "dd MMM yyyy" },
    });
    const apis: ISeriesApi<"Area" | "Line">[] = inView.map((s, i) => {
      const color = colors[i % colors.length];
      const api = !multi && kind === "area"
        ? chart.addSeries(AreaSeries, { lineColor: color, lineWidth: 2, topColor: `${color}44`, bottomColor: `${color}05`, priceLineVisible: false })
        : chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false });
      api.setData(s.points.map((p) => ({ time: toTime(p.date), value: p.close })));
      return api;
    });
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) return setReadout(null);
      const date = new Date((param.time as number) * 1000).toISOString().slice(0, 10);
      setReadout({
        date,
        values: apis.map((api, i) => {
          const item = param.seriesData.get(api) as { value?: number } | undefined;
          if (item?.value === undefined) return `${inView[i].label}: no data`;
          return `${inView[i].label}: ${item.value.toFixed(2)}${view === "price" && inView[i].currency ? ` ${inView[i].currency}` : ""}`;
        }),
      });
    });
    return () => chart.remove();
  }, [inView, kind, multi, view, themeTick]);

  const change = useMemo(() => inView.map((s) => {
    const first = s.points[0];
    const last = s.points.at(-1);
    return first && last ? ((last.close / first.close - 1) * 100) : null;
  }), [inView]);

  const segment = "cursor-pointer rounded px-2.5 py-1 font-medium aria-pressed:bg-pine aria-pressed:text-pine-ink hover:bg-sunken aria-pressed:hover:bg-pine";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Time range" className="flex">
          {RANGES.map((r) => (
            <button key={r.key} type="button" className={segment} aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.key}</button>
          ))}
        </div>
        <div role="group" aria-label="Value shown" className="flex">
          <button type="button" className={segment} aria-pressed={view === "price"} onClick={() => setView("price")}>Price</button>
          <button type="button" className={segment} aria-pressed={view === "rebased"} onClick={() => setView("rebased")}>Start at 100</button>
        </div>
        {!multi ? (
          <div role="group" aria-label="Chart type" className="flex">
            <button type="button" className={segment} aria-pressed={kind === "area"} onClick={() => setKind("area")}>Area</button>
            <button type="button" className={segment} aria-pressed={kind === "line"} onClick={() => setKind("line")}>Line</button>
          </div>
        ) : null}
      </div>
      <p className="data min-h-[1.5em] text-[0.9rem]" aria-live="off">
        {readout
          ? `${readout.date}: ${readout.values.join(", ")}`
          : inView.map((s, i) => `${s.label} ${change[i] === null ? "no data" : `${change[i]! >= 0 ? "+" : "−"}${Math.abs(change[i]!).toFixed(1)}%`}`).join(", ") + ` over ${range === "MAX" ? "the full history" : range}`}
      </p>
      <div ref={holder} className="h-[20rem] w-full lg:h-[24rem]" role="img" aria-label={`Price history chart: ${series.map((s) => s.label).join(", ")}`} />
    </div>
  );
}
