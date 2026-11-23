#!/usr/bin/env python3
"""Fund facts from the issuers' own monthly factsheets, read one fund at a time.

Factsheets are public marketing documents that issuers publish for every share class, usually monthly. Each one
gives the fee, fund size, top holdings, country and sector split, replication method and number of holdings.
This reads them only where the issuer serves them openly: robots.txt is honoured, requests say who we are, go one
at a time, and a refusal is recorded and accepted. Nothing behind a terms page is read.

Issuers covered, and how each factsheet is found:
  hsbc       factsheet addressed by ISIN on the issuer's document service
  invesco    factsheet addressed by the fund's ticker
  xtrackers  the fund page (addressed by ISIN) links its factsheet
  ishares    the fund page from iShares' public product list links its factsheet (UCITS funds only;
             US iShares funds come from SEC N-PORT)

Writes:
  data/universe/factsheets.csv.gz              one row per ETF: as-of date, fee, size, holdings count, replication
  data/holdings/factsheet_holdings.csv.gz      top holdings, same columns as holdings.csv.gz
  data/holdings/factsheet_summary.csv.gz       one row per ETF in factsheet_holdings
  data/holdings/factsheet_exposures.csv.gz     country and sector split as printed on the factsheet
  data/universe/details/documents_report.json
Text samples for checking the parser go to an Actions artifact (out/), never into the repository.
Env: ISSUERS (comma list), LIMIT (per issuer, for test runs)."""
import csv, datetime as dt, gzip, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request, urllib.robotparser
from pathlib import Path

UA = "etf-intelligence-documents/1.0 (+https://github.com/DARYL-25/ETF)"
U, H, R, OUT = Path("data/universe"), Path("data/holdings"), Path("data/universe/details"), Path("out")
for d in (H, R, OUT): d.mkdir(parents=True, exist_ok=True)
ISSUERS = [s for s in os.environ.get("ISSUERS", "hsbc,invesco,xtrackers,ishares").split(",") if s]
LIMIT = int(os.environ.get("LIMIT", "100000"))
PAUSE = float(os.environ.get("PAUSE", "1.0"))
csv.field_size_limit(10**9)

def rd(p): return list(csv.DictReader(gzip.open(p, "rt", encoding="utf-8"))) if Path(p).exists() else []
universe = rd(U / "universe.csv.gz")
by_isin = {r["isin"]: r for r in universe if r["isin"]}
report = {"on": dt.date.today().isoformat(), "issuers": {}}

# ---------- polite fetching ----------
robots, refused_hosts = {}, set()
def allowed(url):
    p = urllib.parse.urlparse(url); base = f"{p.scheme}://{p.netloc}"
    if base not in robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            with urllib.request.urlopen(urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA}), timeout=30) as r:
                rp.parse(r.read().decode("utf-8", "replace").splitlines())
        except urllib.error.HTTPError as e:
            rp.parse([] if e.code in (404, 410) else ["User-agent: *", "Disallow: /"])
        except Exception:
            rp.parse([])
        robots[base] = rp
    return robots[base].can_fetch(UA, url)

def get(url, timeout=60):
    if not allowed(url): raise PermissionError("robots.txt disallows")
    host = urllib.parse.urlparse(url).netloc
    if host in refused_hosts: raise PermissionError("host refused earlier")
    time.sleep(PAUSE)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"}), timeout=timeout) as r:
            return r.read(), r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 429): refused_hosts.add(host)  # a refusal is accepted for the rest of the run
        raise

# ---------- generic factsheet parser ----------
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
MONTHS.update({"mär": 3, "mai": 5, "okt": 10, "dez": 12, "januar": 1, "februar": 2, "märz": 3, "juni": 6, "juli": 7, "oktober": 10, "dezember": 12})
def as_of(text):
    pats = [r"(?:as (?:at|of)|data as at|monthly report|stand vom|per)\s*:?\s*(\d{1,2})[\s.-]+([A-Za-zä]{3,9})\.?[\s.-]+(20\d\d)",
            r"(?:as (?:at|of))\s+([A-Za-z]{3,9})\s+(\d{1,2}),\s*(20\d\d)", r"(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d\d)"]
    for i, pat in enumerate(pats):
        m = re.search(pat, text, re.I)
        if not m: continue
        a, b, y = m.groups()
        day, mon = (b, a) if i == 1 else (a, b)
        mon = MONTHS.get(mon.lower()[:3]) or MONTHS.get(mon.lower())
        try: return dt.date(int(y), mon, int(day)).isoformat()
        except (TypeError, ValueError): continue
    return ""

def pct(s): return float(s.replace(",", ".").replace("'", ""))
FEE = re.compile(r"(?:Total Expense Ratio|\bTER\b|Ongoing Charges?(?: Figure)?|\bOCF\b|Management fee(?: p\.a\.)?|Gesamtkostenquote|Laufende Kosten)[^\d\n%]{0,40}?(\d{1,2}[.,]\d{1,3})\s*%", re.I)
SIZE = re.compile(r"(Net Assets of (?:Fund|Share Class)|Fund size|Fund Size|Fund AUM|Fund assets|Total assets|Total net assets|Net assets)\s*(?:\(\s*(?:million|mn|m)\s*\))?\s*:?\s*([A-Z]{3}|\$|€|£)?\s*([\d][\d,.']*)\s*(bn|billion|million|mn|m\b|M\b)?\s*([A-Z]{3})?", re.I)
HOLDCOUNT = re.compile(r"(?:Number of (?:Holdings|stocks|securities|positions)|Total holdings|Anzahl der Positionen)\D{0,12}([\d][\d,']*)", re.I)
REPL = re.compile(r"\b(Full(?:y)? (?:physical )?replication|Physical(?: replication)?|Optimi[sz](?:ed|ation)|Sampling|Synthetic|Swap[- ]based)\b", re.I)
TOP_HEAD = re.compile(r"^(?:top\s*(?:10|ten)?\s*(?:holdings|positions|exposures|issuers)|largest\s*(?:10\s*)?holdings|top-10-positionen|größte 10 position|top positionen)", re.I)
SECTION = re.compile(r"(?i)\b(breakdown|allocation|exposure by|by country|by sector|geographic|sector weights|country weights|market allocation|asset class)\b")
LINE_PCT = re.compile(r"^(.{2,90}?)\s+(?:[A-Z]{2}[A-Z0-9]{9}\d\s+)?(-?\d{1,3}[.,]\d{1,3})\s*%?(?:\s+-?\d{1,3}[.,]\d{1,3}\s*%?)?$")
SECTORS = {"information technology": "Information Technology", "info. tech.": "Information Technology", "technology": "Information Technology", "financials": "Financials", "financial": "Financials",
    "health care": "Health Care", "healthcare": "Health Care", "consumer discretionary": "Consumer Discretionary", "consumer staples": "Consumer Staples", "industrials": "Industrials",
    "communication services": "Communication Services", "communication": "Communication Services", "telecommunication services": "Communication Services", "energy": "Energy",
    "materials": "Materials", "basic materials": "Materials", "utilities": "Utilities", "real estate": "Real Estate"}
try:
    import pycountry
    COUNTRIES = {c.name.lower(): getattr(c, "common_name", c.name) for c in pycountry.countries}
    COUNTRIES.update({getattr(c, "common_name", c.name).lower(): getattr(c, "common_name", c.name) for c in pycountry.countries})
except ImportError:
    COUNTRIES = {}
COUNTRIES.update({"united states": "United States", "usa": "United States", "united kingdom": "United Kingdom", "uk": "United Kingdom", "korea": "Korea", "south korea": "Korea",
    "korea, republic of": "Korea", "taiwan": "Taiwan", "hong kong": "Hong Kong", "russia": "Russia", "netherlands": "Netherlands", "switzerland": "Switzerland", "czech republic": "Czech Republic", "vietnam": "Vietnam", "turkey": "Turkey", "china": "China", "japan": "Japan", "germany": "Germany", "france": "France", "spain": "Spain", "italy": "Italy", "canada": "Canada", "india": "India", "australia": "Australia", "sweden": "Sweden", "denmark": "Denmark", "brazil": "Brazil"})

def parse(text):
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines() if l.strip()]
    out = {"as_of": as_of(text)}
    m = FEE.search(text)
    if m and 0 < pct(m.group(1)) <= 3: out["fee_pct"] = pct(m.group(1))
    for m in SIZE.finditer(text):
        label, cur1, amount, unit, cur2 = m.groups()
        cur = {"$": "USD", "€": "EUR", "£": "GBP"}.get(cur1 or "", cur1 or cur2 or "")
        try: value = float(amount.replace(",", "").replace("'", ""))
        except ValueError: continue
        u = (unit or "").lower()
        if "(million" in m.group(0).lower() or u in ("m", "mn", "million"): value *= 1e6
        elif u in ("bn", "billion"): value *= 1e9
        if cur and len(cur) == 3 and cur.isalpha() and value >= 1e5:
            out.update(aum=round(value), aum_currency=cur.upper(), aum_level="share_class" if "share class" in label.lower() else "fund")
            break
    m = HOLDCOUNT.search(text)
    if m: out["n_holdings"] = int(m.group(1).replace(",", "").replace("'", ""))
    m = REPL.search(text)
    if m:
        w = m.group(1).lower()
        out["replication"] = "synthetic" if ("synthetic" in w or "swap" in w) else "physical_sampled" if ("optimi" in w or "sampling" in w) else "physical_full"
    top, i = [], 0
    while i < len(lines):
        if TOP_HEAD.match(lines[i]):
            misses = 0
            for l in lines[i + 1:i + 30]:
                if SECTION.search(l) or re.match(r"(?i)total\b", l): break
                mm = LINE_PCT.match(l)
                if mm and mm.group(1).strip(" .:-*").lower() in (SECTORS.keys() | COUNTRIES.keys()): break
                if mm and not TOP_HEAD.match(l):
                    name, w = mm.group(1).strip(" .:-"), pct(mm.group(2))
                    if 0 < w <= 60 and not re.fullmatch(r"[\d\s.,%-]+", name): top.append((name, w)); misses = 0
                else:
                    misses += 1
                    if misses > 3 and top: break
                if len(top) >= 10: break
            break
        i += 1
    if top: out["top"] = top
    seen = {"country": {}, "sector": {}}
    for l in lines:
        mm = LINE_PCT.match(l)
        if not mm: continue
        label, w = mm.group(1).strip(" .:-*").lower(), pct(mm.group(2))
        if not (0 < w <= 100): continue
        if label in SECTORS: seen["sector"].setdefault(SECTORS[label], w)
        elif label in COUNTRIES: seen["country"].setdefault(COUNTRIES[label], w)
    for k, v in seen.items():
        if len(v) >= 2 and 40 <= sum(v.values()) <= 101.5: out[k] = v
    return out

def pdf_text(blob):
    import pdfplumber
    with pdfplumber.open(io.BytesIO(blob)) as p:
        return "\n".join((pg.extract_text() or "") for pg in p.pages[:4])

# ---------- issuers: where each factsheet is ----------
def hsbc():
    for r in universe:
        if r["isin"] and re.search(r"\bHSBC\b", r["name"] + " " + r["issuer_name"], re.I):
            yield r, f"https://www.assetmanagement.hsbc.co.uk/api/v1/download/document/{r['isin'].lower()}/gb/en/factsheet", True

def invesco():
    tick = {}
    for f in ("issuer_files.csv.gz", "issuer_identity.csv.gz"):
        for r in rd(U / f):
            if r.get("isin") and r.get("ticker") and "invesco" in (r.get("source", "") + r.get("name", "")).lower(): tick.setdefault(r["isin"], r["ticker"])
    for isin, t in tick.items():
        r = by_isin.get(isin)
        if r: yield r, f"https://etf.invesco.com/sites/default/files/documents/IVZ_{t.upper()}_FACTSHEET_EN.pdf", False

def xtrackers():
    for r in universe:
        if not (r["isin"] and re.search(r"Xtrackers", r["name"] + " " + r["issuer_name"], re.I)): continue
        page = f"https://etf.dws.com/en-gb/{r['isin']}/"
        try:
            html = get(page)[0].decode("utf-8", "replace")
        except Exception as e:
            yield r, None, f"page: {type(e).__name__}"; continue
        m = re.search(r'href="([^"]*(?:AssetDownload/Index/[0-9a-f-]{36}/Factsheet\.pdf|download/asset/[0-9a-f-]{36}))"[^>]*>(?:(?!</a>).){0,200}?Factsheet', html, re.I | re.S) \
            or re.search(r'href="([^"]*AssetDownload/Index/[0-9a-f-]{36}/Factsheet\.pdf)"', html, re.I)
        yield r, (urllib.parse.urljoin(page, m.group(1)) if m else None), True

def ishares():
    try:
        data = json.loads(get("https://www.ishares.com/varnish-api/blk-product-screener-server/api/v1/product-screener/product-data?country=gb&language=en&siteName=ishares-uk&userType=individual")[0])
    except Exception as e:
        report["issuers"]["ishares_list"] = f"{type(e).__name__}: {e}"[:200]; return
    for f in data.values():
        if "etf" not in (f.get("productView") or []) or f.get("isin") not in by_isin or not f.get("productPageUrl"): continue
        page = "https://www.ishares.com" + f["productPageUrl"]
        try:
            html = get(page)[0].decode("utf-8", "replace")
        except Exception as e:
            yield by_isin[f["isin"]], None, f"page: {type(e).__name__}"; continue
        m = re.search(r'href="([^"]*literature/fact-sheet/[^"]+\.pdf)"', html, re.I)
        yield by_isin[f["isin"]], (urllib.parse.urljoin(page, m.group(1)) if m else None), False

RESOLVERS = {"hsbc": hsbc, "invesco": invesco, "xtrackers": xtrackers, "ishares": ishares}
LABEL = {"hsbc": "HSBC factsheet", "invesco": "Invesco factsheet", "xtrackers": "Xtrackers factsheet", "ishares": "iShares factsheet"}

# ETFs with a full holdings file already keep it; factsheet top holdings fill only the rest.
full = {r["etf_key"] for f in ("summary.csv.gz", "sec_summary.csv.gz") for r in rd(H / f)}
facts, holds, sums, expo = [], [], [], []
samples = 0
def holding_key(name):
    clean = re.sub(r"\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|PLC|LTD|LIMITED|SA|AG|NV|SE|ASA|AB|OYJ|SPA|HOLDINGS?|GROUP|CLASS|CL|ORD|REG|SHS|ADR|THE|AND|COM)\b", "", re.sub(r"[^A-Z0-9 ]", " ", name.upper().replace(".COM", "COM")))
    return re.sub(r"[^A-Z0-9]", "", clean)[:22]

for issuer in ISSUERS:
    stats = {"tried": 0, "ok": 0, "no_link": 0, "failed": 0, "wrong_fund": 0, "with_fee": 0, "with_size": 0, "with_top": 0, "with_countries": 0, "with_sectors": 0, "errors": {}}
    started = time.time()
    for item in RESOLVERS[issuer]():
        r, url, by_key = item
        if stats["tried"] >= LIMIT: break
        stats["tried"] += 1
        if not url:
            stats["no_link"] += 1
            if isinstance(by_key, str): stats["errors"][by_key] = stats["errors"].get(by_key, 0) + 1
            continue
        try:
            blob, ctype = get(url)
            if blob[:4] != b"%PDF": raise ValueError("not a pdf")
            text = pdf_text(blob)
        except Exception as e:
            key = f"{type(e).__name__}: {str(e)[:60]}"
            stats["failed"] += 1; stats["errors"][key] = stats["errors"].get(key, 0) + 1
            continue
        if samples < 12 and stats["ok"] < 3:
            (OUT / f"{issuer}_{r['isin']}.txt").write_text(text[:20000]); samples += 1
        # A factsheet found by ticker must name this fund's ISIN, or its figures are another share class's.
        if not by_key and r["isin"] not in text.replace(" ", ""):
            stats["wrong_fund"] += 1; continue
        p = parse(text)
        stats["ok"] += 1
        src = LABEL[issuer]
        facts.append([r["etf_key"], p.get("as_of", ""), p.get("fee_pct", ""), p.get("aum", ""), p.get("aum_currency", ""), p.get("aum_level", ""), p.get("n_holdings", ""), p.get("replication", ""), src, url])
        for k in ("fee_pct", "aum", "top", "country", "sector"):
            if p.get(k): stats["with_" + {"fee_pct": "fee", "aum": "size", "top": "top", "country": "countries", "sector": "sectors"}[k]] += 1
        if p.get("top") and r["etf_key"] not in full:
            for name, w in p["top"]:
                holds.append([r["etf_key"], holding_key(name) or "|" + name[:20], name[:80], "", w, "", "", ""])
            sums.append([r["etf_key"], p.get("as_of", ""), p.get("n_holdings") or len(p["top"]), len(p["top"]), round(sum(w for _, w in p["top"]), 2), src, url])
        for dim in ("country", "sector"):
            for label, w in (p.get(dim) or {}).items(): expo.append([r["etf_key"], dim, label, w, p.get("as_of", ""), src, url])
    stats["minutes"] = round((time.time() - started) / 60, 1)
    report["issuers"][issuer] = stats
    print(issuer, json.dumps(stats), flush=True)

def write(path, header, rows):
    with gzip.open(path, "wt", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(header); w.writerows(sorted(rows, key=lambda x: [str(v) for v in x]))
# A test run (LIMIT set) only reports, so it never replaces a full month's files with a sample.
if "LIMIT" not in os.environ:
    write(U / "factsheets.csv.gz", ["etf_key", "as_of", "fee_pct", "aum", "aum_currency", "aum_level", "n_holdings", "replication", "source", "source_url"], facts)
    write(H / "factsheet_holdings.csv.gz", ["etf_key", "holding_key", "name", "ticker", "weight", "sector", "country", "asset_class"], holds)
    write(H / "factsheet_summary.csv.gz", ["etf_key", "as_of", "n_holdings", "kept", "covered_pct", "source", "source_url"], sums)
    write(H / "factsheet_exposures.csv.gz", ["etf_key", "dimension", "label", "weight", "as_of", "source", "source_url"], expo)
report.update({"funds": len(facts), "with_top_holdings_new": len(sums), "exposure_rows": len(expo), "refused_hosts": sorted(refused_hosts), "test_run": "LIMIT" in os.environ})
(R / "documents_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:3000])
