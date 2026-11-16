/** Two equal circles whose shared area is the overlap, to scale. They slide together when scrolled into view. */
export function Venn({ pct }: { pct: number }) {
  const r = 30;
  const share = Math.max(0, Math.min(100, pct)) / 100;
  // Area shared by two circles of radius r whose centres are d apart.
  const lens = (d: number) => 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
  let lo = 0, hi = 2 * r;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (lens(mid) / (Math.PI * r * r) > share) lo = mid; else hi = mid; }
  const d = (lo + hi) / 2;
  return (
    <svg viewBox="0 0 130 64" className="venn h-16 w-auto flex-none" data-reveal aria-hidden style={{ "--d": `${(2 * r - d) / 2}px` } as React.CSSProperties}>
      <circle className="venn-a" cx={35} cy={32} r={r} />
      <circle className="venn-b" cx={95} cy={32} r={r} />
    </svg>
  );
}
