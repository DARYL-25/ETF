#!/usr/bin/env python3
"""Downloads ETF lists from official registers and exchanges. Each source fails on its own.
Writes data/universe/<source>.csv.gz and data/universe/report.json. Reference data only, no prices."""
import csv, datetime as dt, gzip, io, json, re, sys, traceback, urllib.parse, urllib.request, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path("data/universe")
FIELDS = ["isin", "ticker", "mic", "name", "currency", "cfi", "issuer_lei", "market"]
UA = {"User-Agent": "Mozilla/5.0 (compatible; etf-intelligence-universe/1.0)", "Accept": "*/*"}

def get(url, timeout=180, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()

def local(tag):
    return tag.rsplit("}", 1)[-1]

def parse_firds(blob, market):
    """Streams a FIRDS FULINS_C zip and keeps CFI group CE, which ISO 10962 defines as ETFs."""
    rows = {}
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for member in z.namelist():
            with z.open(member) as fh:
                for _, el in ET.iterparse(fh, events=("end",)):
                    if local(el.tag) not in ("TermntdRcrd", "ModfdRcrd", "NewRcrd", "RefData"):
                        continue
                    r = {"isin": "", "name": "", "cfi": "", "currency": "", "lei": "", "mic": ""}
                    for node in el.iter():
                        t, v = local(node.tag), (node.text or "").strip()
                        if t == "Id" and not r["isin"] and re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}[0-9]", v): r["isin"] = v
                        elif t == "FullNm" and not r["name"]: r["name"] = v
                        elif t == "ClssfctnTp": r["cfi"] = v
                        elif t == "NtnlCcy" and not r["currency"]: r["currency"] = v
                        elif t == "Issr": r["lei"] = v
                        elif t == "TradgVnRltdAttrbts":
                            for sub in node:
                                if local(sub.tag) == "Id": r["mic"] = (sub.text or "").strip()
                    if r["cfi"].startswith("CE") and r["isin"]:
                        rows[(r["isin"], r["mic"])] = {"isin": r["isin"], "ticker": "", "mic": r["mic"], "name": r["name"], "currency": r["currency"], "cfi": r["cfi"], "issuer_lei": r["lei"], "market": market}
                    el.clear()
    return list(rows.values())

def esma():
    for back in range(0, 14):
        day = (dt.date.today() - dt.timedelta(days=back)).isoformat()
        q = urllib.parse.quote(f"publication_date:[{day}T00:00:00Z TO {day}T23:59:59Z]")
        docs = json.loads(get(f"https://registers.esma.europa.eu/solr/esma_registers_firds_files/select?q=*&fq={q}&wt=json&rows=200"))["response"]["docs"]
        links = [d["download_link"] for d in docs if d.get("file_name", "").startswith("FULINS_C_")]
        if links:
            rows = []
            for link in links: rows += parse_firds(get(link, 600), "EU")
            return rows
    raise RuntimeError("No FULINS_C file in the last 14 days")

def fca():
    for back in range(0, 14):
        day = (dt.date.today() - dt.timedelta(days=back)).isoformat()
        q = urllib.parse.quote(f"((file_type:FULINS) AND (publication_date:[{day} TO {day}]))")
        hits = json.loads(get(f"https://api.data.fca.org.uk/fca_data_firds_files?q={q}&from=0&size=100"))["hits"]["hits"]
        links = [h["_source"]["download_link"] for h in hits if h["_source"].get("file_name", "").startswith("FULINS_C_")]
        if links:
            rows = []
            for link in links: rows += parse_firds(get(link, 600), "GB")
            return rows
    raise RuntimeError("No FCA FULINS_C file in the last 14 days")

US_MIC = {"Q": "XNAS", "N": "XNYS", "P": "ARCX", "Z": "BATS", "A": "XASE", "V": "IEXG"}

def us():
    text = get("https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt").decode("latin-1")
    rows = []
    for r in csv.DictReader(io.StringIO(text), delimiter="|"):
        if r.get("ETF") == "Y" and r.get("Test Issue") == "N":
            rows.append({"isin": "", "ticker": r["Symbol"], "mic": US_MIC.get(r["Listing Exchange"], r["Listing Exchange"]), "name": r["Security Name"], "currency": "USD", "cfi": "", "issuer_lei": "", "market": "US"})
    return rows

def japan():
    html = get("https://www.jpx.co.jp/english/equities/products/etfs/issues/01.html").decode("utf-8", "replace")
    rows = {}
    for code, name in re.findall(r"<td[^>]*>\\s*([0-9][0-9A-Z]{3})\\s*</td>\\s*<td[^>]*>(?:<a[^>]*>)?\\s*([^<]+)", html):
        rows[code] = {"isin": "", "ticker": code, "mic": "XTKS", "name": name.strip(), "currency": "JPY", "cfi": "", "issuer_lei": "", "market": "JP"}
    if not rows: raise RuntimeError(f"Could not read JPX table, page starts: {html[:200]}")
    return list(rows.values())

def hongkong():
    import openpyxl
    book = openpyxl.load_workbook(io.BytesIO(get("https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx")), read_only=True)
    rows, head, seen = [], None, set()
    for row in book.worksheets[0].iter_rows(values_only=True):
        cells = [str(c).strip() if c is not None else "" for c in row]
        if head is None:
            if any(c.lower().startswith("stock code") for c in cells): head = cells
            continue
        d = dict(zip(head, cells))
        seen.add(d.get("Category", "")); sub = d.get("Sub-Category", "")
        if d.get("Category", "").startswith("Exchange Traded") and "L&I" not in sub:
            rows.append({"isin": d.get("ISIN", ""), "ticker": d.get("Stock Code", ""), "mic": "XHKG", "name": d.get("Name of Securities", ""), "currency": d.get("Trading Currency", ""), "cfi": "", "issuer_lei": "", "market": "HK"})
    if not rows: raise RuntimeError(f"categories={sorted(seen)[:15]}")
    return rows

def india():
    text = get("https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv", headers={"User-Agent": "Mozilla/5.0"}).decode("utf-8", "replace")
    rows = []
    for r in csv.DictReader(io.StringIO(text)):
        r = {re.sub(r"[^a-z]", "", (k or "").lower()): (v or "").strip() for k, v in r.items() if k}
        isin = next((v for k, v in r.items() if "isin" in k), "")
        rows.append({"isin": isin, "ticker": r.get("symbol", ""), "mic": "XNSE", "name": r.get("securityname", r.get("underlying", "")), "currency": "INR", "cfi": "", "issuer_lei": "", "market": "IN"})
    return rows

def china_sh():
    data = json.loads(get("https://query.sse.com.cn/commonSoaQuery.do?isPagination=true&pageHelp.pageSize=3000&pageHelp.pageNo=1&sqlId=FUND_LIST&fundType=00", headers={"Referer": "https://etf.sse.com.cn/"}))
    return [{"isin": "", "ticker": r.get("fundCode", ""), "mic": "XSHG", "name": r.get("secNameFull") or r.get("fundAbbr", ""), "currency": "CNY", "cfi": "", "issuer_lei": "", "market": "CN"} for r in data.get("result", [])]

def china_sz():
    data = json.loads(get("https://fund.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=1105&TABKEY=tab1&PAGENO=1&PAGESIZE=3000", headers={"Referer": "https://fund.szse.cn/"}))
    return [{"isin": "", "ticker": re.sub(r"<[^>]+>", "", r.get("sys_key", r.get("jjdm", ""))), "mic": "XSHE", "name": re.sub(r"<[^>]+>", "", r.get("kzjcurl", r.get("jjjc", ""))), "currency": "CNY", "cfi": "", "issuer_lei": "", "market": "CN"} for r in data[0]["data"]]

def korea():
    data = json.loads(get("https://finance.naver.com/api/sise/etfItemList.nhn").decode("euc-kr", "replace"))
    return [{"isin": "", "ticker": r["itemcode"], "mic": "XKRX", "name": r["itemname"], "currency": "KRW", "cfi": "", "issuer_lei": "", "market": "KR"} for r in data["result"]["etfItemList"]]

def taiwan():
    data = json.loads(get("https://www.twse.com.tw/rwd/en/ETF/list?response=json"))
    rows = data.get("data", [])
    return [{"isin": "", "ticker": str(r[1]).strip(), "mic": "XTAI", "name": str(r[2]).strip(), "currency": "TWD", "cfi": "", "issuer_lei": "", "market": "TW"} for r in rows]

def australia():
    data = json.loads(get("https://asx.api.markitdigital.com/asx-research/1.0/etfs/directory?page=0&itemsPerPage=1000"))
    items = data["data"]["items"]
    return [{"isin": i.get("isin", ""), "ticker": i.get("symbol", ""), "mic": "XASX", "name": i.get("displayName", ""), "currency": "AUD", "cfi": "", "issuer_lei": "", "market": "AU"} for i in items]

def canada():
    rows = []
    for exch, mic in (("tsx", "XTSE"), ("tsxv", "XTSX")):
        data = json.loads(get(f"https://www.tsx.com/json/company-directory/search/{exch}/%5E*"))
        for c in data.get("results", []):
            for inst in c.get("instruments", []) or [c]:
                name = inst.get("name") or c.get("name", "")
                if re.search(r"\bETF\b|Exchange.Traded|Index Fund", name, re.I):
                    rows.append({"isin": "", "ticker": inst.get("symbol", ""), "mic": mic, "name": name, "currency": "", "cfi": "", "issuer_lei": "", "market": "CA"})
    return rows

def singapore():
    data = json.loads(get("https://api.sgx.com/securities/v1.1?params=nc,n,type"))
    return [{"isin": "", "ticker": p.get("nc", ""), "mic": "XSES", "name": p.get("n", ""), "currency": "", "cfi": "", "issuer_lei": "", "market": "SG"} for p in data["data"]["prices"] if p.get("type") == "etfs"]

SOURCES = {"esma": esma, "fca": fca, "us": us, "japan": japan, "hongkong": hongkong, "india": india, "canada": canada, "singapore": singapore, "china_sh": china_sh, "china_sz": china_sz, "korea": korea, "taiwan": taiwan, "australia": australia}

def gleif(report):
    """Issuer legal name and registered country for each LEI. GLEIF data is open (CC0)."""
    leis = set()
    for f in OUT.glob("*.csv.gz"):
        if f.name == "issuers.csv.gz": continue
        with gzip.open(f, "rt", encoding="utf-8") as fh:
            leis |= {r["issuer_lei"] for r in csv.DictReader(fh) if r["issuer_lei"]}
    leis = sorted(leis); out = []
    try:
        for i in range(0, len(leis), 100):
            q = urllib.parse.quote(",".join(leis[i:i + 100]))
            data = json.loads(get(f"https://api.gleif.org/api/v1/lei-records?filter[lei]={q}&page[size]=100"))
            for d in data["data"]:
                e = d["attributes"]["entity"]
                out.append({"lei": d["attributes"]["lei"], "legal_name": e["legalName"]["name"], "country": e["legalAddress"]["country"]})
        with gzip.open(OUT / "issuers.csv.gz", "wt", newline="", encoding="utf-8", compresslevel=9) as fh:
            w = csv.DictWriter(fh, ["lei", "legal_name", "country"]); w.writeheader(); w.writerows(out)
        report["gleif"] = {"ok": True, "rows": len(out), "wanted": len(leis)}
    except Exception as e:
        report["gleif"] = {"ok": False, "got": len(out), "wanted": len(leis), "error": str(e)[:300]}
    print(report["gleif"], flush=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report_path = OUT / "report.json"
    report = json.loads(report_path.read_text()) if report_path.exists() else {}
    for name, fn in SOURCES.items():
        if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
        try:
            rows = fn()
            if not rows: raise RuntimeError("Source returned no ETFs")
            with gzip.open(OUT / f"{name}.csv.gz", "wt", newline="", encoding="utf-8", compresslevel=9) as fh:
                w = csv.DictWriter(fh, FIELDS); w.writeheader(); w.writerows(sorted(rows, key=lambda r: (r["isin"], r["ticker"], r["mic"])))
            report[name] = {"ok": True, "rows": len(rows), "distinct_isin": len({r["isin"] for r in rows if r["isin"]}), "on": dt.date.today().isoformat()}
        except Exception as e:
            old = report.get(name, {})
            report[name] = {**old, "ok": False, "error": f"{type(e).__name__}: {e}"[:400], "trace": traceback.format_exc()[-500:]}
        print(name, report[name], flush=True)
    gleif(report)
    report_path.write_text(json.dumps(report, indent=1))

main()
