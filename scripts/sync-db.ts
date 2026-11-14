// Loads the public ETF data into a real Postgres database (Supabase in production).
//   SYNC_DATABASE_URL=postgres://... npx tsx scripts/sync-db.ts
// It applies any migration not yet applied, then replaces the public data tables in one transaction,
// so readers see either the old data or the new data, never a mix. User tables are never touched.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { PUBLIC_DATA_TABLES, buildSeedSql } from "../src/lib/db/seed-sql";

const url = process.env.SYNC_DATABASE_URL;
if (!url) throw new Error("Set SYNC_DATABASE_URL to the database connection string.");
const root = process.cwd();
const db = new Client({ connectionString: url });
await db.connect();

await db.query("create table if not exists public.applied_migrations (name text primary key, applied_at timestamptz not null default now())");
await db.query("alter table public.applied_migrations enable row level security");
const done = new Set((await db.query<{ name: string }>("select name from public.applied_migrations")).rows.map((r) => r.name));
const dir = join(root, "supabase/migrations");
for (const name of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
  if (done.has(name)) continue;
  await db.query("begin");
  try {
    await db.query(readFileSync(join(dir, name), "utf8"));
    await db.query("insert into public.applied_migrations (name) values ($1)", [name]);
    await db.query("commit");
    console.log("Applied", name);
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

const seed = buildSeedSql(root).replace(/^begin;$/m, "").replace(/^commit;\s*$/m, "");
await db.query("begin");
try {
  await db.query(`truncate ${PUBLIC_DATA_TABLES.map((t) => `public.${t}`).join(", ")} restart identity cascade`);
  await db.query(seed);
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.etf_directory");
  if (rows[0].n < 10000) throw new Error(`Only ${rows[0].n} ETFs after loading, so the old data is kept.`);
  await db.query("insert into public.data_update_logs (job, rows_added, detail) values ('sync-db', $1, 'Full reload of public data')", [rows[0].n]);
  await db.query("commit");
  console.log(`Loaded ${rows[0].n} ETFs`);
} catch (e) {
  await db.query("rollback");
  throw e;
} finally {
  await db.end();
}
