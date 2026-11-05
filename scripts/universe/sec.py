#!/usr/bin/env python3
"""SEC open data for US funds: ticker to series and class map, and fees from prospectus risk/return data sets.
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
page = get("https://www.sec.gov/data-research/sec-markets-data/mutual-fund-prospectus-risk-return-summary-data-sets").decode("utf-8", "replace")
links = sorted(set(re.findall(r'href="([^"]+\.zip)"', page)))
report["zip_links"] = links[-6:]
if links:
    url = links[-1] if links[-1].startswith("http") else "https://www.sec.gov" + links[-1]
    z = zipfile.ZipFile(io.BytesIO(get(url)))
    report["files"] = z.namelist()
    for n in z.namelist():
        with z.open(n) as fh:
            report[f"head_{n}"] = fh.read(900).decode("latin-1")
(OUT / "sec_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:1500])
