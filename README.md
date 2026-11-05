# ETF Intelligence

A research platform for Exchange-Traded Funds: discover, compare and understand ETFs, with a source and a date behind every figure. It starts with European UCITS funds and is designed for global coverage.

**Status: Phase 1 MVP.** See [the roadmap](docs/ROADMAP.md) for what exists and what comes next.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No accounts or keys are needed. Without `DATABASE_URL`, the app starts an embedded Postgres in memory (PGlite), built from the same migrations and data used in production. Sign-in stays off until Supabase is configured.

## Try it without installing anything

On GitHub, open the `phase-1-mvp` branch, choose **Code**, then **Codespaces**, then **Create codespace**. Wait a few minutes for the build. The app then opens in a browser tab.

## What works today

- Dashboard with the fee ruler, largest funds and lowest fees by group
- Search by name, ISIN, any ticker or index
- Server-side screener: combined filters, sorting, pagination, changeable columns and shareable URLs
- ETF profiles with fees, holdings summary, allocation, listings and sources
- Price charts, when licensed price files are loaded
- Index database with every ETF following each index
- Side-by-side comparison of 2 to 5 ETFs
- Email and Google sign-in through Supabase (needs configuration, see below)
- Public JSON API under `/api/v1`, shared with future mobile apps

Portfolio tracker, watchlists, academy, tax and AI pages state that they are not built yet.

## Connect Supabase

1. Create a project, then run `supabase/migrations/*.sql` in order.
2. Run `npm run db:seed-sql` and execute the generated `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In Supabase Auth, add `<your site>/auth/callback` to the redirect URLs and enable Google if you want it.

Use a read-only database role for `DATABASE_URL`. Never run `supabase/local/stub-auth.sql` against a real project.

## Test

```bash
npm test                              # data rules, SQL, Row Level Security (real Postgres via PGlite)
npm run build && npm run test:e2e     # browser tests on desktop and phone
```

## Docs

- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Data sources, licensing and data rules](docs/DATA_SOURCES.md)
- [Roadmap, MVP scope and running costs](docs/ROADMAP.md)

Nothing here is investment or tax advice.
