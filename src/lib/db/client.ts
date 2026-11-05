import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildSeedSql } from "./seed-sql";

/**
 * All public ETF reads go through query(). With DATABASE_URL it uses Postgres (Supabase in
 * production). Without it, an embedded Postgres is created in memory from the same migrations
 * and seed, so there is one set of SQL whichever backend runs.
 */
type Runner = <T>(sql: string, params: unknown[]) => Promise<T[]>;

const root = process.cwd();

export function localSchemaSql(projectRoot: string = root): string[] {
  const dir = join(projectRoot, "supabase/migrations");
  return [
    readFileSync(join(projectRoot, "supabase/local/stub-auth.sql"), "utf8"),
    ...readdirSync(dir).filter((n) => n.endsWith(".sql")).sort().map((n) => readFileSync(join(dir, n), "utf8")),
  ];
}

async function createRunner(): Promise<Runner> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    return async <T,>(sql: string, params: unknown[]) => (await pool.query(sql, params as never[])).rows as T[];
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  for (const sql of localSchemaSql()) await db.exec(sql);
  await db.exec(buildSeedSql(root));
  return async <T,>(sql: string, params: unknown[]) => (await db.query<T>(sql, params as never[])).rows;
}

const holder = globalThis as unknown as { __etfDb?: Promise<Runner> };

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  holder.__etfDb ??= createRunner();
  const run = await holder.__etfDb;
  return run<T>(sql, params);
}

export const usingEmbeddedDatabase = () => !process.env.DATABASE_URL;
