// Runs one read against the local database: npx tsx scripts/dev/q.ts "select 1"
import { query } from "../../src/lib/db/client";
query(process.argv[2]).then((rows) => { console.log(JSON.stringify(rows, null, 1)); process.exit(0); });
