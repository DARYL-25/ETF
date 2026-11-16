import Link from "next/link";
import { shortName, squarify } from "@/lib/etfs/treemap";

export type MosaicItem = { holding_key: string; name: string; ticker: string | null; weight_pct: number };

/**
 * A fund drawn as what it is: a basket. Each tile is one holding, sized by its weight, and links to
 * every ETF that owns it. Holdings beyond the tiles shown are gathered in one last tile.
 */
export function Mosaic({ items, restLabel, label, className = "" }: { items: MosaicItem[]; restLabel: (pct: string) => string; label: string; className?: string }) {
  const shown = items.filter((i) => i.weight_pct > 0);
  const total = shown.reduce((s, i) => s + i.weight_pct, 0);
  const rest = Math.max(0, 100 - total);
  const values = [...shown.map((i) => i.weight_pct), ...(rest > 0.5 ? [rest] : [])];
  // The remainder goes last whatever its size, so it sits in the corner and not among the companies.
  const rects = squarify(values, 100, 56);
  const top = shown[0]?.weight_pct ?? 1;
  return (
    <ul className={`mosaic ${className}`} aria-label={label}>
      {rects.map((r, i) => {
        const item = shown[i];
        const area = (r.w * r.h) / 56;
        const size = area > 2.6 && r.w > 9 ? "l" : r.w > 4.2 && r.h > 3.4 ? "m" : "s";
        const style = { left: `${r.x}%`, top: `${(r.y / 56) * 100}%`, width: `${r.w}%`, height: `${(r.h / 56) * 100}%`, "--i": i, "--k": item ? Math.sqrt(item.weight_pct / top).toFixed(3) : 0 } as React.CSSProperties;
        if (!item) return <li key="rest" className="mosaic-tile mosaic-rest" style={style}><span><b>{restLabel(rest.toFixed(1))}</b></span></li>;
        const short = shortName(item.name);
        return (
          <li key={item.holding_key} className="mosaic-tile" data-size={size} data-deep={item.weight_pct / top > 0.32 ? "" : undefined} style={style}>
            <Link href={`/holdings?key=${encodeURIComponent(item.holding_key)}`} data-tip={`${short} ${item.weight_pct.toFixed(2)}%`} aria-label={`${item.name}, ${item.weight_pct.toFixed(2)}%`}>
              {size !== "s" ? <span className="mosaic-name">{size === "l" ? short : item.ticker || short.split(/[\s,]/)[0]}</span> : null}
              {size === "l" ? <span className="mosaic-weight data">{item.weight_pct.toFixed(2)}%</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
