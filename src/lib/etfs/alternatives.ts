import { query } from "@/lib/db/client";
import type { EtfRow } from "./queries";
import type { Alternative } from "@/lib/portfolio/doctor";

/**
 * Funds on the same index that charge less, and, for a fund domiciled outside the US, never a US-domiciled one, which European retail investors generally cannot buy, with the same way of handling income and the same currency
 * hedging, largest first among the cheapest. Same index is the only test of "comparable" we can apply
 * from data: theme and region matches differ too much in what they hold.
 */
export async function cheaperOnSameIndex(rows: Pick<EtfRow, "etf_key" | "isin" | "index_slug" | "headline_fee_pct" | "distribution_policy" | "hedged" | "fund_key" | "ucits">[], perFund = 3): Promise<Record<string, Alternative[]>> {
  const out: Record<string, Alternative[]> = {};
  await Promise.all(rows.map(async (r) => {
    const key = r.etf_key ?? r.isin;
    if (!key || !r.index_slug || r.headline_fee_pct === null) return;
    const alts = await query<{ etf_key: string; name: string; headline_fee_pct: number; size_eur: number | null; fund_key: string | null }>(
      `select etf_key, name, headline_fee_pct, size_eur, fund_key from public.etf_directory
       where index_slug = $1 and etf_key <> $2 and headline_fee_pct is not null and headline_fee_pct < $3
         and coalesce(hedged, false) = $4 and ($5::text is null or distribution_policy is null or distribution_policy = $5)
         and not ('leveraged-inverse' = any(category_slugs)) and ($6::boolean is not true or (ucits is not false and coalesce(isin, '') not like 'US%'))
       order by headline_fee_pct asc, size_eur desc nulls last limit ${Math.floor(perFund)}`,
      [r.index_slug, key, r.headline_fee_pct, r.hedged === true, r.distribution_policy ?? null, r.ucits === true || Boolean(r.isin && !r.isin.startsWith("US"))],
    );
    out[key] = alts.map((a) => ({ key: a.etf_key, name: a.name, fee_pct: a.headline_fee_pct, size_eur: a.size_eur, same_fund: Boolean(r.fund_key && a.fund_key === r.fund_key) }));
  }));
  return out;
}
