"""Shared by nport.py (SEC quarterly bulk data sets) and nport_live.py (each N-PORT filing as EDGAR publishes it)."""
import csv, gzip, io, re
from pathlib import Path

H = Path("data/holdings")
KEEP, MIN_WEIGHT = 150, 0.05  # holdings kept per fund, largest first, and the smallest weight kept
HOLD_HEADER = ["etf_key", "holding_key", "name", "ticker", "weight", "sector", "country", "asset_class"]
SUM_HEADER = ["etf_key", "as_of", "n_holdings", "kept", "covered_pct", "source", "source_url"]
SOURCE = "SEC N-PORT"

try:
    import pycountry
    COUNTRY = {c.alpha_2: getattr(c, "common_name", None) or c.name for c in pycountry.countries}
except ImportError:
    COUNTRY = {}
COUNTRY.update({"US": "United States", "GB": "United Kingdom", "KR": "Korea", "TW": "Taiwan", "RU": "Russia", "VN": "Vietnam", "IR": "Iran", "CZ": "Czech Republic", "HK": "Hong Kong", "MO": "Macau", "TR": "Turkey", "BO": "Bolivia", "VE": "Venezuela", "TZ": "Tanzania", "MD": "Moldova", "SY": "Syria", "LA": "Laos", "KP": "North Korea", "PS": "Palestine", "XX": ""})
ASSET = {"EC": "Equity", "EP": "Preferred equity", "DBT": "Fixed income", "ABS-MBS": "Fixed income", "ABS-ASBS": "Fixed income", "ABS-CBDO": "Fixed income", "ABS-O": "Fixed income",
         "LON": "Loan", "STIV": "Cash", "RF": "Fund", "RE": "Real estate", "COMM": "Commodity", "SN": "Structured note",
         "DCO": "Derivative", "DCR": "Derivative", "DE": "Derivative", "DFE": "Derivative", "DIR": "Derivative", "DO": "Derivative", "OTHER": "Other"}


# What a bond is, from the issuer type N-PORT reports for every position; used as its "sector".
DEBT = {"DBT", "ABS-MBS", "ABS-ASBS", "ABS-CBDO", "ABS-O", "LON", "SN"}
BOND_SECTOR = {"UST": "Government bonds", "USGA": "Government bonds", "USGSE": "Government bonds", "NUSS": "Government bonds",
               "MUN": "Municipal bonds", "CORP": "Corporate bonds"}


def bond_sector(asset, issuer):
    if asset in ("STIV",): return "Cash"
    if asset and asset.startswith("ABS"): return "Securitised"
    if asset in DEBT: return BOND_SECTOR.get(issuer or "", "")
    return ""


def holding_key(name):
    clean = re.sub(r"\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|PLC|LTD|LIMITED|SA|AG|NV|SE|ASA|AB|OYJ|SPA|HOLDINGS?|GROUP|CLASS|CL|ORD|REG|SHS|ADR|THE|AND|COM)\b", "", re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace(".COM", "COM")))
    return re.sub(r"[^A-Z0-9]", "", clean)[:22]


def fund_rows(key, positions):
    """Holdings rows for one ETF from one report's positions: same security merged, largest first, small ones dropped.
    positions: dicts with name, weight, country (code or name), asset (N-PORT category code), id."""
    merged = {}
    for p in positions:
        k = holding_key(p["name"]) or f"|{p['id']}"
        if k in merged: merged[k]["weight"] += p["weight"]
        else: merged[k] = dict(p, key=k)
    rows = sorted((h for h in merged.values() if h["weight"] > 0), key=lambda h: -h["weight"])
    kept = [h for h in rows if h["weight"] >= MIN_WEIGHT][:KEEP]
    out = [[key, h["key"], h["name"][:80], "", round(h["weight"], 4), bond_sector(h.get("asset"), h.get("issuer")),
            COUNTRY.get((h.get("country") or "").upper(), h.get("country") or "")[:40],
            ASSET.get(h.get("asset") or "", h.get("asset") or "")[:24]] for h in kept]
    return out, len(rows), round(sum(h["weight"] for h in kept), 2)


def read_sec_files():
    """The current SEC holdings files: {etf_key: summary row dict}, {etf_key: [holding rows]}."""
    summary, holdings = {}, {}
    if (H / "sec_summary.csv.gz").exists():
        summary = {r["etf_key"]: r for r in csv.DictReader(gzip.open(H / "sec_summary.csv.gz", "rt", encoding="utf-8"))}
    if (H / "sec_holdings.csv.gz").exists():
        for r in csv.reader(gzip.open(H / "sec_holdings.csv.gz", "rt", encoding="utf-8")):
            if r and r[0] != "etf_key": holdings.setdefault(r[0], []).append(r)
    return summary, holdings


def write_gz(path, header, rows):
    """A gzipped CSV with a fixed timestamp, so an unchanged file gives an unchanged commit."""
    buf = io.StringIO(); w = csv.writer(buf); w.writerow(header); w.writerows(rows)
    path.write_bytes(gzip.compress(buf.getvalue().encode("utf-8"), mtime=0))


def write_sec_files(summary, holdings):
    write_gz(H / "sec_holdings.csv.gz", HOLD_HEADER, (r for key in sorted(holdings) if key in summary for r in sorted(holdings[key])))
    write_gz(H / "sec_summary.csv.gz", SUM_HEADER, ([summary[key][c] for c in SUM_HEADER] for key in sorted(summary) if holdings.get(key)))
