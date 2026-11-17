import type { Account } from "./drag";

/**
 * Physical or synthetic: which replication suits an index, a country and an account. General guidance from
 * stated rules, shown with its reason, never a choice made for the reader.
 */
export type Advice = { verdict: "synthetic" | "physical" | "either"; points: { text: string; vars: Record<string, string> }[]; source?: { label: string; url: string } };

const INVESCO = { label: "Invesco, does synthetic replication offer an advantage?", url: "https://www.invesco.com/emea/en/insights/synthetic-replication-may-offer-a-structural-advantage.html" };

export function replicationAdvice(opts: { usSharePct: number | null; european: boolean | null; account: Account | null; yieldPct: number }): Advice {
  const points: Advice["points"] = [];
  if (opts.account?.id === "FR-PEA" && opts.european === false) {
    points.push({ text: "In a PEA, an index outside Europe is only available through synthetic funds: they hold European shares and receive the index's return through a swap.", vars: {} });
    return { verdict: "synthetic", points };
  }
  const us = opts.usSharePct ?? 0;
  if (us >= 50) {
    points.push({ text: "For US shares, a swap-based fund receives the index's dividends without US withholding tax, while an Irish physical fund loses 15% of them and one domiciled elsewhere in Europe 30%.", vars: {} });
    points.push({ text: "With a {yield}% dividend yield and {us}% in US companies, that is about {gain} points a year in favour of synthetic, before fees.", vars: { yield: opts.yieldPct.toFixed(1), us: us.toFixed(0), gain: ((opts.yieldPct * us * 0.15) / 100).toFixed(2) } });
    points.push({ text: "The cost is counterparty risk: UCITS rules cap it and require collateral, so prefer large swap-based funds from established issuers.", vars: {} });
    return { verdict: "synthetic", points, source: INVESCO };
  }
  points.push({ text: "Outside US shares, swaps bring no structural tax advantage: physical replication is usually the simpler choice.", vars: {} });
  points.push({ text: "Compare what matters more here: fee, tracking against the index, and fund size.", vars: {} });
  return { verdict: us > 0 ? "either" : "physical", points, source: us > 0 ? INVESCO : undefined };
}

const EUROPEAN = /^(stoxx|euro-stoxx|msci-europe|msci-emu|ftse-developed-europe|ftse-100|ftse-250|dax|mdax|cac|smi|aex|ibex|ftse-mib|bel-20|omx|atx)/;

/** Whether an index covers European shares only, from its slug or the fund's region categories. Null when unknown. */
export function isEuropeanIndex(row: { index_slug: string | null; category_slugs: string[] }): boolean | null {
  if (row.index_slug) return EUROPEAN.test(row.index_slug);
  if (row.category_slugs.some((c) => /europe|eurozone/.test(c))) return true;
  if (row.category_slugs.some((c) => /world|global|us|usa|emerging|asia|japan|china/.test(c))) return false;
  return null;
}
