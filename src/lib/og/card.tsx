import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/components/logo";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The picture shown when a page is shared: the page's name, one line under it, and up to three figures.
 * Drawn with plain shapes in the site's colours, echoing the holdings mosaic.
 */
export function ogCard({ eyebrow, title, line, facts = [] }: { eyebrow?: string; title: string; line?: string; facts?: [string, string][] }) {
  const tiles = [34, 22, 16, 12, 9, 7];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#F2F8FF", color: "#0A2A5E", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="60" height="60" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1A8CFF" />{MARK_PATHS.map((p) => <path key={p.d} d={p.d} fill="#FFFFFF" fillOpacity={p.o} />)}<circle cx="32" cy="32" r="5" fill="#FFFFFF" /></svg>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, color: "#0A2A5E" }}>ETF</div>
            <div style={{ fontSize: 22, fontWeight: 300, color: "#1A8CFF", marginTop: 2 }}>Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {eyebrow ? <div style={{ fontSize: 28, color: "#1A8CFF", fontWeight: 600 }}>{eyebrow}</div> : null}
          <div style={{ fontSize: title.length > 48 ? 56 : 72, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, display: "flex" }}>{title.length > 90 ? `${title.slice(0, 88)}…` : title}</div>
          {line ? <div style={{ fontSize: 30, color: "#4A5D7E", display: "flex" }}>{line.length > 120 ? `${line.slice(0, 118)}…` : line}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            {facts.slice(0, 3).map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 44, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 24, color: "#4A5D7E" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {tiles.map((h, i) => <div key={h} style={{ width: 34, height: h * 3, borderRadius: 6, background: "#1A8CFF", opacity: 1 - i * 0.14 }} />)}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
