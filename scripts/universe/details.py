#!/usr/bin/env python3
"""Reads free issuer data under an honest client name. A refusal is recorded and accepted, not retried.
First pass: saves samples so parsers can be written against real output."""
import csv, gzip, io, json, urllib.request
from pathlib import Path
OUT = Path("data/universe/details"); OUT.mkdir(parents=True, exist_ok=True)
UA = "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as r:
        return r.read()
report = {}
try:
    d = json.loads(get("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder"))
    (OUT / "ssga_us.json.gz").write_bytes(gzip.compress(json.dumps(d).encode()))
    report["ssga_us"] = {"ok": True}
except Exception as e:
    report["ssga_us"] = {"ok": False, "error": str(e)[:200]}
try:
    import pdfplumber
    b = get("https://www.amundietf.de/pdfDocuments/monthly-factsheet/LU1681043599/DEU/DEU/INSTITUTIONNEL/ETF/20260930")
    with pdfplumber.open(io.BytesIO(b)) as p:
        (OUT / "amundi_sample.txt").write_text("\n".join((pg.extract_text() or "") for pg in p.pages[:2])[:4000])
    report["amundi"] = {"ok": True}
except Exception as e:
    report["amundi"] = {"ok": False, "error": str(e)[:200]}
(OUT / "report.json").write_text(json.dumps(report, indent=1))
print(report)
