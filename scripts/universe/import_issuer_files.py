#!/usr/bin/env python3
"""Reads product files the owner downloaded from issuers (not stored in this repository) and writes facts:
  data/universe/issuer_files.csv.gz     figures, keyed by ISIN or TICKER:<symbol>
  data/universe/issuer_identity.csv.gz  ISINs and tickers, merged into the universe by merge.py
Usage: python3 scripts/universe/import_issuer_files.py <folder> <retrieved date YYYY-MM-DD>
Files are recognised by their content. Later files never overwrite data already read for an ISIN."""
import csv, datetime as dt, glob, gzip, json, os, re, sys
import openpyxl, warnings
warnings.filterwarnings("ignore")

FOLDER, RETRIEVED = sys.argv[1], sys.argv[2]
FIELDS = ["lookup", "isin", "ticker", "name", "fee_pct", "fee_type", "fee_as_of", "aum", "aum_currency", "aum_level", "aum_as_of", "nav", "nav_currency", "nav_as_of", "ret_1y", "ret_3y", "ret_5y", "ret_si", "ret_as_of", "distribution", "frequency", "hedged", "replication", "domicile", "listed_on_six", "launch_date", "benchmark", "source", "source_url"]
out, identity, report = {}, {}, {}
COUNTRY = {"ireland": "IE", "irlande": "IE", "luxembourg": "LU", "germany": "DE", "allemagne": "DE", "switzerland": "CH", "suisse": "CH", "france": "FR", "jersey": "JE", "united states": "US"}
MIC = {"LN": "XLON", "GY": "XETR", "SW": "XSWX", "IM": "XMIL", "FP": "XPAR", "NA": "XAMS", "GR": "XETR", "SE": "XSWX"}

def rows(path):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    ws.reset_dimensions()
    return [list(r) for r in ws.iter_rows(values_only=True)]

def num(v):
    if isinstance(v, (int, float)): return float(v)
    m = re.search(r"-?\d[\d,]*\.?\d*", str(v or "").replace("−", "-"))
    return float(m.group(0).replace(",", "")) if m else ""

def day(v):
    if isinstance(v, dt.datetime): return v.date().isoformat()
    s = str(v or "").strip()
    for f in ("%d %b %Y", "%d.%m.%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try: return dt.datetime.strptime(s[:11].strip(), f).date().isoformat()
        except ValueError: pass
    return ""

def annual(values, years):
    """Annualises the last `years` yearly returns, only when all are present."""
    vals = [num(v) for v in values[-years:]]
    if len(vals) < years or "" in vals: return ""
    total = 1.0
    for v in vals: total *= 1 + v / 100
    return round((total ** (1 / years) - 1) * 100, 4)

def add(lookup, **f):
    if lookup in out: return False
    fee = f.get("fee_pct", "")
    if fee != "": f["fee_as_of"] = RETRIEVED
    if fee != "" and not 0 <= fee <= 5: f["fee_pct"], f["fee_type"] = "", ""
    out[lookup] = {**dict.fromkeys(FIELDS, ""), "lookup": lookup, **f}
    return True

def identify(isin, ticker, mic, name, currency):
    identity.setdefault((isin, mic), {"isin": isin, "ticker": ticker, "mic": mic, "name": name, "currency": currency, "cfi": "", "issuer_lei": "", "market": "issuer"})

def invesco_eu(R, name):
    count = 0
    for r in R[8:]:
        if len(r) < 60 or not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}\d", str(r[3] or "")) or r[5] not in ("ETF", "ETC", "ETP"): continue
        ticker, _, suffix = str(r[8] or "").partition(" ")
        aum = num(r[30]); ccy = r[20]
        if aum == "": aum, ccy = num(r[32]), "EUR"
        fee = num(r[13])
        div = str(r[18] or "")
        count += add(r[3], isin=r[3], ticker=ticker, name=r[2], fee_pct=round(fee * 100, 4) if fee != "" else "", fee_type="ocf" if fee != "" else "", aum=aum, aum_currency=ccy if aum != "" else "", aum_level="share_class", aum_as_of=day(r[1]),
            nav=num(r[27]), nav_currency=r[20], nav_as_of=day(r[1]), distribution="accumulating" if div == "Reinvested" else "distributing" if div in ("Monthly", "Quarterly", "Semi-annual") else "", frequency={"Monthly": "monthly", "Quarterly": "quarterly", "Semi-annual": "semi_annual"}.get(div, ""),
            hedged="t" if r[19] == "Yes" else "f" if r[19] == "No" else "", replication={"Physical": "physical", "Synthetic": "synthetic_swap"}.get(r[17], ""), domicile=COUNTRY.get(str(r[21]).lower(), ""), listed_on_six="t" if str(r[52]) not in ("-", "None") or str(r[54]) not in ("-", "None") else "",
            launch_date=day(r[22]), benchmark=r[7] if r[7] != "-" else "", source="Invesco product file", source_url="https://www.invesco.com/uk/en/financial-products/etfs.html")
        identify(r[3], ticker, MIC.get(suffix, ""), r[2], r[20])
    return count

def invesco_us(R, name):
    count = 0
    for r in R[7:]:
        if len(r) < 37 or not re.fullmatch(r"[A-Z.]{1,6}", str(r[1] or "")): continue
        count += add(f"TICKER:{r[1]}", ticker=r[1], name=r[0], fee_pct=num(r[32]), fee_type="ter", nav=num(r[33]), nav_currency="USD", nav_as_of=day(r[36]), ret_1y=num(r[6]) if r[6] != "--" else "", ret_3y=num(r[7]) if r[7] != "--" else "", ret_5y=num(r[8]) if r[8] != "--" else "", ret_si=num(r[10]) if r[10] != "--" else "", ret_as_of=day(r[4]), launch_date=day(r[2]), source="Invesco US product file", source_url="https://www.invesco.com/us/financial-products/etfs/performance")
    return count

def xtrackers_eu(R, name):
    head = [str(c or "") for c in R[6]]
    currency = next((re.search(r"\((\w{3})\)", h).group(1) for h in head if re.match(r"(AuM|Actifs)", h)), "")
    count = 0
    for r in R[7:]:
        if len(r) < 18 or not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}\d", str(r[2] or "")): continue
        yearly = r[10:15]
        policy = {"capitalizing": "accumulating", "distributing": "distributing", "capitalisation": "accumulating", "distribution": "distributing"}.get(str(r[8] or "").lower(), "")
        aum = num(r[6])
        count += add(r[2], isin=r[2], name=r[1], fee_pct=num(r[4]), fee_type="ter" if num(r[4]) != "" else "", aum=aum, aum_currency=currency if aum != "" else "", aum_level="fund", aum_as_of=day(r[17]), nav_currency=r[5], ret_1y=num(yearly[-1]) if yearly[-1] is not None else "", ret_3y=annual(yearly, 3), ret_5y=annual(yearly, 5), ret_as_of="2026-10-31" if yearly[-1] is not None else "", distribution=policy, launch_date=day(r[9]), source="Xtrackers product file", source_url="https://etf.dws.com/")
        identify(r[2], "", "", r[1], r[5])
    return count

def xtrackers_us(R, name):
    count = 0
    for r in R[7:]:
        if len(r) < 13 or not r[2]: continue
        size = num(r[12])
        count += add(f"TICKER:{r[2]}", ticker=r[2], name=r[1], fee_pct=num(r[11]), fee_type="net", nav_currency="USD", aum=size, aum_currency="USD" if size != "" else "", aum_level="fund", ret_1y=num(r[5]) if r[5] is not None else "", ret_5y=num(r[6]) if r[6] is not None else "", launch_date=day(r[9]), source="Xtrackers US product file", source_url="https://www.xtrackers.com/us/en/etfs/")
    return count

def vanguard_eu(R, name):
    count = 0
    for r in R[5:]:
        if len(r) < 36 or not r[0] or "ETF" not in str(r[0]) or not r[30]: continue
        nav = num(r[3])
        symbol = str(r[3] or "")[:1]
        yearly = r[13:23]
        fee = num(r[2])
        title = str(r[0]); dist = "Accumulating" in title or "(USD) A" in title
        freq = {"Quarterly": "quarterly", "Monthly": "monthly"}.get(r[23], "")
        policy = "distributing" if (freq or "Distributing" in title) else "accumulating" if dist else ""
        last = yearly[-1] if str(yearly[-1]) != "-" else ""
        clean = [None if str(v) == "-" else v for v in yearly]
        count += add(r[30], isin=r[30], ticker=str(r[35] or ""), name=f"Vanguard {title}", fee_pct=fee, fee_type="ocf_ter" if fee != "" else "", nav=nav, nav_currency={"$": "USD", "€": "EUR", "£": "GBP"}.get(symbol, r[1]), nav_as_of=day(r[4]), ret_1y=num(last) if last != "" else "", ret_3y=annual(clean, 3) if None not in clean[-3:] else "", ret_5y=annual(clean, 5) if None not in clean[-5:] else "", ret_as_of="2026-10-31" if last != "" else "", distribution=policy, frequency=freq, source="Vanguard product file", source_url="https://www.vanguard.co.uk/professional/product")
        identify(r[30], str(r[35] or ""), "", f"Vanguard {title}", r[1])
    return count

def vanguard_us(path):
    lines = open(path, encoding="utf-8-sig").read().splitlines()
    head = next(i for i, l in enumerate(lines) if l.startswith("Fund name"))
    count = 0
    for r in csv.reader(lines[head + 1:]):
        if len(r) < 13 or not re.fullmatch(r"[A-Z]{2,5}", r[1]): continue
        pct = lambda v: num(v) if "%" in v else ""
        si = re.match(r"(-?[\d.]+)% \((.+)\)", r[7])
        count += add(f"TICKER:{r[1]}", ticker=r[1], name=f"Vanguard {r[0].replace(' (NEW FUND)', '')}", fee_pct=pct(r[8]), fee_type="ter", nav_currency="USD", ret_1y=pct(r[3]), ret_3y=pct(r[4]), ret_5y=pct(r[5]), ret_si=float(si.group(1)) if si else "", ret_as_of="2026-10-31", launch_date=day(si.group(2)) if si else "", benchmark=r[12], source="Vanguard US product file", source_url="https://investor.vanguard.com/investment-products/list/etfs")
    return count

def ubs(R, name):
    count = 0
    REP = {"Physique (Réplication totale)": "physical_full", "Physique + optimisée (actions) / échantillonnage (obligations)": "physical_sampling"}
    for r in R[5:]:
        if len(r) < 32 or not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}\d", str(r[24] or "")): continue
        first = str(r[25] or "").split(",")[0].strip()
        ticker, _, suffix = first.partition(" ")
        size = num(r[11])
        rep = REP.get(r[19], "synthetic_swap" if str(r[19]).startswith("Swap") else "")
        count += add(r[24], isin=r[24], ticker=ticker, name=r[3], fee_pct=num(r[15]) if num(r[15]) != "" else num(r[14]), fee_type="ter" if num(r[15]) != "" else "flat_fee", aum=size * 1e6 if size != "" else "", aum_currency=r[10] if size != "" else "", aum_level="share_class", nav=num(r[12]), nav_currency=r[10], distribution={"Oui": "distributing", "Non": "accumulating"}.get(r[30], ""), domicile=COUNTRY.get(str(r[4]).lower(), ""), replication=rep, listed_on_six="t" if "SIX Swiss" in str(r[17]) else "", launch_date=day(r[16]), benchmark=r[20] or "", source="UBS product file", source_url="https://www.ubs.com/etf")
        identify(r[24], ticker, MIC.get(suffix, ""), r[3], r[10])
    return count

# Xtrackers files are read with the euro version first, so sizes share a currency where possible.
def sort_key(path):
    return (0 if "AllProductData_3" in path else 1, path)

for path in sorted(glob.glob(os.path.join(FOLDER, "*")), key=sort_key):
    base = os.path.basename(path)
    try:
        if path.endswith(".csv"):
            kind, n = "vanguard_us", vanguard_us(path)
        elif path.endswith(".xlsx"):
            R = rows(path)
            text = " ".join(str(c) for r in R[:9] for c in r if c)
            if "Xtrackers" in text and "Ticker" in text: kind, n = "xtrackers_us", xtrackers_us(R, base)
            elif "Xtrackers" in text: kind, n = "xtrackers_eu", xtrackers_eu(R, base)
            elif "Funds and share class" in text: kind, n = "vanguard_eu", vanguard_eu(R, base)
            elif "UBS Exchange Traded" in text: kind, n = "ubs", ubs(R, base)
            elif "Effective Date" in text: kind, n = "invesco_us", invesco_us(R, base)
            elif "Spreadsheet created" in text: kind, n = "invesco_eu", invesco_eu(R, base)
            else: kind, n = "unknown", 0
        else:
            continue
        report[base[9:]] = {"kind": kind, "new_rows": n}
    except Exception as e:
        report[base[9:]] = {"error": f"{type(e).__name__}: {e}"[:200]}
    print(base, report[base[9:]], flush=True)

with gzip.open("data/universe/issuer_files.csv.gz", "wt", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, FIELDS); w.writeheader(); w.writerows(sorted(out.values(), key=lambda r: r["lookup"]))
with gzip.open("data/universe/issuer_identity.csv.gz", "wt", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, ["isin", "ticker", "mic", "name", "currency", "cfi", "issuer_lei", "market"]); w.writeheader(); w.writerows(identity.values())
json.dump({"retrieved_on": RETRIEVED, "files": report, "rows": len(out)}, open("data/universe/details/issuer_files_report.json", "w"), indent=1)
