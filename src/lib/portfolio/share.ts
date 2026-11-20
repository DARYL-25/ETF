/**
 * Public portfolio links. A shared portfolio carries only a name and each fund's share in percent, never
 * amounts or prices, and lives entirely in the link: nothing is stored on our side, so deleting the link
 * is enough to stop sharing it.
 */
export type SharedPortfolio = { name: string; note: string; weights: [string, number][] };

const toB64Url = (s: string) => (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => { const b = s.replace(/-/g, "+").replace(/_/g, "/"); return typeof atob === "function" ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, "base64").toString("utf8"); };

export function encodeShared(p: SharedPortfolio): string {
  const weights = p.weights.filter(([, w]) => w > 0).slice(0, 40).map(([k, w]) => [k, Math.round(w * 10) / 10] as [string, number]);
  return toB64Url(JSON.stringify({ n: p.name.slice(0, 80), d: p.note.slice(0, 400), w: weights }));
}

export function decodeShared(code: string | null | undefined): SharedPortfolio | null {
  if (!code || code.length > 6000) return null;
  try {
    const raw = JSON.parse(fromB64Url(code)) as { n?: unknown; d?: unknown; w?: unknown };
    if (!Array.isArray(raw.w)) return null;
    const weights = raw.w.filter((x): x is [string, number] => Array.isArray(x) && typeof x[0] === "string" && /^[A-Z0-9.-]{3,40}$/i.test(x[0]) && typeof x[1] === "number" && x[1] > 0 && x[1] <= 100).slice(0, 40);
    if (!weights.length) return null;
    return { name: typeof raw.n === "string" ? raw.n.slice(0, 80) : "Shared portfolio", note: typeof raw.d === "string" ? raw.d.slice(0, 400) : "", weights };
  } catch {
    return null;
  }
}
