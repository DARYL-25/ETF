// Writes supabase/seed.sql from data/seed, for loading into a real Supabase project.
import { writeFileSync } from "node:fs";
import { buildSeedSql } from "../src/lib/db/seed-sql";

writeFileSync("supabase/seed.sql", buildSeedSql(process.cwd()));
console.log("Wrote supabase/seed.sql");
