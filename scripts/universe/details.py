#!/usr/bin/env python3
"""Adds issuer-published fees, fund size, NAV and returns to basic records.
Uses an honest client name and one request at a time. A refusal is recorded and accepted, never retried.
Writes data/universe/details.csv.gz, keyed by the etf_key in universe.csv.gz."""
import csv, datetime as dt, gzip, io, json, os, re, time, urllib.error, urllib.request
from pathlib import Path

OUT = Path("data/universe"); (OUT / "details").mkdir(parents=True, exist_ok=True)
UA = "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"
FIELDS = ["etf_key", "fee_pct", "fee_type", "aum", "aum_currency", "aum_as_of", "nav", "nav_currency", "nav_as_of", "ret_1y", "ret_3y", "ret_5y", "ret_si", "ret_as_of", "volatility_3y", "tracking_error_3y", "distribution", "source", "source_url", "name"]

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

def ishares():
    """iShares' public product list, the same data its own product page loads."""
    by_isin = {r["isin"]: r for r in universe if r["isin"]}
    by_ticker = {r["ticker"]: r for r in universe if r["source"] == "us" and r["ticker"]}
    val = lambda x: x["r"] if isinstance(x, dict) and isinstance(x.get("r"), (int, float)) else ""
    day = lambda x: (lambda d: f"{str(d)[:4]}-{str(d)[4:6]}-{str(d)[6:8]}" if d else "")(val(x))
    result = {}
    done = set()
    for label, query, site in (("uk", "country=gb&language=en&siteName=ishares-uk&userType=individual", "https://www.ishares.com"), ("us", "country=us&language=en&siteName=ishares&userType=individual", "https://www.ishares.com")):
        try:
            time.sleep(2)
            data = json.loads(get(f"{site}/varnish-api/blk-product-screener-server/api/v1/product-screener/product-data?{query}"))
        except Exception as e:
            result[label] = f"{type(e).__name__}: {e}"[:150]
            continue
        funds = [f for f in data.values() if "etf" in (f.get("productView") or [])]
        unmatched = []
        for f in funds:
            u = by_isin.get(f.get("isin")) or by_ticker.get(f.get("localExchangeTicker"))
            if not u:
                unmatched.append(f.get("isin"))
                continue
            if u["etf_key"] in done: continue
            done.add(u["etf_key"])
            fee, kind = val(f.get("ter")), "ter"
            # Share class assets in the class's own currency. totalFundSizeInMillions is in the fund's base
            # currency, which this list does not state, so pairing it with the class currency is wrong.
            size = val(f.get("totalNetAssets"))
            name = (f.get("fundName") or "").strip()
            if f.get("investorClassName") and f["investorClassName"] != "-" and name: name = f'{name} {f["investorClassName"]}'.strip()
            name = f'{name} {f.get("seriesBaseCurrencyCode", "")} ({f.get("useOfProfits", "")[:4]})' if name and f.get("useOfProfits") else name
            policy = {"Accumulating": "accumulating", "Distributing": "distributing"}.get(f.get("useOfProfits"), "")
            rows.append({"etf_key": u["etf_key"], "fee_pct": fee, "fee_type": kind if fee != "" else "", "name": name, "aum": size if size != "" else "", "aum_currency": f.get("seriesBaseCurrencyCode", "") if size != "" else "", "aum_as_of": day(f.get("navAmountAsOf")),
                "nav": val(f.get("navAmount")), "nav_currency": f.get("seriesBaseCurrencyCode", ""), "nav_as_of": day(f.get("navAmountAsOf")), "ret_1y": val(f.get("navOneYearAnnualized")), "ret_3y": val(f.get("navThreeYearAnnualized")), "ret_5y": val(f.get("navFiveYearAnnualized")), "ret_si": val(f.get("navSinceInceptionAnnualized")), "ret_as_of": day(f.get("navAnnualisedAsOf")),
                "volatility_3y": "", "tracking_error_3y": "", "distribution": policy, "source": "iShares", "source_url": site + f.get("productPageUrl", "")})
        result[label] = {"etfs": len(funds), "unmatched": len(unmatched), "unmatched_sample": unmatched[:8]}
    if not done: raise RuntimeError(str(result))
    return result

def sheet_rows(blob):
    """Rows of the first sheet, starting at the header row that names ISIN."""
    import openpyxl
    book = openpyxl.load_workbook(io.BytesIO(blob), read_only=True, data_only=True)
    out = {}
    for sheet in book.worksheets:
        sheet.reset_dimensions()
        rows = [list(r) for r in sheet.iter_rows(values_only=True)]
        for i, r in enumerate(rows[:40]):
            cells = [str(c or "").strip() for c in r]
            if any(c.upper().startswith("ISIN") or c.upper() == "NAME / ISIN" for c in cells):
                return cells, rows[i + 1:], sheet.title
        out[sheet.title] = [[str(c)[:30] for c in r if c is not None][:8] for r in rows[:6]]
    raise RuntimeError(f"No ISIN header: {json.dumps(out)[:700]}")

def from_sheet(url, source, label):
    head, body, title = sheet_rows(get(url))
    (OUT / "details" / f"{label}_sample.json").write_text(json.dumps({"sheet": title, "head": head, "first": [str(c) for c in (body[0] if body else [])]}, indent=0)[:4000])
    col = lambda pat: next((i for i, h in enumerate(head) if re.search(pat, h, re.I)), None)
    isin_c, fee_c, aum_c, income_c, name_c = col(r"isin"), col(r"\bTER\b|expense ratio|all.in"), col(r"\bAUM\b|assets under|fund size|net assets"), col(r"distribution|use of income|income"), col(r"^name|fund name|product")
    by_isin = {r["isin"]: r for r in universe if r["isin"]}
    found = unmatched = 0
    for r in body:
        m = re.search(r"\b[A-Z]{2}[A-Z0-9]{9}\d\b", str(r[isin_c] or ""))
        if not m: continue
        u = by_isin.get(m.group(0))
        if not u:
            unmatched += 1
            continue
        fee = r[fee_c] if fee_c is not None else ""
        if isinstance(fee, str):
            f = re.search(r"\d+\.?\d*", fee); fee = float(f.group(0)) if f else ""
        if isinstance(fee, (int, float)) and fee < 0.03: fee = fee * 100  # stored as a fraction
        policy = str(r[income_c] or "").lower() if income_c is not None else ""
        policy = "accumulating" if policy.startswith(("acc", "capital")) else "distributing" if policy.startswith(("dis", "inc")) else ""
        rows.append({"etf_key": u["etf_key"], "fee_pct": fee if isinstance(fee, (int, float)) else "", "fee_type": "ter" if fee != "" else "", "distribution": policy, "source": source, "source_url": url,
            "aum": "", "aum_currency": "", "aum_as_of": "", "nav": "", "nav_currency": "", "nav_as_of": "", "ret_1y": "", "ret_3y": "", "ret_5y": "", "ret_si": "", "ret_as_of": "", "volatility_3y": "", "tracking_error_3y": "", "name": str(r[name_c]).split("\n")[0].strip() if name_c is not None and r[name_c] else ""})
        found += 1
    return {"found": found, "not_in_universe": unmatched, "head": head[:25]}

def xtrackers():
    return from_sheet("https://etf.dws.com/en-gb/product-finder/downloadxls/?query=%7B%22selectedTabIndex%22%3A0%2C%22totalReturnType%22%3A0%2C%22searchTerm%22%3A%22%22%2C%22filters%22%3A%5B%5D%7D", "Xtrackers", "xtrackers")

def spdr_eu():
    return from_sheet("https://www.ssga.com/library-content/products/fund-data/etfs/emea/spdr-product-data-ie-en.xlsx", "State Street Europe", "spdr_eu")

SOURCE_FUNCS = {"ssga_us": ssga_us, "amundi": amundi, "ishares": ishares, "xtrackers": xtrackers, "spdr_eu": spdr_eu}
chosen = os.environ.get("SOURCES", "").split(",") if os.environ.get("SOURCES") else list(SOURCE_FUNCS)
LABEL = {"ssga_us": "State Street", "amundi": "Amundi factsheet", "ishares": "iShares", "xtrackers": "Xtrackers", "spdr_eu": "State Street Europe"}
old_report = OUT / "details" / "report.json"
if old_report.exists():
    report.update({k: v for k, v in json.loads(old_report.read_text()).items() if k in SOURCE_FUNCS})
# Keep other sources' rows when only some sources are refreshed.
if (OUT / "details.csv.gz").exists():
    refreshed = {LABEL[c] for c in chosen}
    rows.extend(r for r in csv.DictReader(gzip.open(OUT / "details.csv.gz", "rt", encoding="utf-8")) if r["source"] not in refreshed)
for name, fn in {k: SOURCE_FUNCS[k] for k in chosen}.items():
    try:
        report[name] = {"ok": True, "result": fn()}
    except Exception as e:
        report[name] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:300]}
    print(name, report[name], flush=True)
with gzip.open(OUT / "details.csv.gz", "wt", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, FIELDS, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
report["fees"] = sum(1 for r in rows if r["fee_pct"] != ""); report["fund_size"] = sum(1 for r in rows if r["aum"] != ""); report["on"] = dt.date.today().isoformat()
(OUT / "details" / "report.json").write_text(json.dumps(report, indent=1))
