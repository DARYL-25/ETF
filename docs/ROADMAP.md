# Roadmap, MVP scope and costs

## Phase 1, core MVP (this delivery)

| Item | State |
|---|---|
| Website, responsive design | Done, tested on desktop and phone |
| Database architecture | Done, including fund / share class / listing separation and RLS |
| User authentication | Code complete, **not yet tested against a live Supabase project** |
| Initial real UCITS database | 37 share classes in 35 funds, mostly iShares and Vanguard, not yet reviewed by a person |
| ETF search, core screener | Done |
| ETF profiles | Done. Sections without data state why they are empty |
| Basic historical charts | Done, shown only where licensed prices are loaded. None in the public repository |

Added early because they were cheap and valuable: index pages, comparison, changeable columns, public API.

## Next steps, in order

1. **Run the free data pipeline.** Create a free Supabase project, add `INGEST_DATABASE_URL` as a GitHub secret and run the Ingest prices action. Extend factsheet returns to all ETFs. A commercial feed is only needed once the site charges money.
2. **Have a person review the 37 records** against the source links, then mark them `reviewed`.
3. **Create the Supabase project** and test sign-in end to end.
4. **Grow coverage**: Xtrackers, SPDR, Amundi, UBS, HSBC, and complete the two partial Invesco records.

## Later phases

- **Phase 2**: performance charts, watchlists, saved screeners and comparisons, personal dashboard, preferences, basic email alerts, data export and account deletion
- **Phase 3**: advanced filters, risk metrics, holdings and overlap, tracking difference, virtual portfolios
- **Phase 4**: ETF Academy with reviewed articles, glossary, quizzes, calculators, progress
- **Phase 5**: tax residence profile, Switzerland and France knowledge bases, tax comparison, educational simulator. No calculation ships before its rules are verified
- **Phase 6**: AI assistant over structured retrieval, Stripe subscriptions, premium access
- **Phase 7**: worldwide coverage, more tax jurisdictions, native apps, B2B API

## Running costs

Prices read 4 Nov 2026. Converted at about €0.89 to the dollar.

| Item | Development | Commercial launch |
|---|---|---|
| Hosting | Vercel Hobby, $0, but [personal and non-commercial only](https://vercel.com/pricing) | Vercel Pro, $20 a month |
| Database and auth | [Supabase Free, $0](https://supabase.com/pricing), paused after a week idle | Supabase Pro, from $25 a month |
| Market data | Free tier, private use only | **Unknown until quoted. This is the biggest cost** |
| Email alerts | Free tier of an email service | Low at this scale, not yet priced |
| AI (Phase 6) | None | Depends on usage, needs per-plan limits |
| Stripe | None | Per-transaction fees |

**Fixed infrastructure is about €40 a month.** The first revenue goal of €200 to €300 a month covers that comfortably, but it may not cover a licensed commercial data feed. Get the data quote before committing to the €9.90 price or the 26-subscriber goal.
