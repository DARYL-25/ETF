#!/usr/bin/env python3
"""Merges the downloaded lists into one row per ETF: data/universe/universe.csv.gz.
Key is the ISIN when known, otherwise exchange plus ticker. US tickers are matched to register
ISINs by name, because the US symbol file has no ISINs."""
import csv, glob, gzip, json, os, re

OUT = "data/universe"
SOURCE_URL = {"issuer_identity": "https://www.ubs.com/etf", "esma": "https://registers.esma.europa.eu/publication/searchRegister?core=esma_registers_firds", "fca": "https://data.fca.org.uk/#/homepage",
  "us": "https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs", "india": "https://www.nseindia.com/market-data/exchange-traded-funds-etf",
  "canada": "https://www.tsx.com/listings/listing-with-us/listed-company-directory", "singapore": "https://www.sgx.com/securities/etf-screener",
  "china_sh": "https://etf.sse.com.cn/", "china_sz": "https://fund.szse.cn/", "taiwan": "https://www.twse.com.tw/en/products/securities/etf/products/list.html",
  "hongkong": "https://www.hkex.com.hk/Products/Securities/Exchange-Traded-Products", "japan": "https://www.jpx.co.jp/english/equities/products/etfs/", "korea": "https://finance.naver.com/sise/etf.naver"}

def read(path):
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))

def clean(name):
    return re.sub(r"\s+ETFS$", "", (name or "").strip())

def norm(name):
    return re.sub(r"[^A-Z0-9]", "", clean(name).upper())

BOND = re.compile(r"\b(bond|bonds|treasur|govt|government|corporate|corp bond|aggregate|fixed income|muni|high yield|sovereign|gilt)", re.I)
COMMODITY = re.compile(r"\b(gold|silver|platinum|palladium|commodit|crude|oil fund)", re.I)
MONEY = re.compile(r"\b(money market|overnight|ultrashort|ultra short)", re.I)

def asset_class(name):
    if MONEY.search(name): return "money_market"
    if BOND.search(name): return "fixed_income"
    if COMMODITY.search(name): return "commodities"
    return ""

issuers = {r["lei"]: r for r in read(f"{OUT}/issuers.csv.gz")} if os.path.exists(f"{OUT}/issuers.csv.gz") else {}
merged, by_isin = {}, {}
for path in sorted(glob.glob(f"{OUT}/*.csv.gz")):
    source = os.path.basename(path).replace(".csv.gz", "")
    if source in ("issuers", "universe", "us", "details", "issuer_files", "sec_fees", "sec_series", "sec_tickers"): continue
    for r in read(path):
        if "isin" not in r: break  # A file of figures, not a list of ETFs.
        key = r["isin"] or f'{r["mic"]}-{r["ticker"]}'
        m = merged.setdefault(key, {"etf_key": key, "isin": r["isin"], "ticker": r["ticker"], "mic": "", "name": "", "currency": "", "issuer_lei": "", "source": source, "venues": set()})
        name = clean(r["name"])
        # Prefer the longest mixed-case name, since registers truncate and shout.
        if len(name) > len(m["name"]) or (m["name"].isupper() and not name.isupper() and len(name) >= len(m["name"])): m["name"] = name
        if r["mic"]: m["venues"].add(r["mic"])
        if r["ticker"] and not m["ticker"]: m["ticker"], m["mic"] = r["ticker"], r["mic"]
        if r["currency"] and not m["currency"]: m["currency"] = r["currency"]
        if r["issuer_lei"]: m["issuer_lei"] = r["issuer_lei"]

# Match US tickers to ISIN records by the start of the name.
prefixes = {}
for m in merged.values():
    if m["isin"].startswith("US"): prefixes.setdefault(norm(m["name"])[:22], []).append(m)
# Registers cut names at 30 characters, so a register name can be the start of the exchange name.
stems = {}
for m in merged.values():
    if m["isin"].startswith("US"):
        stem = re.sub(r"ETF$", "", norm(m["name"]))
        if len(stem) >= 14: stems.setdefault(stem, []).append(m)
def loose(name):
    full = norm(name)
    for size in range(len(full), 13, -1):
        hits = stems.get(full[:size])
        if hits: return hits[0] if len(hits) == 1 and not hits[0]["ticker"] else None
    return None
matched = 0
for r in read(f"{OUT}/us.csv.gz"):
    name = clean(r["name"]); candidates = prefixes.get(norm(name)[:22], [])
    if len(candidates) == 1 and len(norm(name)) >= 12:
        m = candidates[0]; m["ticker"], m["mic"], m["name"], m["currency"], m["source"] = r["ticker"], r["mic"], name, "USD", "us"; m["venues"].add(r["mic"]); matched += 1
    elif loose(name):
        m = loose(name); m["ticker"], m["mic"], m["name"], m["currency"], m["source"] = r["ticker"], r["mic"], name, "USD", "us"; m["venues"].add(r["mic"]); matched += 1
    else:
        key = f'{r["mic"]}-{r["ticker"]}'
        merged[key] = {"etf_key": key, "isin": "", "ticker": r["ticker"], "mic": r["mic"], "name": name, "currency": "USD", "issuer_lei": "", "source": "us", "venues": {r["mic"]}}

rows = []
for m in merged.values():
    who = issuers.get(m["issuer_lei"], {})
    rows.append({**m, "venues": len(m["venues"]), "issuer_name": who.get("legal_name", ""), "issuer_country": who.get("country", ""),
                 "ucits": "t" if "UCITS" in m["name"].upper() else "", "asset_class": asset_class(m["name"]), "source_url": SOURCE_URL.get(m["source"], "")})
rows.sort(key=lambda r: r["etf_key"])
fields = ["etf_key", "isin", "ticker", "mic", "name", "currency", "issuer_lei", "issuer_name", "issuer_country", "ucits", "asset_class", "venues", "source", "source_url"]
with gzip.open(f"{OUT}/universe.csv.gz", "wt", newline="", encoding="utf-8", compresslevel=9, ) as fh:
    w = csv.DictWriter(fh, fields, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
counts = {}
for r in rows: counts[r["source"]] = counts.get(r["source"], 0) + 1
print(json.dumps({"total": len(rows), "with_isin": sum(1 for r in rows if r["isin"]), "us_matched_to_isin": matched, "by_source": counts}))
