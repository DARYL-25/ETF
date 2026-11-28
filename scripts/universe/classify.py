#!/usr/bin/env python3
"""Gives every holding a sector, so sector exposure can be computed wherever we have holdings.

Most holdings files carry a country but no sector (SEC N-PORT, Shanghai, several issuers). This fills the gap:

  1. Sector labels are normalised to the 11 GICS sectors, plus bond types (Government, Corporate, Municipal
     bonds, Securitised) and Cash, so funds from different issuers add up in a portfolio.
  2. A company -> sector map is built from
     - the GICS sectors issuers print in their own holdings files (preferred), and
     - SEC EDGAR: each company's Standard Industrial Classification (SIC) code, from the SEC's financial statement
       data sets (public domain, every US filer and foreign issuers filing 20-F or 40-F), mapped to the nearest
       GICS sector by our own table below. Companies are matched on a normalised name.
  3. Holdings without a sector get the mapped one. Nothing already set by the source is changed except its label.

The SEC map is cached in data/universe/company_sectors.csv.gz and rebuilt when older than 30 days. Reads
SEC_CONTACT_EMAIL for the SEC's fair-access rule; without it the cached map is used as is. Report:
data/holdings/classify_report.json."""
import csv, datetime as dt, gzip, io, json, os, sys, time, urllib.request, zipfile
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nport_common import H, holding_key

U = Path("data/universe")
MAP = U / "company_sectors.csv.gz"
report = {"on": dt.date.today().isoformat()}

# Issuer sector labels (GICS, ICB, FTSE and others) -> GICS sector.
GICS = ["Communication Services", "Consumer Discretionary", "Consumer Staples", "Energy", "Financials", "Health Care",
        "Industrials", "Information Technology", "Materials", "Real Estate", "Utilities"]
ALIASES = {
    "technology": "Information Technology", "information technology": "Information Technology", "it": "Information Technology",
    "software and computer services": "Information Technology", "technology hardware and equipment": "Information Technology",
    "semiconductors": "Information Technology", "telecommunications": "Communication Services", "telecommunication services": "Communication Services",
    "communication": "Communication Services", "communications": "Communication Services", "media": "Communication Services",
    "basic materials": "Materials", "chemicals": "Materials", "basic resources": "Materials", "construction and materials": "Industrials",
    "industrial engineering": "Industrials", "industrial support services": "Industrials", "general industrials": "Industrials",
    "electronic and electrical equipment": "Industrials", "aerospace and defense": "Industrials", "industrial transportation": "Industrials",
    "consumer cyclical": "Consumer Discretionary", "consumer cyclicals": "Consumer Discretionary", "consumer services": "Consumer Discretionary",
    "retail": "Consumer Discretionary", "retailers": "Consumer Discretionary", "travel and leisure": "Consumer Discretionary",
    "personal goods": "Consumer Discretionary", "automobiles and parts": "Consumer Discretionary", "hotels": "Consumer Discretionary",
    "consumer defensive": "Consumer Staples", "consumer non-cyclicals": "Consumer Staples", "food producers": "Consumer Staples",
    "beverages": "Consumer Staples", "tobacco": "Consumer Staples", "personal care, drug and grocery stores": "Consumer Staples",
    "healthcare": "Health Care", "health care": "Health Care", "pharmaceuticals and biotechnology": "Health Care",
    "medical equipment and services": "Health Care", "banks": "Financials", "insurance": "Financials", "financial services": "Financials",
    "financial": "Financials", "investment banking and brokerage service": "Financials", "investment banking and brokerage services": "Financials",
    "closed end investments": "Financials", "real estate investment trusts": "Real Estate", "real estate investment and services": "Real Estate",
    "reit": "Real Estate", "reits": "Real Estate", "reoc": "Real Estate", "office reit": "Real Estate", "industrial reit": "Real Estate",
    "residential": "Real Estate", "diversified reit": "Real Estate", "retail reit": "Real Estate", "oil and gas": "Energy",
    "gas, water and multi-utilities": "Utilities", "electricity": "Utilities", "utility": "Utilities",
    "cash": "Cash", "cash and/or derivatives": "Cash", "money market": "Cash",
}
KEEP = set(GICS) | {"Government bonds", "Corporate bonds", "Municipal bonds", "Securitised", "Cash"}


def normalise(label):
    if not label or label in ("-", "Unassigned", "Other", "N/A"): return label
    for g in KEEP:
        if label.lower() == g.lower(): return g
    return ALIASES.get(label.strip().lower(), label)


def sic_sector(sic):
    """Nearest GICS sector for a SIC code. Our own mapping; approximate at the edges (e.g. internet companies
    under 7370 read as Information Technology, where GICS puts some in Communication Services)."""
    if not sic: return ""
    s = int(sic)
    if s < 1000: return "Consumer Staples"
    if 1000 <= s < 1100 or 1400 <= s < 1500: return "Materials"
    if 1200 <= s < 1400 or 2900 <= s < 3000: return "Energy"
    if 1500 <= s < 1800: return "Industrials"
    if 2000 <= s < 2200: return "Consumer Staples"
    if 2200 <= s < 2400 or 2500 <= s < 2600 or 3100 <= s < 3200 or 3900 <= s < 4000: return "Consumer Discretionary"
    if 2400 <= s < 2500 or 2600 <= s < 2700: return "Materials"
    if 2700 <= s < 2800: return "Communication Services"
    if 2800 <= s < 2900:
        if 2833 <= s <= 2836: return "Health Care"
        if 2840 <= s <= 2844: return "Consumer Staples"
        return "Materials"
    if 3000 <= s < 3100 or 3200 <= s < 3400: return "Materials"
    if 3400 <= s < 3500: return "Industrials"
    if 3500 <= s < 3600: return "Information Technology" if 3570 <= s <= 3579 else "Industrials"
    if 3600 <= s < 3700:
        if s < 3630: return "Industrials"
        if s < 3660: return "Consumer Discretionary"
        return "Information Technology"
    if 3700 <= s < 3800: return "Consumer Discretionary" if 3710 <= s <= 3716 or 3750 <= s <= 3759 else "Industrials"
    if 3800 <= s < 3900:
        if 3840 <= s <= 3851: return "Health Care"
        if s == 3812: return "Industrials"
        if s == 3873: return "Consumer Discretionary"
        return "Information Technology"
    if 4000 <= s < 4800: return "Industrials"
    if 4800 <= s < 4900: return "Communication Services"
    if 4900 <= s < 5000: return "Industrials" if 4950 <= s <= 4959 else "Utilities"
    if 5000 <= s < 5200:
        if s == 5122: return "Health Care"
        if 5140 <= s <= 5149 or 5180 <= s <= 5182: return "Consumer Staples"
        if 5171 <= s <= 5172: return "Energy"
        return "Industrials"
    if 5200 <= s < 6000: return "Consumer Staples" if 5400 <= s < 5500 or s in (5912, 5331, 5399) else "Consumer Discretionary"
    if 6000 <= s < 7000: return "Real Estate" if 6500 <= s < 6600 or s == 6798 else "Financials"
    if 7000 <= s < 7100 or 7200 <= s < 7300 or 7500 <= s < 7600 or 7900 <= s < 8000 or 8200 <= s < 8300: return "Consumer Discretionary"
    if 7310 <= s <= 7319 or 7800 <= s < 7900: return "Communication Services"
    if 7370 <= s <= 7379: return "Information Technology"
    if 8000 <= s < 8100 or s == 8731: return "Health Care"
    if 7000 <= s < 9000: return "Industrials"
    return ""


def read(path):
    with gzip.open(path, "rt", encoding="utf-8") as fh: return list(csv.reader(fh))


def write(path, rows):
    buf = io.StringIO(); csv.writer(buf).writerows(rows)
    path.write_bytes(gzip.compress(buf.getvalue().encode("utf-8"), mtime=0))


# 1. The SEC company map, rebuilt monthly.
def build_sec_map():
    contact = os.environ.get("SEC_CONTACT_EMAIL")
    if not contact: return None
    ua = {"User-Agent": f"ETF Intelligence {contact}"}
    today = dt.date.today()
    quarters = []
    y, q = today.year, (today.month - 1) // 3 + 1
    for _ in range(6):  # the newest data set can lag a quarter; read back far enough for four
        q -= 1
        if q == 0: y, q = y - 1, 4
        quarters.append(f"{y}q{q}")
    names, sics, read_q = {}, {}, []
    for qt in quarters:
        if len(read_q) == 4: break
        url = f"https://www.sec.gov/files/dera/data/financial-statement-data-sets/{qt}.zip"
        try:
            time.sleep(1)
            with urllib.request.urlopen(urllib.request.Request(url, headers=ua), timeout=600) as r: blob = r.read()
        except Exception as e:
            report.setdefault("sec_errors", []).append(f"{qt}: {type(e).__name__}: {e}"[:160]); continue
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            for row in csv.DictReader(io.TextIOWrapper(z.open("sub.txt"), "utf-8", errors="replace"), delimiter="\t"):
                if row.get("sic"): sics[row["cik"]] = row["sic"]; names.setdefault(row["cik"], set()).add(row["name"])
        read_q.append(qt)
    try:  # the names companies trade under, as alternative spellings
        time.sleep(1)
        with urllib.request.urlopen(urllib.request.Request("https://www.sec.gov/files/company_tickers.json", headers=ua), timeout=120) as r:
            for v in json.loads(r.read()).values():
                cik = str(v["cik_str"])
                if cik in sics: names.setdefault(cik, set()).add(v["title"])
    except Exception as e:
        report.setdefault("sec_errors", []).append(f"company_tickers: {e}"[:160])
    rows, seen = [["name_key", "sector", "sic", "cik"]], set()
    for cik, sic in sics.items():
        sector = sic_sector(sic)
        if not sector: continue
        for n in names.get(cik, ()):
            k = holding_key(n)
            if len(k) >= 4 and k not in seen: seen.add(k); rows.append([k, sector, sic, cik])
    report.update({"sec_quarters": read_q, "sec_companies": len(sics), "sec_name_keys": len(rows) - 1})
    return rows if read_q else None


fresh = MAP.exists() and (time.time() - MAP.stat().st_mtime) < 30 * 86400 and not os.environ.get("REBUILD_SECTORS")
if not fresh:
    rows = build_sec_map()
    if rows: write(MAP, rows)
sec_map = {r[0]: r[1] for r in read(MAP)[1:]} if MAP.exists() else {}

# 2. Issuer GICS sectors by company, from every holdings file that has them: the most common label wins.
files = [p for p in (H / "holdings.csv.gz", H / "sec_holdings.csv.gz", H / "factsheet_holdings.csv.gz") if p.exists()]
tables = {p: read(p) for p in files}
votes = defaultdict(Counter)
for p, rows in tables.items():
    head = rows[0]; ki, si = head.index("holding_key"), head.index("sector")
    for r in rows[1:]:
        lab = normalise(r[si])
        if lab in GICS: votes[r[ki]][lab] += 1
issuer_map = {k: c.most_common(1)[0][0] for k, c in votes.items()}

# 3. Fill and normalise.
stats = {}
for p, rows in tables.items():
    head = rows[0]; ki, si, wi = head.index("holding_key"), head.index("sector"), head.index("weight")
    ai = head.index("asset_class") if "asset_class" in head else None
    w = Counter()
    for r in rows[1:]:
        try: wt = float(r[wi] or 0)
        except ValueError: wt = 0
        w["all"] += wt
        before = r[si]
        r[si] = normalise(r[si]) or ""
        if not r[si] or r[si] in ("-", "Unassigned", "Other"):
            asset = r[ai] if ai is not None else ""
            if asset in ("", "Equity", "Preferred equity", "Real estate"):
                found = issuer_map.get(r[ki]) or sec_map.get(r[ki])
                if found: r[si] = found; w["filled_issuer" if r[ki] in issuer_map else "filled_sec"] += wt
        if r[si] and r[si] not in ("-", "Unassigned", "Other"): w["with_sector"] += wt
        if before != r[si] and before: w["relabelled"] += wt
    write(p, rows)
    stats[p.name] = {k: round(100 * v / w["all"], 1) for k, v in w.items() if k != "all"} if w["all"] else {}
report.update({"issuer_companies": len(issuer_map), "sec_map_entries": len(sec_map), "share_of_weight_pct": stats})
(H / "classify_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:2000])
