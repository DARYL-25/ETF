# Roadmap, MVP scope and costs

## What is built

| Area | State |
|---|---|
| Website, design, phone layout | Done. Tested on desktop and phone |
| Global ETF list | Done for the EU, UK, US, Japan, Hong Kong, India, Shanghai, Taiwan, Canada, Singapore, Korea and Australia. About 18,500 records |
| Fees, size, returns | About a third of the list has a fee. Filled issuer by issuer |
| Daily prices | Issuer NAV for about 2,250 ETFs, of which 1,260 refresh every day. History builds from 4 November 2026 |
| Update schedule | Done: weekly list, daily prices, monthly details, quarterly SEC fees. See [DATA_UPDATES.md](DATA_UPDATES.md) |
| Search, ask bar, screener, comparison, index pages, CSV export | Done |
| Investor country | Done: rankings, quick filters and ETF pages adapt |
| Tax notes | Switzerland and France, from official sources. **Not reviewed by a tax adviser** |
| Learn | Lessons, quizzes, glossary, calculators. Not reviewed by a second person |
| Watchlists, practice portfolio | Done, stored in the browser |
| AI assistant | Done. Ranked answers work without a key. Written explanations need `ANTHROPIC_API_KEY` |
| Accounts | Code complete, **never tested against a live Supabase project** |
| Subscriptions | Stripe checkout, portal and webhook written and unit-tested, **never run against Stripe** |

## What only the owner can do

1. **Merge and host.** Create the Supabase project, load it with `scripts/sync-db.ts`, and deploy the site. The embedded database needs about 700 MB of memory, so a small free host needs the real database.
2. **Have a lawyer check data rights** before charging: the terms of the issuer files, the exchange lists, and the use of issuer logos.
3. **Have a tax adviser review the Switzerland and France notes.**
4. **Check whether ranking funds for a country counts as regulated advice** where you operate.
5. **Create the Stripe products** and set the keys, when ready to charge.
6. **Download the issuer files each quarter**, including the SIX explorer's CSV.
7. **Choose a licensed price feed** when revenue allows. Live prices cannot be free.

## What is left to build

- Watchlists and portfolios saved to the account, not only the browser
- Holdings, overlap between funds, and tracking difference, which need licensed or issuer holdings files
- Fees for Canada and Asia, and the markets still missing
- More tax countries, and assurance-vie for France
- Email alerts, native apps, a paid API

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
