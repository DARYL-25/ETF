#!/usr/bin/env python3
"""Full holdings for ETFs whose issuer publishes them as a file: iShares (UCITS and US) and State Street (US).
Writes data/holdings/holdings.csv.gz (one row per ETF and holding) and summary.csv.gz (one row per ETF).
Holdings under 0.02% of the fund are dropped and at most 800 are kept per fund, largest first; the summary
records how many the fund has and what share of it the kept rows cover. One request at a time."""
import csv, datetime as dt, gzip, io, json, os, re, time, urllib.error, urllib.request
from pathlib import Path

UA = {"User-Agent": "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"}
U, H = Path("data/universe"), Path("data/holdings")
H.mkdir(parents=True, exist_ok=True)
LIMIT = int(os.environ.get("HOLDINGS_LIMIT", "5000"))
PROBE = os.environ.get("PROBE") == "1"
universe = list(csv.DictReader(gzip.open(U / "universe.csv.gz", "rt", encoding="utf-8")))
by_isin = {r["isin"]: r for r in universe if r["isin"]}
by_us_ticker = {r["ticker"]: r for r in universe if r["ticker"] and r["source"] == "us"}
report, probe = {"on": dt.date.today().isoformat()}, {}
holdings, summary = {}, {}

def get(url, timeout=60, referer=None):
    headers = {**UA, "Accept": "text/csv,application/json,*/*"}
    if referer: headers["Referer"] = referer
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if PROBE and "error_body" not in probe: probe["error_body"] = {"url": url, "code": e.code, "headers": dict(e.headers.items()), "body": (lambda b: (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b)[:600].decode("utf-8", "replace"))(e.read())}
        raise

def num(v):
    try: return float(str(v).replace(",", "").replace("%", "").strip())
    except ValueError: return None

SUFFIX = re.compile(r"\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|PLC|LTD|LIMITED|SA|AG|NV|SE|ASA|AB|OYJ|SPA|HOLDINGS?|GROUP|CLASS|CL|ORD|REG|SHS|ADR|THE|AND|COM)\b")
def holding_key(isin, ticker, name):
    """One key for a security whichever issuer reports it: the cleaned start of its name. Issuers identify
    holdings differently (ISIN in Europe, ticker and CUSIP in the US), and the name is what they share.
    Two securities whose cleaned names start alike would merge, which is rare among a fund's holdings."""
    clean = re.sub(r"[^A-Z0-9]", "", SUFFIX.sub("", re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace(".COM", "COM"))))
    return clean[:22] or (isin or ticker or "?")

def store(key, as_of, rows, source, url):
    rows = [r for r in rows if r["weight"] is not None and r["weight"] > 0]
    if len(rows) < 1: return False
    rows.sort(key=lambda r: -r["weight"])
    total = sum(r["weight"] for r in rows)
    if not 50 <= total <= 250: return False  # Not a weights column, or a leveraged fund's notional view.
    kept = [r for r in rows if r["weight"] >= 0.02][:800]
    merged = {}
    for r in kept:
        k = holding_key(r.get("isin", ""), r.get("ticker", ""), r["name"])
        if k in merged: merged[k]["weight"] += r["weight"]
        else: merged[k] = {"etf_key": key, "holding_key": k, "name": r["name"][:80], "ticker": (r.get("ticker") or "")[:16], "weight": r["weight"], "sector": r.get("sector", "")[:40], "country": r.get("country", "")[:40], "asset_class": r.get("asset_class", "")[:24]}
    holdings[key] = [{**m, "weight": round(m["weight"], 4)} for m in merged.values()]
    summary[key] = {"etf_key": key, "as_of": as_of, "n_holdings": len(rows), "kept": len(merged), "covered_pct": round(sum(m["weight"] for m in merged.values()), 2), "source": source, "source_url": url}
    return True

def parse_date(s):
    for f in ("%d/%b/%Y", "%b %d, %Y", "%d-%b-%Y", "%Y-%m-%d", "%d %b %Y", "%m/%d/%Y"):
        try: return dt.datetime.strptime(s.strip().strip('"'), f).date().isoformat()
        except ValueError: pass
    return ""

def ishares():
    """Not run. The holdings file answers \"Unknown site\" unless the request carries the site's entry cookies,
    which are set when a visitor accepts its terms. We do not accept terms on a visitor's behalf."""
    ok = failed = 0
    for label, query in (("uk", "country=gb&language=en&siteName=ishares-uk&userType=individual"), ("us", "country=us&language=en&siteName=ishares&userType=individual")):
        try:
            data = json.loads(get(f"https://www.ishares.com/varnish-api/blk-product-screener-server/api/v1/product-screener/product-data?{query}"))
        except Exception as e:
            report[f"ishares_{label}"] = f"{type(e).__name__}: {e}"[:150]; continue
        funds = [f for f in data.values() if "etf" in (f.get("productView") or [])]
        if PROBE: probe[f"ishares_{label}_fields"] = sorted(funds[0].keys())[:120] if funds else []
        seen = set()
        for f in funds:
            u = by_isin.get(f.get("isin")) or by_us_ticker.get(f.get("localExchangeTicker"))
            page = f.get("productPageUrl")
            # Share classes of one fund share a portfolio, so one file serves them all.
            if not u or not page or ok + failed >= LIMIT: continue
            pid = f.get("portfolioId") or page
            url = f"https://www.ishares.com{page}/latest-holdings.csv"
            if pid in seen and seen is not None:
                first = shared.get(pid)
                if first and first in holdings:
                    holdings[u["etf_key"]] = [{**h, "etf_key": u["etf_key"]} for h in holdings[first]]
                    summary[u["etf_key"]] = {**summary[first], "etf_key": u["etf_key"]}
                continue
            seen.add(pid)
            try:
                time.sleep(0.8)
                text = get(url, referer="https://www.ishares.com" + page).decode("utf-8-sig", "replace")
                lines = text.splitlines()
                if PROBE and len(probe) < 6: probe[u["etf_key"]] = [l[:260] for l in lines[:9]]
                head = next(i for i, l in enumerate(lines[:40]) if "Weight (%)" in l)
                as_of = next((parse_date(l.split(",", 1)[1]) for l in lines[:head] if l.lower().startswith(("fund holdings as of", "holdings as of")) and "," in l), "")
                rows = []
                for r in csv.DictReader(io.StringIO("\n".join(lines[head:]))):
                    if not r.get("Name") or r.get("Weight (%)") in (None, ""): continue
                    rows.append({"name": r["Name"].strip(), "ticker": (r.get("Ticker") or r.get("Issuer Ticker") or "").strip(), "isin": (r.get("ISIN") or "").strip(), "weight": num(r["Weight (%)"]), "sector": (r.get("Sector") or "").strip(), "country": (r.get("Location") or r.get("Location of Risk") or "").strip(), "asset_class": (r.get("Asset Class") or "").strip()})
                if store(u["etf_key"], as_of, rows, "iShares", "https://www.ishares.com" + page):
                    ok += 1; shared[pid] = u["etf_key"]
                else: failed += 1
            except Exception as e:
                failed += 1
                if failed <= 3: report.setdefault("ishares_errors", []).append(f"{u['etf_key']}: {type(e).__name__}: {e}"[:160])
            if PROBE and ok + failed >= 4: break
    report["ishares"] = {"ok": ok, "failed": failed}

shared = {}

def ssga_us():
    import openpyxl
    ok = failed = 0
    try:
        data = json.loads(get("https://www.ssga.com/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder"))
    except Exception as e:
        report["ssga_us"] = f"{type(e).__name__}: {e}"[:150]; return
    for f in data["data"]["funds"]["etfs"]["datas"]:
        ticker = re.sub(r"[^A-Z.]", "", f.get("fundTicker", ""))
        u = by_us_ticker.get(ticker)
        if not u or f.get("domicile") != "US" or ok + failed >= LIMIT: continue
        url = f"https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{ticker.lower()}.xlsx"
        try:
            time.sleep(0.8)
            ws = openpyxl.load_workbook(io.BytesIO(get(url)), read_only=True, data_only=True).worksheets[0]
            ws.reset_dimensions()
            table = [[str(c).strip() if c is not None else "" for c in r] for r in ws.iter_rows(values_only=True)]
            if PROBE and "ssga_sample" not in probe: probe["ssga_sample"] = [r[:9] for r in table[:8]]
            head = next(i for i, r in enumerate(table[:15]) if "Weight" in r and "Name" in r)
            col = {n: i for i, n in enumerate(table[head])}
            as_of = next((parse_date(re.sub(r"^As of\s*", "", c)) for r in table[:head] for c in r if c.startswith("As of")), "")
            rows = []
            for r in table[head + 1:]:
                if len(r) <= col["Weight"] or not r[col["Name"]] or num(r[col["Weight"]]) is None: continue
                rows.append({"name": r[col["Name"]], "ticker": r[col["Ticker"]] if "Ticker" in col else "", "isin": r[col["ISIN"]] if "ISIN" in col else "", "weight": num(r[col["Weight"]]), "sector": r[col["Sector"]] if "Sector" in col else "", "country": "", "asset_class": ""})
            if store(u["etf_key"], as_of, rows, "State Street", "https://www.ssga.com" + f.get("fundUri", "")): ok += 1
            else: failed += 1
        except Exception as e:
            failed += 1
            if failed <= 3: report.setdefault("ssga_errors", []).append(f"{ticker}: {type(e).__name__}: {e}"[:160])
    report["ssga_us"] = {"ok": ok, "failed": failed}

def spdr_eu():
    """State Street's European funds. The product list gives each fund's ticker, which names its holdings file."""
    import openpyxl
    ws = openpyxl.load_workbook(io.BytesIO(get("https://www.ssga.com/library-content/products/fund-data/etfs/emea/spdr-product-data-ie-en.xlsx")), read_only=True, data_only=True).worksheets[0]
    ws.reset_dimensions()
    table = [[str(c).strip() if c is not None else "" for c in r] for r in ws.iter_rows(values_only=True)]
    head = next(i for i, r in enumerate(table[:12]) if "ISIN" in r)
    col = {n: i for i, n in enumerate(table[head]) if n}
    # Listing tickers sit three rows deep: exchange, currency, then "Ticker". A fund's holdings file is named after one of them.
    ticker_cols = [i for i, c in enumerate(table[head + 2]) if c == "Ticker"]
    ok = failed = 0
    tried = []
    for r in table[head + 3:]:
        u = by_isin.get(r[col["ISIN"]]) if len(r) > col["ISIN"] else None
        if not u or u["etf_key"] in summary or ok + failed >= LIMIT: continue
        codes = [r[i] for i in ticker_cols if i < len(r) and r[i] not in ("", "-")]
        codes.sort(key=lambda c: (not c.endswith(" GY"), not c.endswith(" LN")))
        if not codes: continue
        code = re.sub(r"[^a-z0-9]+", "-", codes[0].lower()).strip("-")
        url = f"https://www.ssga.com/library-content/products/fund-data/etfs/emea/holdings-daily-emea-en-{code}.xlsx"
        try:
            time.sleep(0.8)
            w2 = openpyxl.load_workbook(io.BytesIO(get(url)), read_only=True, data_only=True).worksheets[0]
            w2.reset_dimensions()
            t2 = [[str(c).strip() if c is not None else "" for c in x] for x in w2.iter_rows(values_only=True)]
            if "spdr_eu_sample" not in probe: probe["spdr_eu_sample"] = [x[:12] for x in t2[:8]]
            h2 = next(i for i, x in enumerate(t2[:15]) if any(c.startswith("Security Name") or c == "Name" for c in x))
            c2 = {n: i for i, n in enumerate(t2[h2])}
            pick = lambda *names: next((c2[n] for n in names if n in c2), None)
            name, weight, isin, sector, country = pick("Security Name", "Name"), pick("Percent of Fund", "Weight"), pick("ISIN"), pick("Sector Classification", "Sector"), pick("Trade Country Name", "Country")
            as_of = next((d for d in (parse_date(m.group(0)) for x in t2[:h2] for c in x for m in [re.search(r"\d{1,2}[-/ ][A-Za-z]{3}[-/ ]\d{4}|\d{4}-\d\d-\d\d", c)] if m) if d), "")
            rows = [{"name": x[name], "ticker": "", "isin": x[isin] if isin is not None else "", "weight": num(x[weight]), "sector": x[sector] if sector is not None else "", "country": x[country] if country is not None else "", "asset_class": ""} for x in t2[h2 + 1:] if len(x) > weight and x[name] and num(x[weight]) is not None]
            if store(u["etf_key"], as_of, rows, "State Street", url): ok += 1
            else: failed += 1
        except Exception as e:
            failed += 1
            if len(tried) < 4: tried.append(f"{code}: {type(e).__name__}: {e}"[:120])
        if failed >= 6 and ok == 0: break  # The address pattern is wrong, so stop asking.
    report["spdr_eu"] = {"ok": ok, "failed": failed, "errors": tried}

def probe_others():
    """One request each to holdings files of other US issuers, to learn which answer a plain request."""
    tries = {
        "invesco_QQQ": "https://www.invesco.com/us/financial-products/etfs/holdings/main/holdings/0?audienceType=Investor&action=download&ticker=QQQ",
        "proshares_SSO": "https://accounts.profunds.com/etfdata/ByFund/SSO-psdlyhld.csv",
        "ark_ARKK": "https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv",
        "vaneck_SMH": "https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/downloads/holdings/",
        "firsttrust_FDN": "https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=FDN",
        "wisdomtree_DGRW": "https://www.wisdomtree.com/investments/global/etf-details/modals/all-holdings?id={DGRW}",
        "direxion_TQQQ": "https://www.direxion.com/holdings/SPXL.csv",
        "jpm_JEPI": "https://am.jpmorgan.com/FundsMarketingHandler/excel?type=dailyETFHoldings&cusip=46641Q332&country=us&role=adv&fundType=N_ETF&locale=en-US&isUnderlyingHolding=false&isProxyHolding=false",
        "schwab_SCHD": "https://www.schwabassetmanagement.com/sites/g/files/eyrktu361/files/product_files/SCHD/SCHD_FundHoldings.csv",
        "vanguard_VOO": "https://investor.vanguard.com/investment-products/etfs/profile/api/VOO/portfolio-holding/stock",
        "globalx_BOTZ": "https://www.globalxetfs.com/funds/botz/?download_full_holdings=true",
    }
    out = {}
    for name, url in tries.items():
        try:
            time.sleep(1)
            body = get(url, timeout=40)
            text = (gzip.decompress(body) if body[:2] == b"\x1f\x8b" else body)[:500].decode("utf-8", "replace")
            out[name] = {"bytes": len(body), "start": text[:400]}
        except Exception as e:
            out[name] = f"{type(e).__name__}: {e}"[:120]
    probe["others"] = out

for fn in (ssga_us, spdr_eu):
    try: fn()
    except Exception as e: report[fn.__name__] = f"{type(e).__name__}: {e}"[:200]

report["probe"] = probe
if True:
    # Keep the last good file for any fund that failed today.
    hp, sp = H / "holdings.csv.gz", H / "summary.csv.gz"
    if sp.exists():
        old_s = {r["etf_key"]: r for r in csv.DictReader(gzip.open(sp, "rt", encoding="utf-8"))}
        missing = set(old_s) - set(summary)
        if missing:
            for r in csv.DictReader(gzip.open(hp, "rt", encoding="utf-8")):
                if r["etf_key"] in missing: holdings.setdefault(r["etf_key"], []).append(r)
            for k in missing:
                if k in holdings: summary[k] = old_s[k]
    if summary:
        with gzip.open(hp, "wt", newline="", encoding="utf-8", compresslevel=9) as fh:
            w = csv.DictWriter(fh, ["etf_key", "holding_key", "name", "ticker", "weight", "sector", "country", "asset_class"]); w.writeheader()
            for k in sorted(holdings): w.writerows(holdings[k])
        with gzip.open(sp, "wt", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, ["etf_key", "as_of", "n_holdings", "kept", "covered_pct", "source", "source_url"]); w.writeheader(); w.writerows(summary[k] for k in sorted(summary))
report["etfs"] = len(summary); report["rows"] = sum(len(v) for v in holdings.values())
(H / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
print(json.dumps(report, ensure_ascii=False)[:3000])
