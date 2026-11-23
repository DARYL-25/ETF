#!/usr/bin/env python3
"""US fund sizes and holdings from the SEC's Form N-PORT data sets, public domain.

Each registered fund reports its net assets and every position once a quarter. The SEC publishes these as one zip
per quarter at https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets. This reads the newest two
quarters, keeps the latest report per fund series, and maps series to our US ETFs through the SEC ticker file.

Writes:
  data/universe/sec_nport.csv.gz      one row per ETF: net assets in USD and the report date
  data/universe/sec_returns.csv.gz    official monthly total returns per ETF share class
  data/holdings/sec_holdings.csv.gz   holdings, same columns as holdings.csv.gz, only for ETFs without issuer holdings
  data/holdings/sec_summary.csv.gz    one row per ETF in sec_holdings, same columns as summary.csv.gz
  data/universe/details/nport_report.json
N-PORT has country and asset type for each position but no GICS sector, so sector stays empty.
SEC asks clients to state a contact, read from the SEC_CONTACT_EMAIL repository secret."""
import csv, datetime as dt, gzip, io, json, os, re, shutil, sys, tempfile, time, urllib.request, zipfile
from pathlib import Path

contact = os.environ.get("SEC_CONTACT_EMAIL")
if not contact:
    print("SEC_CONTACT_EMAIL secret is not set. Nothing to do."); sys.exit(0)
UA = {"User-Agent": f"ETF Intelligence {contact}"}
U, H, R = Path("data/universe"), Path("data/holdings"), Path("data/universe/details")
H.mkdir(parents=True, exist_ok=True); R.mkdir(parents=True, exist_ok=True)
PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets"
QUARTERS = int(os.environ.get("NPORT_QUARTERS", "2"))
KEEP, MIN_WEIGHT = 150, 0.05  # holdings kept per fund, largest first, and the smallest weight kept
csv.field_size_limit(10**9)
report = {"on": dt.date.today().isoformat(), "page": PAGE}

def get(url, timeout=120):
    time.sleep(0.3)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()

def download(url, path):
    time.sleep(0.3)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=1800) as r, open(path, "wb") as fh:
        shutil.copyfileobj(r, fh, 1 << 20)

def tsv(z, name):
    match = [n for n in z.namelist() if n.split("/")[-1].upper() == name.upper()]
    if not match: raise KeyError(f"{name} not in {z.namelist()[:20]}")
    return csv.DictReader(io.TextIOWrapper(z.open(match[0]), "utf-8", "replace"), delimiter="\t", quoting=csv.QUOTE_NONE)

def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

# Which quarterly zips exist, newest first.
html = get(PAGE).decode("utf-8", "replace")
links = sorted(set(re.findall(r'href="([^"]*?(\d{4}q[1-4])_nport[^"]*\.zip)"', html)), key=lambda x: x[1], reverse=True)
zips = [(q, l if l.startswith("http") else "https://www.sec.gov" + l) for l, q in links][:QUARTERS]
if not zips:
    today = dt.date.today(); q = (today.month - 1) // 3
    guess = [(today.year if q else today.year - 1, q or 4)]
    for _ in range(3): y, n = guess[-1]; guess.append((y, n - 1) if n > 1 else (y - 1, 4))
    zips = [(f"{y}q{n}", f"https://www.sec.gov/files/dera/data/form-n-port-data-sets/{y}q{n}_nport.zip") for y, n in guess][:QUARTERS + 1]
report["zips"] = [u for _, u in zips]

# SEC ticker file: series to share-class tickers. Our US ETFs are keyed by ticker.
tick = json.loads(get("https://www.sec.gov/files/company_tickers_mf.json"))
f = {n: i for i, n in enumerate(tick["fields"])}
universe = {r["ticker"]: r["etf_key"] for r in csv.DictReader(gzip.open(U / "universe.csv.gz", "rt", encoding="utf-8")) if r["source"] == "us" and r["ticker"]}
series_etfs, class_etf = {}, {}
for row in tick["data"]:
    key = universe.get(row[f["symbol"]])
    if key:
        series_etfs.setdefault(row[f["seriesId"]], set()).add(key)
        class_etf[row[f["classId"]]] = key
returns = {}  # (etf_key, "YYYY-MM") -> monthly total return in %
report["series_matched"] = len(series_etfs)

# ETFs that already have issuer holdings keep them; N-PORT fills the rest.
with_issuer = set()
if (H / "summary.csv.gz").exists():
    with_issuer = {r["etf_key"] for r in csv.DictReader(gzip.open(H / "summary.csv.gz", "rt", encoding="utf-8"))}

# Country names as the issuer files write them, which the site's map already reads.
try:
    import pycountry
    COUNTRY = {c.alpha_2: getattr(c, "common_name", None) or c.name for c in pycountry.countries}
except ImportError:
    COUNTRY = {}
COUNTRY.update({"US": "United States", "GB": "United Kingdom", "KR": "Korea", "TW": "Taiwan", "RU": "Russia", "VN": "Vietnam", "IR": "Iran", "CZ": "Czech Republic", "HK": "Hong Kong", "MO": "Macau", "TR": "Turkey", "BO": "Bolivia", "VE": "Venezuela", "TZ": "Tanzania", "MD": "Moldova", "SY": "Syria", "LA": "Laos", "KP": "North Korea", "PS": "Palestine", "XX": ""})
ASSET = {"EC": "Equity", "EP": "Preferred equity", "DBT": "Fixed income", "ABS-MBS": "Fixed income", "ABS-ASBS": "Fixed income", "ABS-CBDO": "Fixed income", "ABS-O": "Fixed income",
         "LON": "Loan", "STIV": "Cash", "RF": "Fund", "RE": "Real estate", "COMM": "Commodity", "SN": "Structured note",
         "DCO": "Derivative", "DCR": "Derivative", "DE": "Derivative", "DFE": "Derivative", "DIR": "Derivative", "DO": "Derivative", "OTHER": "Other"}

best = {}  # series -> (report_date, accession, net_assets, quarter)
acc_month = {}  # accession -> report date, for every matched series
tmp = Path(tempfile.mkdtemp())
for quarter, url in zips:
    path = tmp / f"{quarter}.zip"
    try:
        download(url, path)
    except Exception as e:
        report[f"download_{quarter}"] = str(e)[:200]; continue
    report[f"size_{quarter}_mb"] = round(path.stat().st_size / 2**20)
    with zipfile.ZipFile(path) as z:
        report[f"files_{quarter}"] = [n for n in z.namelist()][:30]
        dates = {r["ACCESSION_NUMBER"]: r.get("REPORT_DATE") or r.get("REPORT_ENDING_PERIOD") or "" for r in tsv(z, "SUBMISSION.tsv")}
        for r in tsv(z, "FUND_REPORTED_INFO.tsv"):
            s = r.get("SERIES_ID")
            if s not in series_etfs: continue
            d = dates.get(r["ACCESSION_NUMBER"], "")
            parsed = None
            for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%m/%d/%Y"):
                try: parsed = dt.datetime.strptime(d, fmt).date().isoformat(); break
                except ValueError: pass
            na = num(r.get("NET_ASSETS"))
            if parsed: acc_month[r["ACCESSION_NUMBER"]] = parsed
            if parsed and na and (s not in best or parsed > best[s][0]):
                best[s] = (parsed, r["ACCESSION_NUMBER"], na, quarter)
        # Official monthly total returns per share class: the report's month and the two before it.
        try:
            for r in tsv(z, "MONTHLY_TOTAL_RETURN.tsv"):
                key, end = class_etf.get(r.get("CLASS_ID")), acc_month.get(r["ACCESSION_NUMBER"])
                if not key or not end: continue
                y, m = int(end[:4]), int(end[5:7])
                for back, col in ((2, "MONTHLY_TOTAL_RETURN1"), (1, "MONTHLY_TOTAL_RETURN2"), (0, "MONTHLY_TOTAL_RETURN3")):
                    v = num(r.get(col))
                    if v is None or abs(v) > 100: continue
                    mm = m - back; yy = y + (mm - 1) // 12; mm = (mm - 1) % 12 + 1
                    returns.setdefault((key, f"{yy}-{mm:02d}"), v)
        except KeyError as e:
            report[f"returns_{quarter}"] = str(e)[:200]
report["series_with_report"] = len(best)

# Holdings of the chosen reports, only for ETFs with no issuer holdings.
wanted = {}
for s, (date, acc, na, quarter) in best.items():
    keys = [k for k in series_etfs[s] if k not in with_issuer]
    if keys: wanted[acc] = (keys, date, quarter)
by_acc = {}
for quarter, _ in zips:
    path = tmp / f"{quarter}.zip"
    accs = {a for a, (_, _, q) in wanted.items() if q == quarter}
    if not accs or not path.exists(): continue
    with zipfile.ZipFile(path) as z:
        for r in tsv(z, "FUND_REPORTED_HOLDING.tsv"):
            a = r["ACCESSION_NUMBER"]
            if a not in accs: continue
            w = num(r.get("PERCENTAGE"))
            if w is None: continue
            by_acc.setdefault(a, []).append({"name": (r.get("ISSUER_NAME") or r.get("ISSUER_TITLE") or "").strip(), "weight": w,
                "country": COUNTRY.get((r.get("INVESTMENT_COUNTRY") or "").upper(), r.get("INVESTMENT_COUNTRY") or ""),
                "asset_class": ASSET.get(r.get("ASSET_CAT") or "", r.get("ASSET_CAT") or ""), "id": r.get("HOLDING_ID")})
    path.unlink()
shutil.rmtree(tmp, ignore_errors=True)

def holding_key(name):
    clean = re.sub(r"\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|PLC|LTD|LIMITED|SA|AG|NV|SE|ASA|AB|OYJ|SPA|HOLDINGS?|GROUP|CLASS|CL|ORD|REG|SHS|ADR|THE|AND|COM)\b", "", re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace(".COM", "COM")))
    return re.sub(r"[^A-Z0-9]", "", clean)[:22]

hold_rows, sum_rows = [], []
for acc, (keys, date, quarter) in wanted.items():
    merged = {}
    for h in by_acc.get(acc, []):
        k = holding_key(h["name"]) or f"|{h['id']}"
        if k in merged: merged[k]["weight"] += h["weight"]
        else: merged[k] = dict(h)
    rows = sorted((h for h in merged.values() if h["weight"] > 0), key=lambda h: -h["weight"])
    kept = [h for h in rows if h["weight"] >= MIN_WEIGHT][:KEEP]
    if not kept: continue
    for key in keys:
        for h in kept:
            hold_rows.append([key, holding_key(h["name"]) or f"|{h['id']}", h["name"][:80], "", round(h["weight"], 4), "", h["country"][:40], h["asset_class"][:24]])
        sum_rows.append([key, date, len(rows), len(kept), round(sum(h["weight"] for h in kept), 2), "SEC N-PORT", PAGE])

with gzip.open(U / "sec_nport.csv.gz", "wt", newline="") as fh:
    w = csv.writer(fh); w.writerow(["etf_key", "aum", "aum_currency", "aum_as_of", "accession"])
    for s, (date, acc, na, _) in sorted(best.items()):
        for key in sorted(series_etfs[s]): w.writerow([key, round(na), "USD", date, acc])
with gzip.open(U / "sec_returns.csv.gz", "wt", newline="") as fh:
    w = csv.writer(fh); w.writerow(["etf_key", "month", "return_pct"])
    for (key, month), v in sorted(returns.items()): w.writerow([key, month, round(v, 4)])
report["monthly_returns"] = len(returns)
for name, header, rows in (("sec_holdings.csv.gz", ["etf_key", "holding_key", "name", "ticker", "weight", "sector", "country", "asset_class"], hold_rows),
                           ("sec_summary.csv.gz", ["etf_key", "as_of", "n_holdings", "kept", "covered_pct", "source", "source_url"], sum_rows)):
    with gzip.open(H / name, "wt", newline="") as fh:
        w = csv.writer(fh); w.writerow(header); w.writerows(sorted(rows))
report.update({"etfs_with_size": sum(len(series_etfs[s]) for s in best), "us_etfs_total": len(universe),
               "etfs_with_sec_holdings": len(sum_rows), "holding_rows": len(hold_rows)})
(R / "nport_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:2000])
