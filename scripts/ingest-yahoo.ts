// Loads up to 10 years of daily closes from Yahoo Finance for each ETF's display listing.
//   INGEST_DATABASE_URL=... npx tsx scripts/ingest-yahoo.ts
// Free, but unofficial and for personal use under Yahoo's terms. See docs/DATA_SOURCES.md.
import { Pool } from "pg";
import { parseYahooChart, yahooSymbol } from "../src/lib/etfs/yahoo";

const url = process.env.INGEST_DATABASE_URL;
if (!url) throw new Error("Set INGEST_DATABASE_URL.");
const pool = new Pool({ connectionString: url });
const { rows: listings } = await pool.query<{ id: number; mic: string; ticker: string; currency: string | null }>(
  "select id, exchange_mic as mic, ticker, trading_currency as currency from public.listings where is_display_ticker",
);
const { rows: [source] } = await pool.query<{ id: number }>(
  `insert into public.data_sources (kind, publisher, url, retrieved_on, licence_note)
   values ('market_data_vendor', 'Yahoo Finance', 'https://finance.yahoo.com', current_date, 'Unofficial source, personal use terms. Delayed.')
   on conflict (url) do update set retrieved_on = current_date returning id`,
);

let added = 0;
let failed = 0;
for (const listing of listings) {
  const symbol = yahooSymbol(listing.mic, listing.ticker);
  if (!symbol) continue;
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const series = parseYahooChart(await res.json(), listing.currency);
    await pool.query("update public.listings set market_data_symbol = $1 where id = $2", [symbol, listing.id]);
    for (const p of series.points) {
      const r = await pool.query(
        `insert into public.fund_prices (listing_id, price_date, frequency, price_type, close, source_id)
         values ($1, $2, 'daily', 'market_close', $3, $4) on conflict do nothing`,
        [listing.id, p.date, p.close, source.id],
      );
      added += r.rowCount ?? 0;
    }
    console.log(`${symbol}: ${series.points.length} points`);
  } catch (error) {
    failed += 1;
    console.error(`${symbol}: skipped. ${(error as Error).message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
await pool.query("insert into public.data_update_logs (job, rows_added, detail) values ('ingest-yahoo', $1, $2)", [added, `${failed} skipped`]);
await pool.end();
console.log(`Added ${added} rows, skipped ${failed} listings`);
