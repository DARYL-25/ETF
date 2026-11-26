# Exchange closing prices: what each exchange offers

Checked 24 November 2026. The goal is one closing price per ETF per day, collected each evening, so it is on the site before the next market open. Live or pre-open quotes are real-time data and are always licensed, so they are out of scope until there is revenue.

**The short version:** no major exchange offers a free API that a commercial website may republish, with one exception, SIX. Everything else is a paid licence, or "free" data whose terms forbid commercial use. Not legal advice: confirm each licence in writing before showing prices publicly.

| Exchange | What exists | Cost for a public website | Verdict |
|---|---|---|---|
| **SIX Swiss Exchange** | Daily closing-price download, first file at 17:45 CET, updated hourly until 23:45 ([download section](https://six-group.com/en/market-data/statistics/historical-prices.html)) | **Free.** End-of-day closing prices need no Market Data Licensing Agreement, only a signed Letter of Confirmation ([SIX price list](https://www.six-group.com/dam/download/market-data/exfeed/price-lists/six-exfeed-mdla-pricelist.pdf), [DDA guidance](https://www.six-group.com/dam/download/market-data/exfeed/guidance-notes-faq/dda-guidance-notes-and-faq-2025.pdf)) | **Do first.** Sign the Letter of Confirmation, then add a SIX step to `daily.py` |
| **Taiwan Stock Exchange** | Open data API | Free, open data | Already collected |
| **Deutsche Börse (Xetra)** | Free 15-minute-delayed pre- and post-trade files under MiFIR Art. 13, gz JSON at `mfs.deutsche-boerse.com/DETR-posttrade` ([page](https://mds.deutsche-boerse.com/mds-en/real-time-data/Delayed-data)). Closing prices by batch file (WSS) | Delayed redistribution of "Xetra ETFs & ETPs" lists at €275 a month ([price list 16_1](https://mds.deutsche-boerse.com/resource/blob/5353328/480628e5e12c9126a6a67030377d2a6e/data/MDDA_Price_List_16_1.pdf)). The free MiFIR files state no reuse terms; ask `data.services@deutsche-boerse.com` before using them | Ask about end-of-day redistribution terms |
| **Euronext** (Paris, Amsterdam, Milan…) | Delayed and "after midnight" end-of-day data under the EMDA | Redistribution licence fees per product; public website display limited to extracts ([policies](https://www.euronext.com/en/data/market-data/market-data-pricing-policies)). Milan after-midnight data stops being charged under the October 2026 changes ([notice](https://www.euronext.com/media/15008/download)) | Ask `databyeuronext@euronext.com` for an after-midnight ETF quote |
| **London Stock Exchange** | End-of-day download products; licence needed for any redistribution ([pricing](https://www.londonstockexchange.com/equities-trading/market-data/pricing-and-policies)) | Licensed, historically tens of thousands of pounds a year for public websites | Later, through a vendor |
| **Cboe Europe** | Free MiFIR delayed trade files | Free files carry a **no commercial use** clause ([page](https://cboe.com/europe/equities/trade_data/)). Delayed and end-of-day licences from £21 to £275 a month per region ([Cboe UK price list 2027](https://cdn.cboe.com/resources/participant_resources/Cboe_UK_MDPricing_effective_2027.pdf)) | Cheapest pan-European licence to price out |
| **US (NYSE Arca, Nasdaq, Cboe US)** | No free exchange file. End-of-day data is generally not fee-liable in the US ([Quodd](https://quodd.com/exchange-agreements)), so vendors sell it cheaply with public display allowed | Vendor subscription | Choose a vendor that grants public display of US end-of-day prices |

## Recommended order

1. **SIX now:** the owner signs the free Letter of Confirmation with SIX Exfeed, then the price job reads the evening file. Covers every ETF listed in Switzerland, which includes most large UCITS ETFs.
2. **Keep issuer NAV** as the main daily value for everything else. It is the issuer's own figure and already covers about 2,250 ETFs.
3. **One paid licence for Europe** when revenue allows: compare Cboe Europe's delayed licence with Euronext after-midnight and Xetra delayed.
4. **A US end-of-day vendor** with public display rights.

All closes go into `universe_prices` with `kind = 'close'`, so pages need no change.
