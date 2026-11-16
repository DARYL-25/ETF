import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The picture shown when a page is shared: the page's name, one line under it, and up to three figures.
 * Drawn with plain shapes in the site's colours, echoing the holdings mosaic.
 */
export function ogCard({ eyebrow, title, line, facts = [] }: { eyebrow?: string; title: string; line?: string; facts?: [string, string][] }) {
  const tiles = [34, 22, 16, 12, 9, 7];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#f4f8fc", color: "#0a2238", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 600 }}>
          <svg width="44" height="44" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#136ac6" /><path d="M5.5 13.5 9 10l2.6 2.4 4.9-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ETF Intelligence
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {eyebrow ? <div style={{ fontSize: 28, color: "#136ac6", fontWeight: 600 }}>{eyebrow}</div> : null}
          <div style={{ fontSize: title.length > 48 ? 56 : 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, display: "flex" }}>{title.length > 90 ? `${title.slice(0, 88)}…` : title}</div>
          {line ? <div style={{ fontSize: 30, color: "#4a6076", display: "flex" }}>{line.length > 120 ? `${line.slice(0, 118)}…` : line}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            {facts.slice(0, 3).map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 44, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 24, color: "#4a6076" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {tiles.map((h, i) => <div key={h} style={{ width: 34, height: h * 3, borderRadius: 6, background: "#136ac6", opacity: 1 - i * 0.14 }} />)}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
