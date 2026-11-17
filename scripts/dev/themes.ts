// Counts funds per theme and prints samples, to check the matching rules: npx tsx scripts/dev/themes.ts [slug]
import { query } from "../../src/lib/db/client";
const slugs = process.argv.slice(2);
(async () => {
  for (const slug of slugs) {
    const rows = await query<{ name: string; ticker: string }>("select name, ticker from public.etf_directory where $1 = any(category_slugs) order by md5(etf_key) limit 32", [slug]);
    console.log(`=== ${slug}`);
    console.log(rows.map((r) => `${r.ticker ?? ""} ${r.name.slice(0, 58)}`).join(" | "));
  }
  if (!slugs.length) {
    const rows = await query<{ slug: string; n: number; fee: number; size: number }>("select s as slug, count(*)::int as n, count(headline_fee_pct)::int as fee, count(size_eur)::int as size from public.etf_directory d, unnest(d.category_slugs) s group by 1 order by 2 desc");
    for (const r of rows) console.log(`${r.slug}\t${r.n}\tfee ${r.fee}\tsize ${r.size}`);
  }
  process.exit(0);
})();
