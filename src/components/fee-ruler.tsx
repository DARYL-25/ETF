import Link from "next/link";
import type { FeePoint } from "@/lib/etfs/queries";

/**
 * The product's signature: every ETF in the database stacked on one fee scale. Filled dots are
 * TER and hollow dots are OCF, because the two are different measures. `highlight` marks one fund.
 */
export function FeeRuler({ points, highlight, animate = false }: { points: FeePoint[]; highlight?: string; animate?: boolean }) {
  const top = Math.max(0.5, Math.ceil((Math.max(...points.map((p) => p.fee)) + 0.02) * 10) / 10);
  const ticks = Array.from({ length: Math.round(top * 10) + 1 }, (_, i) => i / 10);

  const stacks = new Map<string, FeePoint[]>();
  for (const point of points) {
    const key = point.fee.toFixed(2);
    stacks.set(key, [...(stacks.get(key) ?? []), point]);
  }
  const tallest = Math.max(...[...stacks.values()].map((s) => s.length));
  const step = 15;

  return (
    <figure className="m-0">
      <div className="relative mx-1.5" style={{ height: tallest * step + 26 }}>
        {[...stacks.entries()].map(([key, stack]) => {
          const x = (Number(key) / top) * 100;
          return stack.map((point, level) => {
            const isHighlighted = point.isin === highlight;
            const tipSide = x > 62 ? "right-0" : "left-0";
            return (
              <Link
                key={point.isin}
                href={`/etfs/${point.isin}`}
                aria-label={`${point.name}: ${point.type.toUpperCase()} ${point.fee.toFixed(2)}%`}
                className={`group absolute z-0 flex size-3.5 -translate-x-1/2 items-center justify-center hover:z-20 focus-visible:z-20 ${animate ? "fee-dot-drop" : ""}`}
                style={{ left: `${x}%`, bottom: level * step + 20, animationDelay: animate ? `${Math.round(x * 3 + level * 30)}ms` : undefined }}
              >
                <span
                  className={`block size-3 rounded-full border-2 ${isHighlighted ? "border-saffron" : "border-pine"} group-hover:border-saffron group-focus-visible:border-saffron ${
                    point.type === "ter" ? (isHighlighted ? "bg-saffron" : "bg-pine group-hover:bg-saffron group-focus-visible:bg-saffron") : "bg-transparent"
                  }`}
                />
                <span className={`pointer-events-none absolute bottom-full mb-1.5 hidden w-max max-w-[15rem] rounded border border-ink bg-surface px-2 py-1 text-[0.8rem] leading-snug group-hover:block group-focus-visible:block ${tipSide}`}>
                  {point.name}
                  <span className="data block text-muted">{point.type.toUpperCase()} {point.fee.toFixed(2)}%</span>
                </span>
              </Link>
            );
          });
        })}
        <div className="absolute inset-x-0 bottom-[14px] border-t-[1.5px] border-ink" aria-hidden />
        {ticks.map((tick) => (
          <div key={tick} className="data absolute bottom-0 text-[0.8rem] text-muted" style={{ left: `${(tick / top) * 100}%`, transform: "translate(-50%, 100%)" }}>
            <span className="absolute -top-[6px] left-1/2 block h-[5px] border-l-[1.5px] border-ink" aria-hidden />
            {tick === 0 ? "0%" : `${tick.toFixed(1)}%`}
          </div>
        ))}
      </div>
      <figcaption className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.85rem] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="block size-3 rounded-full border-2 border-pine bg-pine" aria-hidden />TER</span>
        <span className="inline-flex items-center gap-1.5"><span className="block size-3 rounded-full border-2 border-pine" aria-hidden />OCF</span>
        {highlight ? <span className="inline-flex items-center gap-1.5"><span className="block size-3 rounded-full border-2 border-saffron bg-saffron" aria-hidden />This fund</span> : null}
        <span>Yearly fee as published by the issuer. Funds with no fee on file are left out.</span>
      </figcaption>
    </figure>
  );
}
