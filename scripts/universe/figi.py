#!/usr/bin/env python3
"""Looks up exchange tickers for ISINs that have none, through the OpenFIGI mapping API.
Results are cached in data/universe/figi.csv.gz, so each run only asks about new ISINs.
Without a key the API allows 25 requests a minute of 10 ISINs each. OPENFIGI_API_KEY raises that."""
import csv, datetime as dt, gzip, json, os, time, urllib.error, urllib.request
from pathlib import Path

OUT = Path("data/universe")
CACHE = OUT / "figi.csv.gz"
FIELDS = ["isin", "ticker", "exch", "us_ticker", "name", "checked_on"]
KEY = os.environ.get("OPENFIGI_API_KEY", "")
BATCH, PAUSE = (100, 0.3) if KEY else (10, 2.6)
LIMIT = int(os.environ.get("FIGI_MAX", "7000"))
# Bloomberg exchange codes, most useful listing for a European or US investor first.
ORDER = ["US", "LN", "GY", "SW", "FP", "NA", "IM", "SE", "GR", "SM", "ID", "AV", "BB", "SS", "CN", "CT", "AU", "AT", "HK", "JP", "JT", "SP", "KS", "TT", "IN", "IS", "IT", "SJ", "BZ", "MM"]

universe = list(csv.DictReader(gzip.open(OUT / "universe.csv.gz", "rt", encoding="utf-8")))
cache = {r["isin"]: r for r in csv.DictReader(gzip.open(CACHE, "rt", encoding="utf-8"))} if CACHE.exists() else {}
stale = (dt.date.today() - dt.timedelta(days=180)).isoformat()
want = [r["isin"] for r in universe if r["isin"] and not r["ticker"] and (r["isin"] not in cache or cache[r["isin"]]["checked_on"] < stale)]
want.sort(key=lambda i: (not i.startswith("US"), not i.startswith(("IE", "LU", "DE", "FR", "CH", "GB", "CA")), i))
want = want[:LIMIT]
today, done, errors = dt.date.today().isoformat(), 0, 0

def ask(isins):
    body = json.dumps([{"idType": "ID_ISIN", "idValue": i} for i in isins]).encode()
    headers = {"Content-Type": "application/json", "User-Agent": "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"}
    if KEY: headers["X-OPENFIGI-APIKEY"] = KEY
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request("https://api.openfigi.com/v3/mapping", data=body, headers=headers), timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 3: raise
            time.sleep(65)

for i in range(0, len(want), BATCH):
    chunk = want[i:i + BATCH]
    try:
        answers = ask(chunk)
    except Exception as e:
        errors += 1
        print("stopped:", type(e).__name__, str(e)[:120], flush=True)
        if errors >= 3: break
        continue
    for isin, a in zip(chunk, answers):
        hits = [h for h in a.get("data", []) if h.get("ticker") and h.get("marketSector") == "Equity"]
        hits.sort(key=lambda h: ORDER.index(h["exchCode"]) if h.get("exchCode") in ORDER else 99)
        best = hits[0] if hits else {}
        us = next((h["ticker"] for h in hits if h.get("exchCode") == "US"), "")
        cache[isin] = {"isin": isin, "ticker": best.get("ticker", ""), "exch": best.get("exchCode", "") or "", "us_ticker": us, "name": best.get("name", ""), "checked_on": today}
        done += 1
    time.sleep(PAUSE)
    if i % (BATCH * 50) == 0: print(done, "of", len(want), flush=True)

with gzip.open(CACHE, "wt", newline="", encoding="utf-8", compresslevel=9) as fh:
    w = csv.DictWriter(fh, FIELDS); w.writeheader(); w.writerows(sorted(cache.values(), key=lambda r: r["isin"]))
report = {"asked": done, "cached": len(cache), "with_ticker": sum(1 for r in cache.values() if r["ticker"]), "us_tickers": sum(1 for r in cache.values() if r["us_ticker"]), "still_to_ask": max(0, len([r for r in universe if r["isin"] and not r["ticker"] and r["isin"] not in cache])), "on": today}
(OUT / "details").mkdir(exist_ok=True)
(OUT / "details" / "figi_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report))
