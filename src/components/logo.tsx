/**
 * The ETF Intelligence mark: a rounded square holding a ring cut into three weighted arcs, the
 * largest first, around a centre point. A fund as its parts. Drawn from the Claude Design brand board.
 */
export const MARK_PATHS = [
  { d: "M33.22 12.04A20 20 0 0 1 33.22 51.96L32.73 43.98A12 12 0 0 0 32.73 20.02Z", o: 1 },
  { d: "M30.78 51.96A20 20 0 0 1 12.64 26.99L20.38 29.00A12 12 0 0 0 31.27 43.98Z", o: 0.72 },
  { d: "M13.39 24.67A20 20 0 0 1 30.78 12.04L31.27 20.02A12 12 0 0 0 20.83 27.60Z", o: 0.45 },
];

export function LogoMark({ size = 34, bg = "var(--pine)", fg = "#FFFFFF", dot, className }: { size?: number; bg?: string; fg?: string; dot?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="16" fill={bg} />
      {MARK_PATHS.map((p) => <path key={p.d} d={p.d} fill={fg} fillOpacity={p.o} />)}
      <circle cx="32" cy="32" r="5" fill={dot ?? fg} />
    </svg>
  );
}

/** Mark plus wordmark: "ETF" in ExtraBold navy, "Intelligence" in Light sky blue. */
export function Wordmark({ size = 34, text = "text-[1.3rem]", inverse = false }: { size?: number; text?: string; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display whitespace-nowrap tracking-[-0.03em] ${text}`}>
        <span className={`font-extrabold ${inverse ? "text-white" : "text-ink"}`}>ETF</span>
        <span className={`ml-[0.12em] font-light ${inverse ? "text-sky-soft" : "text-pine"}`}>Intelligence</span>
      </span>
    </span>
  );
}
