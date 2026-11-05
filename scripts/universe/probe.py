#!/usr/bin/env python3
"""Tests which free bulk sources answer from GitHub Actions. Writes data/universe/probe.json."""
import json, urllib.request
SEC_UA = "etf-intelligence research github.com/DARYL-25/ETF"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
URLS = {
 "sec_mf_tickers": ("https://www.sec.gov/files/company_tickers_mf.json", SEC_UA),
 "sec_rr_page": ("https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-risk-return-summary-data-sets", SEC_UA),
 "sec_rr_old": ("https://www.sec.gov/dera/data/mutual-fund-prospectus-risk-return-summary-data-sets", SEC_UA),
 "ishares_us": ("https://www.ishares.com/us/product-screener/product-screener-v3.1.jsp?dcrPath=/templatedata/config/product-screener-v3/data/en/us-ishares/ishares-product-screener-backend-config&siteEntryPassthrough=true", UA),
 "ishares_uk_a": ("https://www.ishares.com/uk/individual/en/product-screener/product-screener-v3.jsp?dcrPath=/templatedata/config/product-screener-v3/data/en/uk/product-screener/product-screener-v3-config&siteEntryPassthrough=true", UA),
 "ishares_uk_b": ("https://www.ishares.com/uk/professional/en/product-screener/product-screener-v3.1.jsp?dcrPath=/templatedata/config/product-screener-v3/data/en/uk/product-screener/ishares-product-screener-backend-config&siteEntryPassthrough=true", UA),
 "ishares_ch": ("https://www.ishares.com/ch/individual/en/product-screener/product-screener-v3.1.jsp?dcrPath=/templatedata/config/product-screener-v3/data/en/ch/product-screener/ishares-product-screener-backend-config&siteEntryPassthrough=true", UA),
 "ssga_ie": ("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=ie&language=en&role=intermediary&product=etfs&ui=fund-finder", UA),
 "ssga_us": ("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder", UA),
 "six_csv": ("https://www.six-group.com/fqs/ref.csv?select=ISIN,ShortName,ValorSymbol,TradingBaseCurrency,FundIssuer,ManagementFee&where=PortalSegment=ETF&orderby=ShortName&page=1&pagesize=5000", UA),
 "six_sheldon": ("https://www.six-group.com/sheldon/etf/v1/etfs?select=isin,shortName,fundManagementFee&pageSize=20", UA),
 "euronext": ("https://live.euronext.com/en/products/etfs/list", UA),
 "xetra_page": ("https://www.xetra.com/xetra-en/instruments/shares/list-of-tradable-shares", UA),
 "dbg_etf": ("https://www.cashmarket.deutsche-boerse.com/cash-en/Data-Tech/statistics/etf-etp-statistics", UA),
 "lse_etf": ("https://docs.londonstockexchange.com/sites/default/files/reports/Instrument%20list_75.xlsx", UA),
 "tmx_list": ("https://www.tsx.com/json/company-directory/search/tsx/%5E*", UA),
 "dws_list": ("https://etf.dws.com/api/pdp/en-gb/etf/search", UA),
 "dws_sheet": ("https://etf.dws.com/en-gb/product-finder/", UA),
 "invesco": ("https://www.invesco.com/uk/en/financial-products/etfs.html", UA),
 "vanguard_us": ("https://investor.vanguard.com/investment-products/list/etfs", UA),
 "vanguard_api": ("https://investor.vanguard.com/vmf/api/product-list/etf", UA),
 "amundi_pdf": ("https://www.amundietf.de/pdfDocuments/monthly-factsheet/LU1681043599/DEU/DEU/INSTITUTIONNEL/ETF/20260930", UA),
 "yahoo_chart": ("https://query1.finance.yahoo.com/v8/finance/chart/VOO?range=5d&interval=1d", UA),
 "stooq": ("https://stooq.com/q/l/?s=voo.us&f=sd2t2ohlcv&h&e=csv", UA),
}
out = {}
for key, (url, ua) in URLS.items():
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "*/*"})
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            out[key] = {"status": r.status, "type": r.headers.get("content-type"), "bytes": len(body), "head": body[:700].decode("latin-1")}
    except Exception as e:
        out[key] = {"error": str(e)[:200]}
    print(key, {k: v for k, v in out[key].items() if k != "head"}, flush=True)
open("data/universe/probe.json", "w").write(json.dumps(out, indent=0))
