# ETF Intelligence

A research platform for Exchange-Traded Funds: discover, compare and understand ETFs, with a source and a date behind every figure. It starts with European UCITS funds and is designed for global coverage.

See [the roadmap](docs/ROADMAP.md) for what exists and what is left.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No accounts or keys are needed. Without `DATABASE_URL`, the app starts an embedded Postgres in memory (PGlite), built from the same migrations and data used in production. Sign-in and payments stay off until they are configured. The embedded database needs about 700 MB of memory.

## Try it without installing anything

On GitHub, choose **Code**, then **Codespaces**, then **Create codespace**. Wait a few minutes for the build. The app then opens in a browser tab.

## What it does

- **Ask**: describe the ETF you need in plain English or French, and get ranked matches with the reasons and what could not be checked. Works without AI, and adds written explanations when `ANTHROPIC_API_KEY` is set
- **Your country**: choose where you live once, and rankings, quick filters and every ETF page adapt
- **Screener**: combined filters, quick filters, sorting, changeable columns, shareable links and CSV export
- **ETF pages** for every fund: key figures with dates, price history, performance, facts, holdings where held, and where each figure came from
- **Compare** 2 to 5 ETFs with their holdings overlap, and **index pages** listing every fund on an index with the return gap between them
- **Themes**: every ETF on a theme, such as AI, semiconductors, defence, Chinese technology, halal or actively managed funds, side by side
- **Which ETFs hold it**: search a company and see every fund that holds it, with the weight
- **French and English**, switched from the top bar, lessons included
- **Tax notes** for Switzerland and France, each rule quoted from an official source, including PEA and assurance-vie
- **Learn**: lessons with quizzes, a glossary and calculators
- **Watchlists and a practice portfolio** with look-through, overlap warnings and yearly cost. Kept in the browser, and in the account when signed in
- **Data and updates**: the refresh schedule with each job's last run
- Sign-in through Supabase and subscriptions through Stripe, both off until configured
- Public JSON API under `/api/v1`

## Connect Supabase

1. Create a project.
2. Run `SYNC_DATABASE_URL=<connection string> npx tsx scripts/sync-db.ts`. It applies the migrations and loads the data. Add the same value as a GitHub secret, and the daily job keeps the database current.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In Supabase Auth, add `<your site>/auth/callback` to the redirect URLs and enable Google if you want it.

Use a read-only database role for `DATABASE_URL`. Never run `supabase/local/stub-auth.sql` against a real project.

## Switch on payments

Create a Premium product in Stripe with a monthly and a yearly price. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` and `SUPABASE_SERVICE_ROLE_KEY`, then add a webhook to `<your site>/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`, and set its signing secret as `STRIPE_WEBHOOK_SECRET`. Until all of these are set, every feature is open and no payment is taken.

## Test

```bash
npm test                              # data rules, SQL, Row Level Security (real Postgres via PGlite)
npm run build && npm run test:e2e     # browser tests on desktop and phone
```

## Docs

- [Architecture and decisions](docs/ARCHITECTURE.md)
- [How the data stays current: schedule and sources](docs/DATA_UPDATES.md)
- [Data sources, licensing and data rules](docs/DATA_SOURCES.md)
- [Roadmap, MVP scope and running costs](docs/ROADMAP.md)

Nothing here is investment or tax advice.
