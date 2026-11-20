/**
 * Portfolio performance from the reader's own transactions: every buy and sell with its date, price, quantity
 * and fee. Gains use the average cost method, and returns are money-weighted (XIRR): the yearly rate that
 * makes what was paid in, what was taken out and what is held today balance, at the dates they happened.
 * Amounts stay in each fund's NAV currency; funds in different currencies are reported separately rather
 * than converted at today's rate, which would misstate past flows.
 */
export type Lot = { id?: string; key: string; quantity: number; price: number; date: string; side?: "buy" | "sell"; fee?: number };
export type Flow = { date: string; amount: number };
export type FundPerf = {
  key: string; name: string; currency: string | null;
  held: number; avgCost: number | null; costBasis: number; value: number | null;
  unrealised: number | null; realised: number; fees: number; paidIn: number; takenOut: number;
  xirr: number | null; firstDate: string | null; days: number | null;
};
export type CurrencyPerf = { currency: string; paidIn: number; takenOut: number; value: number; gain: number; xirr: number | null; complete: boolean };
export type Performance = { funds: FundPerf[]; currencies: CurrencyPerf[]; warnings: { text: string; vars: Record<string, string> }[] };

const DAY = 864e5;

/** Money-weighted yearly return. Negative amounts go in, positive amounts come out. Null when it cannot be solved. */
export function xirr(flows: Flow[]): number | null {
  const fs = flows.filter((f) => f.amount !== 0).map((f) => ({ t: new Date(f.date).getTime(), a: f.amount })).sort((a, b) => a.t - b.t);
  if (fs.length < 2 || !fs.some((f) => f.a < 0) || !fs.some((f) => f.a > 0)) return null;
  const t0 = fs[0].t;
  const years = fs.map((f) => (f.t - t0) / (365.25 * DAY));
  if (years.at(-1)! < 1 / 365) return null;
  const npv = (r: number) => fs.reduce((s, f, i) => s + f.a / Math.pow(1 + r, years[i]), 0);
  const d = (r: number) => fs.reduce((s, f, i) => s - (years[i] * f.a) / Math.pow(1 + r, years[i] + 1), 0);
  let r = 0.1;
  for (let i = 0; i < 50; i++) {
    const v = npv(r), dv = d(r);
    if (!Number.isFinite(v) || !Number.isFinite(dv) || dv === 0) break;
    const next = r - v / dv;
    if (next <= -0.9999 || !Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
  }
  // Bisection when Newton does not settle.
  let lo = -0.9999, hi = 10;
  let flo = npv(lo), fhi = npv(hi);
  if (!Number.isFinite(flo) || Number.isNaN(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

export function performance(lots: Lot[], prices: Record<string, { nav: number | null; currency: string | null; name: string }>, today = new Date().toISOString().slice(0, 10)): Performance {
  const warnings: Performance["warnings"] = [];
  const byKey = new Map<string, Lot[]>();
  for (const l of lots) byKey.set(l.key, [...(byKey.get(l.key) ?? []), l]);
  const funds: FundPerf[] = [];
  const flowsByCurrency = new Map<string, { flows: Flow[]; paidIn: number; takenOut: number; value: number; complete: boolean }>();
  for (const [key, ls] of byKey) {
    const p = prices[key];
    const sorted = [...ls].sort((a, b) => a.date.localeCompare(b.date));
    let held = 0, cost = 0, realised = 0, fees = 0, paidIn = 0, takenOut = 0;
    const flows: Flow[] = [];
    for (const l of sorted) {
      const fee = l.fee ?? 0;
      fees += fee;
      if (l.side === "sell") {
        let q = l.quantity;
        if (q > held + 1e-9) { warnings.push({ text: "{name}: a sale on {date} is larger than the units held then, so it is capped.", vars: { name: p?.name ?? key, date: l.date } }); q = held; }
        const avg = held ? cost / held : 0;
        const proceeds = q * l.price - fee;
        realised += proceeds - avg * q;
        cost -= avg * q; held -= q; takenOut += proceeds;
        flows.push({ date: l.date, amount: proceeds });
      } else {
        const outlay = l.quantity * l.price + fee;
        held += l.quantity; cost += outlay; paidIn += outlay;
        flows.push({ date: l.date, amount: -outlay });
      }
    }
    if (held < 1e-9) { held = 0; cost = 0; }
    const value = p?.nav != null ? held * p.nav : held === 0 ? 0 : null;
    const final = value !== null && held > 0 ? [{ date: today, amount: value }] : [];
    const first = sorted[0]?.date ?? null;
    funds.push({
      key, name: p?.name ?? key, currency: p?.currency ?? null, held, avgCost: held ? cost / held : null, costBasis: cost, value,
      unrealised: value !== null ? value - cost : null, realised, fees, paidIn, takenOut,
      xirr: value !== null ? xirr([...flows, ...final]) : null, firstDate: first, days: first ? Math.round((new Date(today).getTime() - new Date(first).getTime()) / DAY) : null,
    });
    const ccy = p?.currency ?? "?";
    const agg = flowsByCurrency.get(ccy) ?? { flows: [], paidIn: 0, takenOut: 0, value: 0, complete: true };
    agg.flows.push(...flows);
    agg.paidIn += paidIn; agg.takenOut += takenOut;
    if (value === null) agg.complete = false; else agg.value += value;
    flowsByCurrency.set(ccy, agg);
  }
  const currencies: CurrencyPerf[] = [...flowsByCurrency.entries()].map(([currency, a]) => ({
    currency, paidIn: a.paidIn, takenOut: a.takenOut, value: a.value, gain: a.value + a.takenOut - a.paidIn, complete: a.complete,
    xirr: a.complete ? xirr([...a.flows, { date: today, amount: a.value }]) : null,
  }));
  if (currencies.length > 1) warnings.push({ text: "Your funds are in {n} currencies, so totals are given per currency rather than converted at today's rate.", vars: { n: String(currencies.length) } });
  return { funds: funds.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)), currencies, warnings };
}

/** Units held per fund after every buy and sell, for the look-through, review and simulator. */
export function netPositions(lots: Lot[]): { key: string; quantity: number }[] {
  const by = new Map<string, number>();
  for (const l of [...lots].sort((a, b) => a.date.localeCompare(b.date))) by.set(l.key, Math.max(0, (by.get(l.key) ?? 0) + (l.side === "sell" ? -l.quantity : l.quantity)));
  return [...by.entries()].filter(([, q]) => q > 1e-9).map(([key, quantity]) => ({ key, quantity }));
}

/** When the account's holding periods end: from its opening date for a plan, or from each purchase where the clock runs per purchase. */
export function milestones(account: { id: string } | null, opened: string | null, lots: Lot[], years: number | null, perPurchase = false, today = new Date().toISOString().slice(0, 10)) {
  if (!account || !years) return [];
  const add = (date: string) => { const d = new Date(date); d.setFullYear(d.getFullYear() + years); return d.toISOString().slice(0, 10); };
  if (perPurchase) return lots.filter((l) => l.side !== "sell").map((l) => ({ key: l.key, from: l.date, date: add(l.date), passed: add(l.date) <= today })).sort((a, b) => a.date.localeCompare(b.date));
  if (!opened) return [];
  return [{ key: null as string | null, from: opened, date: add(opened), passed: add(opened) <= today }];
}
