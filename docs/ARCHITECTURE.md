# Architecture

## Overview

```
Browser / future mobile apps
        |
Next.js (App Router, TypeScript, Tailwind)
   |-- server components and /api/v1 --> src/lib/etfs/queries.ts --> Postgres (public ETF data)
   |-- Supabase client as signed-in user ----------------------> Postgres (private data, RLS)
Ingestion scripts (scripts/) --> Postgres, with a source on every row
```

## Decisions and trade-offs

**One SQL path, with an embedded database for local use.** Public reads go through `query()` in `src/lib/db/client.ts`: `pg` when `DATABASE_URL` is set, PGlite (Postgres compiled to WebAssembly) otherwise. Tests and local development therefore run the real migrations and real SQL, with no Docker or account. The trade-off is roughly a second of start-up in embedded mode. Production should always set `DATABASE_URL`; embedded mode on a serverless host has not been tested.

**Direct SQL for public data, Supabase client for private data.** The screener needs flexible SQL, which is simpler to write directly than through PostgREST. Private data uses the Supabase client with the user's session, so Row Level Security is what protects it, not application code.

**Fund, share class and listing are separate tables.** One row in the UI is a share class. Tickers belong to listings, so searching `SXR8` or `CSPX` finds the same ETF once.

**Dated observations, not overwritten values.** Fees and metrics are rows with `as_of`, `observed_on`, a source and a verification status. The `etf_overview` view picks the newest. This keeps history for "recently changed fees" later. The view can become a materialised view when coverage grows.

**TER and OCF stay separate.** They are distinct `fee_type` values. `headline_fee_pct` picks one to sort on, and `headline_fee_type` always travels with it, so the UI labels every fee.

**Missing means null.** A missing fee shows a dash, sorts last and drops out of fee filters. It is never zero. `ucits` is nullable for the same reason.

**The screener lives in the URL.** Plain GET parameters give shareable links and let the form work without JavaScript. Sort columns come from a fixed map and values are bound parameters, which rules out SQL injection.

**Category filters.** Ticks within a group match any; groups combine with AND, so United States + Technology narrows the list.

**Monthly closes only for now.** The chart component takes any series. Candlesticks, volume, NAV and benchmark lines need licensed daily data, so they wait for a provider.

**shadcn/ui not used yet.** Its CLI fetches from a registry this build environment cannot reach, and the MVP needs few primitives, so `globals.css` holds them. Adopting it later for dialogs and menus is straightforward.

**Next.js 16 `proxy.ts`.** This is the renamed middleware convention, used to refresh Supabase sessions.

## Security

- Every public table has RLS with read-only access. Writes need the service role.
- Every private table is owner-only, and rows are deleted with the account. `tests/data.test.ts` checks this against real Postgres.
- Keys come from environment variables. Only `NEXT_PUBLIC_*` values reach the browser.
- Input is validated with zod. Security headers are set in `next.config.ts`.

Still required before accounts go public: data export, an account deletion screen, and a privacy policy.

## Design

Pine and saffron on cool ledger paper, set in Bricolage Grotesque and Public Sans with tabular figures. The signature element is the fee ruler, a dot plot of every ETF on one fee scale, where filled and hollow dots keep TER and OCF apart. Saffron has one meaning: "this fund".

## AI assistant

`src/lib/assistant`: `intent.ts` reads a request with fixed rules, `rank.ts` filters and scores in code, `agent.ts` adds an optional Claude tool loop. The model can only reach the database through tools, and the system prompt forbids stating figures or tax rules from memory. With no `ANTHROPIC_API_KEY`, or if the AI call fails, the ranked list still works. Scores weight fee, size, UCITS status and data available, and they are shown to the user. They do not include tax, because no country rules are verified yet.
