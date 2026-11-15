#!/usr/bin/env python3
"""SEC open data for US funds, first pass samples the files: ticker to series and class map, and fees from prospectus risk/return data sets.
SEC asks clients to state a contact, read from the SEC_CONTACT_EMAIL repository secret."""
import io, json, os, re, sys, time, urllib.request, zipfile
from pathlib import Path
contact = os.environ.get("SEC_CONTACT_EMAIL")
if not contact:
    print("SEC_CONTACT_EMAIL secret is not set. Nothing to do."); sys.exit(0)
OUT = Path("data/universe/details"); OUT.mkdir(parents=True, exist_ok=True)
UA = f"ETF Intelligence {contact}"
def get(url):
    time.sleep(0.3)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=300) as r:
        return r.read()
report = {}
tick = json.loads(get("https://www.sec.gov/files/company_tickers_mf.json"))
report["tickers"] = len(tick["data"]); report["fields"] = tick["fields"]
import gzip, csv
with gzip.open(OUT.parent / "sec_tickers.csv.gz", "wt", newline="") as fh:
    w = csv.writer(fh); w.writerow(tick["fields"]); w.writerows(tick["data"])
links = []
for pg in ("https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-risk-return-summary-data-sets", "https://www.sec.gov/dera/data/mutual-fund-prospectus-risk-return-summary-data-sets"):
    try:
        links = sorted(set(re.findall(r'href="([^"]+\.zip)"', get(pg).decode("utf-8", "replace"))))
        report["page"] = pg
        break
    except Exception as e:
        report[f"page_error_{pg[-60:]}"] = str(e)
if not links:
    for q in ("2026q3", "2026q2", "2026q1", "2025q4", "2025q3"):
        for base in ("https://www.sec.gov/files/dera/data/mutual-fund-prospectus-risk-return-summary-data-sets/", "https://www.sec.gov/files/dera/risk-return/"):
            try:
                req = urllib.request.Request(f"{base}{q}_rr1.zip", headers={"User-Agent": UA}, method="HEAD")
                time.sleep(0.5); urllib.request.urlopen(req, timeout=60); links = [f"{base}{q}_rr1.zip"]; break
            except Exception as e:
                report[f"try_{q}_{base[-20:]}"] = str(e)[:40]
        if links: break
report["zip_links"] = links[-8:]
# Fees from prospectus filings, newest filing wins. Values are fractions, so 0.0007 is 0.07%.
by_class = {r[2]: r[3] for r in tick["data"] if r[2]}
by_series = {}
for r in tick["data"]:
    by_series.setdefault(r[1], set()).add(r[3])
universe = {r["ticker"]: r["etf_key"] for r in csv.DictReader(gzip.open(OUT.parent / "universe.csv.gz", "rt", encoding="utf-8")) if r["source"] == "us" and r["ticker"]}
fees = {}
csv.field_size_limit(10**8)
for link in reversed(links[-8:]):
    url = link if link.startswith("http") else "https://www.sec.gov" + link
    z = zipfile.ZipFile(io.BytesIO(get(url)))
    filed = {}
    with z.open("sub.tsv") as fh:
        for r in csv.DictReader(io.TextIOWrapper(fh, "utf-8", "replace"), delimiter="\t", quoting=csv.QUOTE_NONE):
            filed[r["adsh"]] = r["filed"]
    with z.open("num.tsv") as fh:
        for r in csv.DictReader(io.TextIOWrapper(fh, "utf-8", "replace"), delimiter="\t", quoting=csv.QUOTE_NONE):
            if r["tag"] != "NetExpensesOverAssets" and r["tag"] != "ExpensesOverAssets": continue
            if r.get("otherdims") or not r.get("value"): continue
            symbols = {by_class[r["class"]]} if r.get("class") in by_class else (by_series.get(r.get("series"), set()) if len(by_series.get(r.get("series"), set())) == 1 else set())
            for sym in symbols:
                key = universe.get(sym)
                if not key: continue
                rank = (filed.get(r["adsh"], ""), r["tag"] == "NetExpensesOverAssets")
                if key not in fees or rank > fees[key][0]:
                    fees[key] = (rank, float(r["value"]) * 100, "net" if r["tag"] == "NetExpensesOverAssets" else "gross_sec", r["adsh"])
    report[f"after_{link[-14:]}"] = len(fees)
with gzip.open(OUT.parent / "sec_fees.csv.gz", "wt", newline="") as fh:
    w = csv.writer(fh); w.writerow(["etf_key", "fee_pct", "fee_type", "filed", "adsh"])
    for key, (rank, value, kind, adsh) in sorted(fees.items()):
        w.writerow([key, round(value, 4), kind, rank[0], adsh])
report["us_etfs_with_fee"] = len(fees); report["us_etfs_total"] = len(universe)
(OUT / "sec_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:1500])
