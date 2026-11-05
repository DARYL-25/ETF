#!/usr/bin/env python3
"""Adds issuer-published fees, fund size, NAV and returns to basic records.
Uses an honest client name and one request at a time. A refusal is recorded and accepted, never retried.
Writes data/universe/details.csv.gz, keyed by the etf_key in universe.csv.gz."""
import csv, datetime as dt, gzip, io, json, os, re, time, urllib.error, urllib.request
from pathlib import Path

OUT = Path("data/universe"); (OUT / "details").mkdir(parents=True, exist_ok=True)
UA = "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"
FIELDS = ["etf_key", "fee_pct", "fee_type", "aum", "aum_currency", "aum_as_of", "nav", "nav_currency", "nav_as_of", "ret_1y", "ret_3y", "ret_5y", "ret_si", "ret_as_of", "volatility_3y", "tracking_error_3y", "distribution", "source", "source_url"]

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as r:
        return r.read()

universe = list(csv.DictReader(gzip.open(OUT / "universe.csv.gz", "rt", encoding="utf-8")))
report, rows = {}, []

def num(cell):
    return cell[1] if isinstance(cell, list) and len(cell) > 1 and isinstance(cell[1], (int, float)) and cell[1] > -1e6 and abs(cell[1]) > 1e-300 else ""

def ssga_us():
    data = json.loads(get("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder"))
    by_ticker = {r["ticker"]: r for r in universe if r["source"] == "us" and r["ticker"]}
    found = 0
    for f in data["data"]["funds"]["etfs"]["datas"]:
        ticker = re.sub(r"[^A-Z.]", "", f.get("fundTicker", ""))
        u = by_ticker.get(ticker)
        if not u or f.get("domicile") != "US": continue
        aum = num(f.get("aum"))
        rows.append({"etf_key": u["etf_key"], "fee_pct": num(f.get("ter")), "fee_type": "ger", "aum": aum * 1e6 if aum != "" else "", "aum_currency": "USD",
            "aum_as_of": (f.get("asOfDate") or [None, ""])[1], "nav": num(f.get("nav")), "nav_currency": "USD", "nav_as_of": (f.get("asOfDate") or [None, ""])[1],
            "ret_1y": num(f.get("yr1")), "ret_3y": num(f.get("yr3")), "ret_5y": num(f.get("yr5")), "ret_si": num(f.get("sinceInception")), "ret_as_of": (f.get("PerfAsOf") or [None, ""])[1],
            "volatility_3y": "", "tracking_error_3y": "", "distribution": "", "source": "State Street", "source_url": "https://www.ssga.com" + f.get("fundUri", "")})
        found += 1
    return found

def de(n):
    return float(n.replace(".", "").replace(",", "."))

def amundi():
    import pdfplumber
    wanted = [r for r in universe if r["isin"] and re.search("AMUNDI|LYXOR", r["name"] + " " + r["issuer_name"], re.I)]
    limit = int(os.environ.get("AMUNDI_LIMIT", "5000"))
    found = missing = 0
    month_ends = ["20260930"]
    for u in wanted[:limit]:
        url = f"https://www.amundietf.de/pdfDocuments/monthly-factsheet/{u['isin']}/DEU/DEU/INSTITUTIONNEL/ETF/{month_ends[0]}"
        time.sleep(1)
        try:
            blob = get(url)
            if blob[:4] != b"%PDF": raise ValueError("not a pdf")
            with pdfplumber.open(io.BytesIO(blob)) as p:
                text = "\n".join((pg.extract_text() or "") for pg in p.pages[:3])
        except Exception:
            missing += 1
            continue
        if found == 0: (OUT / "details" / "amundi_sample.txt").write_text(text[:14000])
        # The ISIN must appear in the document, or the figures are not this fund's.
        if u["isin"] not in text:
            missing += 1
            continue
        fee = re.search(r"Verwaltungsgeb\S+ und sonstige Verwaltungs- oder Betriebskosten\s*\*?\s*(\d+,\d+)\s*%", text)
        fee_value = de(fee.group(1)) if fee else ""
        if fee_value != "" and fee_value > 2: fee_value = ""
        income = re.search(r"Ertragsverwendung\s+(.+)", text)
        income = income.group(1).strip() if income else ""
        policy = "accumulating" if income == "Thesaurierend" else "distributing" if income in ("Ausschüttend", "Ausschuettend") else ""
        cumulative = re.search(r"Portfolio ohne\s*\n?\s*(-?\d+,\d+)%\s+(-?\d+,\d+)%\s+(-?\d+,\d+)%\s+(-?\d+,\d+)%\s+(-?\d+,\d+)%\s+(-?\d+,\d+)%\s+(-?\d+,\d+)%", text)
        annual = lambda g, y: round(((1 + de(cumulative.group(g)) / 100) ** (1 / y) - 1) * 100, 2) if cumulative else ""
        aum = re.search(r"Fondsvolumen\s*:?\s*([\d.]+,\d+)\s*\(\s*Millionen\s*([A-Z]{3})", text)
        vol = re.search(r"Portfolio Volatilit\S+\s+(\d+,\d+)%\s*(\d+,\d+)%", text)
        te = re.search(r"Tracking Error[^\d]{0,12}(\d+,\d+)%\s*(\d+,\d+)%", text)
        vl = re.search(r"VL [^:\n]*:\s*([\d.]+,\d+)\s*([A-Z]{3})", text)
        rows.append({"etf_key": u["etf_key"], "fee_pct": fee_value, "fee_type": "ongoing" if fee_value != "" else "", "distribution": policy, "aum": de(aum.group(1)) * 1e6 if aum and aum.group(2) else "", "aum_currency": aum.group(2) if aum and aum.group(2) else "", "aum_as_of": "2026-09-30",
            "nav": de(vl.group(1)) if vl else "", "nav_currency": vl.group(2) if vl else "", "nav_as_of": "2026-09-30" if vl else "", "ret_1y": de(cumulative.group(4)) if cumulative else "", "ret_3y": annual(5, 3), "ret_5y": annual(6, 5), "ret_si": "", "ret_as_of": "2026-09-30" if cumulative else "", "volatility_3y": de(vol.group(2)) if vol else "", "tracking_error_3y": de(te.group(2)) if te else "", "source": "Amundi factsheet", "source_url": url})
        found += 1
    return {"wanted": len(wanted), "tried": min(limit, len(wanted)), "found": found, "no_factsheet": missing}

sample = os.environ.get("SAMPLE_ISINS")
if sample:
    import pdfplumber
    for isin in sample.split(","):
        blob = get(f"https://www.amundietf.de/pdfDocuments/monthly-factsheet/{isin}/DEU/DEU/INSTITUTIONNEL/ETF/20260930")
        with pdfplumber.open(io.BytesIO(blob)) as p:
            (OUT / "details" / f"sample_{isin}.txt").write_text("\n".join((pg.extract_text() or "") for pg in p.pages[:3]))
        time.sleep(1)
    raise SystemExit(0)

for name, fn in {"ssga_us": ssga_us, "amundi": amundi}.items():
    try:
        report[name] = {"ok": True, "result": fn()}
    except Exception as e:
        report[name] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:300]}
    print(name, report[name], flush=True)
with gzip.open(OUT / "details.csv.gz", "wt", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, FIELDS); w.writeheader(); w.writerows(rows)
report["fees"] = sum(1 for r in rows if r["fee_pct"] != ""); report["fund_size"] = sum(1 for r in rows if r["aum"] != ""); report["on"] = dt.date.today().isoformat()
(OUT / "details" / "report.json").write_text(json.dumps(report, indent=1))
