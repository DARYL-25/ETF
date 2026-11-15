#!/usr/bin/env python3
"""The daily job: exchange rates and one price point per ETF.
- data/seed/fx.json: European Central Bank euro reference rates, all published currencies.
- data/prices/nav-<year>.csv.gz: one row per ETF and day. kind is 'nav' (the issuer's published net
  asset value) or 'close' (an exchange closing price published as open data).
History builds up from the day this job first ran. Nothing is back-filled or estimated."""
import csv, datetime as dt, gzip, json, re, urllib.request
from pathlib import Path

UA = {"User-Agent": "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"}
U, P = Path("data/universe"), Path("data/prices")
P.mkdir(parents=True, exist_ok=True)
today = dt.date.today().isoformat()
report = {"on": today}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        return r.read()

# 1. Exchange rates.
try:
    xml = get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml").decode()
    day = re.search(r"time=['\"](\d{4}-\d\d-\d\d)", xml).group(1)
    rates = {c: float(v) for c, v in re.findall(r"currency=['\"]([A-Z]{3})['\"]\s+rate=['\"]([\d.]+)", xml)}
    if len(rates) < 20: raise RuntimeError(f"Only {len(rates)} rates")
    Path("data/seed/fx.json").write_text(json.dumps({"publisher": "European Central Bank", "url": "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html",
        "retrievedOn": today, "rateDate": day, "note": "Euro reference rates as published: units of currency per 1 euro. Reuse requires quoting the source and not modifying the statistics.", "perEuro": rates}, indent=2) + "\n")
    report["fx"] = {"ok": True, "rate_date": day, "currencies": len(rates)}
except Exception as e:
    report["fx"] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:200]}

# 2. Price points.
universe = list(csv.DictReader(gzip.open(U / "universe.csv.gz", "rt", encoding="utf-8")))
points = {}
def add(key, date, value, currency, kind, source):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return
    if value <= 0 or not re.fullmatch(r"\d{4}-\d\d-\d\d", date or "") or date > today: return
    points[(key, date, kind)] = {"etf_key": key, "date": date, "value": round(value, 6), "currency": currency, "kind": kind, "source": source}

before = 0
if (U / "details.csv.gz").exists():
    for r in csv.DictReader(gzip.open(U / "details.csv.gz", "rt", encoding="utf-8")):
        add(r["etf_key"], r["nav_as_of"], r["nav"], r["nav_currency"], "nav", r["source"])
if (U / "issuer_files.csv.gz").exists():
    by_isin = {r["isin"]: r["etf_key"] for r in universe if r["isin"]}
    by_ticker = {r["ticker"]: r["etf_key"] for r in universe if r["ticker"] and (not r["isin"] or r["isin"].startswith("US"))}
    for r in csv.DictReader(gzip.open(U / "issuer_files.csv.gz", "rt", encoding="utf-8")):
        key = by_isin.get(r["isin"]) if r["isin"] else by_ticker.get(r["ticker"])
        if key: add(key, r["nav_as_of"], r["nav"], r["nav_currency"], "nav", r["source"])
report["nav_points"] = len(points)

# Taiwan Stock Exchange publishes daily closes as government open data.
try:
    data = json.loads(get("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"))
    tw = {r["ticker"]: r["etf_key"] for r in universe if r["etf_key"].startswith("XTAI-")}
    n = 0
    for row in data:
        code, raw = str(row.get("Code", "")).strip(), str(row.get("Date", ""))
        if code not in tw or not re.fullmatch(r"\d{7}", raw): continue
        date = f"{int(raw[:3]) + 1911}-{raw[3:5]}-{raw[5:7]}"  # The file uses the Republic of China calendar.
        size = len(points); add(tw[code], date, row.get("ClosingPrice"), "TWD", "close", "Taiwan Stock Exchange open data"); n += len(points) > size
    report["taiwan"] = {"ok": n > 0, "points": n}
except Exception as e:
    report["taiwan"] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:200]}

# 3. Merge into the yearly files, newest value for a day wins.
FIELDS = ["etf_key", "date", "value", "currency", "kind", "source"]
added = 0
for year in sorted({k[1][:4] for k in points}):
    path = P / f"nav-{year}.csv.gz"
    rows = {(r["etf_key"], r["date"], r["kind"]): r for r in csv.DictReader(gzip.open(path, "rt", encoding="utf-8"))} if path.exists() else {}
    size = len(rows)
    rows.update({k: v for k, v in points.items() if k[1].startswith(year)})
    added += len(rows) - size
    with gzip.open(path, "wt", newline="", encoding="utf-8", compresslevel=9) as fh:
        w = csv.DictWriter(fh, FIELDS); w.writeheader(); w.writerows(sorted(rows.values(), key=lambda r: (r["etf_key"], r["date"], r["kind"])))
report["new_points"] = added
report["etfs_priced"] = len({k[0] for k in points})
report["latest_date"] = max((k[1] for k in points), default=None)
(P / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
print(json.dumps(report, ensure_ascii=False)[:900])
