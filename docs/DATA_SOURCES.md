# Data sources and licensing

The database is the business, so this is the main risk. **Nothing below is legal advice. Get a lawyer's view on data rights before charging for the product.**

## The rules in the code

1. A value needs a source URL and a date, or it stays empty.
2. Automated extraction is marked `extracted_unreviewed`, and the UI says so. Only a person sets `reviewed`.
3. Values are not filled from memory. Example: while building this, the Vanguard FTSE All-World page showed an OCF of 0.14%, and a stale Xtrackers factsheet (October 2024) showed 0.19% where the current fee appears to be lower. That fund was left out rather than shown wrong.
4. Fund data never comes from commercial aggregators. A test enforces this for the seed file.

## What is loaded now

| Data | Source | Licence position |
|---|---|---|
| Fund facts for 37 share classes | Issuer websites and factsheets, read 4 Nov 2026 | Individual facts with attribution. Check issuer site terms before scaling, and consider an agreement |
| FX rates | [ECB reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) | [Free reuse, including commercial](https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html), if the source is quoted and values are not modified |
| Monthly prices for 3 ETFs | Alpha Vantage free tier | **Not in this repository.** [Terms](https://www.alphavantage.co/terms_of_service/) limit it to personal, non-commercial use, and allowing others to access the data counts as commercial |
| Index names and descriptions | Our own wording | Names are trademarks of their owners. Index levels and constituents are not loaded |

## The global ETF list

`scripts/universe/fetch.py` runs weekly on GitHub Actions, because the build environment cannot reach these sites, and commits `data/universe/`. `report.json` shows the result per source. Each ETF is one basic row: name, identifiers, issuer and venue count.

- **Official:** ESMA and FCA FIRDS registers (CFI group CE), Nasdaq Trader symbol file, HKEX, JPX, NSE, SSE, TWSE, TSX, SGX. GLEIF supplies issuer names and countries.
- **Unofficial:** Korea comes from Naver Finance, because the KRX endpoint refused. Replace it.
- **Missing:** Shenzhen (connection refused from GitHub), Australia, Brazil and smaller markets.
- **Known duplicates:** US funds can appear twice, as a register row with an ISIN and as an exchange row with a ticker, when the names could not be matched. Canadian rows are selected by name and may miss some funds.
- **Inferred:** asset class on basic rows comes from name keywords, and registered country is the issuer's GLEIF legal address, not a checked domicile.
- **To check before launch:** reuse terms of each exchange list.

## Bulk issuer figures

`scripts/universe/details.py` adds fees, fund size, income, returns and risk figures. It uses an honest client name, goes one request at a time, and accepts refusals.

- **State Street US:** the fund finder feed covers about 160 US funds, with gross expense ratio, fund size, NAV and returns.
- **Amundi and Lyxor:** monthly factsheet PDFs by ISIN. Cumulative 3 and 5 year returns are annualised by us. A figure is kept only if the ISIN appears in that PDF.
- **SEC prospectus data:** open government data, used for US fees where no issuer figure exists. Requests state a contact from the `SEC_CONTACT_EMAIL` secret. Filings run from 2024 to 2026, so a fee can be out of date, and each shows its filing date. Figures include acquired fund fees where reported, so funds holding other funds can show high fees.
- **iShares:** the public product list its own site loads.
- **Refused:** iShares' older screener address, London Stock Exchange's list and Yahoo's chart endpoint answered 403 or 429 from GitHub. Bypassing those refusals is out of scope.

## The free data plan

Decided 5 Nov 2026: build without paying for data. The site is meant to be commercial, so the main figures are issuer NAV and official returns at close. Yahoo is not used for the public product. Licensed live prices wait for revenue.

| Need | Free source | State |
|---|---|---|
| Fund facts, fees | Issuer pages and factsheets | Working |
| Official NAV returns, top holdings | Issuer factsheets | Working, 5 ETFs loaded so far. Better than price-derived returns |
| Latest NAV | Issuer product pages | Working for iShares, 1 ETF loaded |
| Daily market prices, charts | Yahoo Finance via `scripts/ingest-yahoo.ts` and a nightly GitHub Action | Written, **never run against Yahoo**, because this build environment cannot reach it. Yahoo's robots rules also blocked the assistant's own reader |
| Live exchange quotes | Euronext and LSE pages show no values without running their scripts; SIX did not load | Not working, not built |

Risk accepted knowingly: [yfinance's README](https://github.com/ranaroussi/yfinance) says the Yahoo API is intended for personal use only, and it can change or block without notice. Fine for building and private testing. If the site charges money, replace Yahoo first: only `src/lib/etfs/yahoo.ts` and the script need changing. Prices live in the database, not in this public repository.

## Limits to plan around

- **justETF, Morningstar and similar sites.** Useful for finding which funds exist, but copying their tables risks the EU database right, even though single facts are free. No data was taken from them.
- **Index data.** Index levels, constituents and methodology are licensed by MSCI, S&P, FTSE Russell, STOXX and others. Benchmark lines and tracking difference therefore need a licence, or issuer-published figures.
- **Exchange data.** Displaying prices commercially is usually reportable to the exchange. [EODHD](https://eodhd.com/financial-apis/commercial-vs-personal-license-use) states its listed plans are personal only, and that commercial users are onboarded and reported to exchanges.
- **Real-time prices.** Never claimed. Prices are labelled delayed.
- **Holdings.** Issuers publish them daily, usually under site terms. Holdings overlap needs complete files, so confirm the right to store them.

## Providers to evaluate

Ask each one about commercial display rights, UCITS coverage, NAV versus market price, and share class level data.

| Provider | Likely use | Known so far |
|---|---|---|
| EODHD | Prices and fundamentals | [Personal plans $19.99 to $99.99 a month](https://apis.io/plans/eodhd/eodhd-plans-pricing/). Commercial price on request |
| Alpha Vantage | Prices | [Paid from $49.99 a month](https://www.alphavantage.co/premium/). Commercial terms on request. The free connector returned good LSE data, but highs and lows contain bad ticks, so only closes are stored |
| Issuer files | Facts, holdings, NAV | Most authoritative, and costs engineering time per issuer. iShares and Vanguard pages read cleanly. Amundi, Xtrackers, SPDR and UBS product pages did not, so use their factsheets or files |
| Morningstar, Trackinsight, FE fundinfo | Licensed ETF datasets | Not priced yet. Likely the fast route to broad coverage, and likely expensive |

## Tax data (Phase 5)

Official sources to start from, to be confirmed when that work begins:

- Switzerland: Federal Tax Administration (ESTV) and its ICTax price list, plus cantonal authorities
- France: the tax administration and its BOFiP doctrine
- Germany: the Investment Tax Act (InvStG) and the Federal Central Tax Office
- United Kingdom: HMRC, including its list of reporting funds

Rules change, and need a dated source and a review by a qualified person. Until then the product shows structural facts only and no rates.
