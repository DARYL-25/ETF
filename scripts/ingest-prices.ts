// Loads monthly closes from Alpha Vantage for every listing with a market_data_symbol.
//   ALPHA_VANTAGE_API_KEY=... INGEST_DATABASE_URL=... npm run ingest:prices
// The free tier allows 25 requests a day and personal, non-commercial use only. Move to a
// licensed provider before public launch (see docs/DATA_SOURCES.md).
import { Pool } from "pg";
import { parseMonthlyCsv } from "../src/lib/etfs/alpha-vantage";

const key = process.env.ALPHA_VANTAGE_API_KEY;
const url = process.env.INGEST_DATABASE_URL;
if (!key || !url) throw new Error("Set ALPHA_VANTAGE_API_KEY and INGEST_DATABASE_URL.");

const pool = new Pool({ connectionString: url });
const sourceUrl = "https://www.alphavantage.co/documentation/#monthlyadj";
const { rows: listings } = await pool.query<{ id: number; symbol: string }>(
  "select id, market_data_symbol as symbol from public.listings where market_data_symbol is not null",
);
const { rows: [source] } = await pool.query<{ id: number }>(
  `insert into public.data_sources (kind, publisher, url, retrieved_on, licence_note)
   values ('market_data_vendor', 'Alpha Vantage', $1, current_date, 'Free tier: personal, non-commercial use. Replace before public launch.')
   on conflict (url) do update set retrieved_on = current_date returning id`,
  [sourceUrl],
);

let added = 0;
for (const listing of listings) {
  const res = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${encodeURIComponent(listing.symbol)}&datatype=csv&apikey=${key}`);
  const points = parseMonthlyCsv(await res.text());
  for (const p of points) {
    const r = await pool.query(
      `insert into public.fund_prices (listing_id, price_date, frequency, price_type, close, source_id)
       values ($1, $2, 'monthly', 'market_close', $3, $4) on conflict do nothing`,
      [listing.id, p.date, p.close, source.id],
    );
    added += r.rowCount ?? 0;
  }
  console.log(`${listing.symbol}: ${points.length} points`);
  await new Promise((resolve) => setTimeout(resolve, 1500)); // Provider limit: one request a second.
}
await pool.query("insert into public.data_update_logs (job, rows_added) values ('ingest-prices', $1)", [added]);
await pool.end();
console.log(`Added ${added} rows`);
