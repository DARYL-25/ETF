# How the data stays current

The goal is every ETF in the world, with figures that show their source and date. This page sets how often each kind of data is refreshed, by which job, and from which source. The same policy is in code, in `src/lib/data/policy.ts`, and the site shows it on its Data page with the date of each job's last run.

## The schedule

| Data | How often | When | Job |
|---|---|---|---|
| Which ETFs exist: names, ISINs, tickers, exchanges | Weekly | Mondays, 04:17 UTC | `universe.yml` |
| Fees and fund facts: TER or OCF, domicile, replication, income treatment, benchmark | Quarterly at least | Issuer files on the 8th of each month. SEC data on the 15th of February, May, August and November. Owner files each quarter | `details.yml`, `sec.yml`, and a person |
| Fund size and official returns | Monthly | The 8th, once the previous month's factsheets are out. Daily for iShares and State Street | `details.yml`, `daily.yml` |
| Prices: one value per ETF per day | Daily | Tuesday to Saturday, 05:23 UTC, for the previous trading day | `daily.yml` |
| What each fund holds: every holding with its weight | Weekly for issuer files; daily for US SEC filings | Sundays, 06:37 UTC; SEC filings every day, 07:43 UTC | `holdings.yml`, `nport-live.yml` |
| Exchange rates | Daily | With the price job | `daily.yml` |
| Tax rules | Twice a year, and when a law changes | January and July | A person |

Fees and fund facts change rarely, so a quarterly refresh is enough. Where a fee arrives in the same file as the fund's size, it is refreshed monthly at no extra cost.

**The schedules only run from the repository's default branch.** GitHub ignores schedules on other branches.

## Sources

### Which ETFs exist

| Source | Covers | State |
|---|---|---|
| ESMA FIRDS register | Funds traded on EU venues | Automatic |
| FCA FIRDS register | Funds traded on UK venues | Automatic |
| Nasdaq Trader symbol directory | All US-listed ETFs | Automatic |
| JPX, HKEX, NSE, SSE, TWSE, TSX, SGX | Japan, Hong Kong, India, Shanghai, Taiwan, Canada, Singapore | Automatic. NSE times out on some runs, and the last good list is kept |
| ASX monthly investment products report | Australia: 481 products, with fee and size | Automatic |
| Naver Finance | Korea | Unofficial. Replace with the exchange's own list |
| GLEIF | Issuer legal names and countries | Automatic, open data |
| OpenFIGI | Tickers for ISINs that have none, which also joins US register rows to their exchange rows | Automatic, 25 requests a minute without a key. An `OPENFIGI_API_KEY` secret makes it ten times faster |
| Shenzhen Stock Exchange | Shenzhen | Refuses connections from GitHub's servers |
| Issuer product files | Funds missing from the registers | Read by a person, each quarter |

Not covered yet: Shenzhen, Brazil, South Africa, Israel's domestic tracker funds beyond those in EU registers, and smaller markets. SIX Swiss Exchange listings come only from Invesco and UBS files until the SIX explorer's CSV is added.

### Fees, facts, size and returns

| Source | Covers | State |
|---|---|---|
| iShares product list | About 920 UCITS ETFs: fee, size, NAV, returns | Automatic, daily |
| State Street product data | About 340 ETFs in the US and Europe | Automatic, daily |
| Amundi monthly factsheets | About 500 Amundi and Lyxor ETFs | Automatic, monthly |
| SEC prospectus data sets | Fees of about 4,500 US ETFs | Automatic, quarterly. Used only where no issuer figure exists |
| Xtrackers, Invesco, Vanguard, UBS product files | About 1,750 ETFs in Europe and the US | Read by a person. See the quarterly routine below |

### Prices

Prices are end-of-day values. Two kinds are stored, and each point says which it is:

- **NAV**: the net asset value the issuer publishes for the day. This is the fund's own valuation and the basis of its official returns. Collected daily for iShares and State Street, about 1,260 ETFs, and on the day of each file for the other issuers.
- **Close**: an exchange closing price, only where the exchange publishes it as open data. Today that is the Taiwan Stock Exchange.

History is not back-filled or estimated. It starts on the day collection began, 4 November 2026, and a fund's chart appears once it has five points.

**Live prices are the goal, and they cannot be free.** Exchanges license their prices, and showing them to the public, even delayed, is a reportable commercial use. The route is a licensed feed:

1. Choose a vendor that grants display rights for the exchanges that matter: SIX, Xetra, Euronext, LSE, NYSE Arca and Nasdaq. Ask each for commercial display terms, UCITS coverage and price per exchange.
2. The feed writes end-of-day closes into the same `universe_prices` table, with `kind = 'close'`, so charts and pages need no change.
3. Intraday quotes then need one more table and a short-interval job. This is not built, because its shape depends on the vendor.

Until then the site says plainly that prices are end of day.

### Holdings

| Source | Covers | State |
|---|---|---|
| State Street holdings files | About 310 ETFs in the US and Europe | Automatic, weekly |
| ARK Invest holdings files | ARK's US ETFs | Automatic, weekly |
| Global X holdings files | About 115 Global X ETFs in the US, many of them thematic | Automatic, weekly |
| KraneShares holdings files | KraneShares ETFs, mostly Chinese shares | Automatic, weekly |
| Direxion holdings files | Direxion funds that hold their securities directly. Leveraged funds built on swaps are left out | Automatic, weekly |
| SEC Form N-PORT filings | About 3,900 US ETFs whose issuer publishes no file | Automatic, daily. Each quarter's report is public about 60 days after it ends; `nport-live.yml` reads EDGAR's daily index and adds each fund's filing the day it appears. `nport.yml` loads the SEC's quarterly bulk data sets as a backstop and never replaces a newer filing. Each fund shows its report date and links to its filing |
| iShares, Xtrackers, Amundi, Vanguard, Invesco | Not collected | Their files are served only after a visitor accepts site terms. Needs permission or a licensed source |

Holdings under 0.02% of a fund are dropped and at most 800 are kept per fund. Issuers identify securities differently, so they are matched across issuers by cleaned name. If a fund's file fails on one run, its last good holdings are kept.

### Exchange rates

European Central Bank euro reference rates, about 30 currencies, free to reuse with attribution.

## The quarterly routine for a person

Some issuers show terms before a download, or refuse automated reading. A person does these four times a year, in January, April, July and October:

1. Download the product lists from Xtrackers (etf.dws.com, the UK, Swiss and French sites, and the US site), Invesco (the UCITS list and the US list), Vanguard (the European professional product list and the US ETF list), UBS (the Swiss ETF overview) and SIX (the ETF explorer's CSV).
2. Put them in one folder outside the repository.
3. Run `python3 scripts/universe/import_issuer_files.py <folder> <today's date>`, then `python3 scripts/universe/merge.py`.
4. Run `npm test`. The tests check known funds against known figures.
5. Commit `data/universe`. The raw files are never committed.

## From the files to the live site

Each job commits its results to `data/`, with a small report that the Data page reads. When the `SYNC_DATABASE_URL` secret is set, the daily job then runs `scripts/sync-db.ts`, which applies new migrations and replaces the public tables in the live database inside one transaction. Readers see the old data or the new data, never a mix, and user tables are not touched. If fewer than 10,000 ETFs would be loaded, it keeps the old data.

## Rules the jobs follow

- An honest client name on every request, one request at a time.
- A refusal is recorded and accepted. No retries with a disguised client.
- A source that fails keeps its last good file, and the report names the failure.
- A value needs a source and a date, or it stays empty.

## Secrets

| Secret | Used by | Needed for |
|---|---|---|
| `SEC_CONTACT_EMAIL` | `sec.yml` | The SEC asks clients to state a contact |
| `OPENFIGI_API_KEY` | `universe.yml` | Optional, faster ticker lookup |
| `SYNC_DATABASE_URL` | `daily.yml` | Loading the live database |
