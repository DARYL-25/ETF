#!/usr/bin/env python3
"""US ETF holdings from each fund's Form N-PORT filing, read as soon as EDGAR publishes it. Public domain.

Every US fund reports its full portfolio each month; the SEC makes the report for each quarter's last month
public about 60 days later. The quarterly bulk data sets (nport.py) come out weeks after that, so this job reads
EDGAR's daily index of new filings instead and picks up each fund's report the day it appears.

  1. Registrants that issue one of our US ETFs, from the SEC's fund ticker file (series -> tickers).
  2. Each registrant's filing history (data.sec.gov submissions API): NPORT-P filings since the last run.
  3. Each filing's primary_doc.xml, streamed: its series, report date, net assets and every position.
  4. Holdings replace the stored ones only when the report is newer. ETFs with issuer holdings files keep those.

Updates data/holdings/sec_holdings.csv.gz and sec_summary.csv.gz in place (as_of = the report date, source_url
= the filing), and data/universe/sec_nport.csv.gz for fund size. Remembers the last day read in
data/holdings/nport_live_state.json. SEC asks clients to state a contact, read from SEC_CONTACT_EMAIL."""
import csv, datetime as dt, gzip, io, json, os, re, sys, time, urllib.error, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nport_common import H, SOURCE, fund_rows, read_sec_files, write_sec_files

contact = os.environ.get("SEC_CONTACT_EMAIL")
if not contact:
    print("SEC_CONTACT_EMAIL secret is not set. Nothing to do."); sys.exit(0)
UA = {"User-Agent": f"ETF Intelligence {contact}", "Accept-Encoding": "gzip"}
U, R = Path("data/universe"), Path("data/universe/details")
R.mkdir(parents=True, exist_ok=True)
STATE = H / "nport_live_state.json"
LOOKBACK = int(os.environ.get("NPORT_LOOKBACK_DAYS", "120"))  # first run: one full disclosure cycle
MAX_FILINGS = int(os.environ.get("NPORT_MAX_FILINGS", "6000"))
PAUSE = 0.15  # SEC allows 10 requests a second; stay well under
report = {"on": dt.date.today().isoformat()}


def get(url, timeout=300, tries=4):
    for attempt in range(tries):
        time.sleep(PAUSE)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                b = r.read()
                return gzip.decompress(b) if r.headers.get("Content-Encoding") == "gzip" or b[:2] == b"\x1f\x8b" else b
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if e.code in (403, 429, 500, 502, 503, 504) and attempt < tries - 1: time.sleep(10 * (attempt + 1)); continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < tries - 1: time.sleep(5); continue
            raise


# Since when to look.
state = json.loads(STATE.read_text()) if STATE.exists() else {}
today = dt.date.today()
start = dt.date.fromisoformat(state["last_day"]) + dt.timedelta(days=1) if state.get("last_day") else today - dt.timedelta(days=LOOKBACK)
days = [start + dt.timedelta(days=i) for i in range((today - start).days + 1)]

# Our US ETFs by ticker, and which series and registrants they belong to.
universe = {r["ticker"]: r["etf_key"] for r in csv.DictReader(gzip.open(U / "universe.csv.gz", "rt", encoding="utf-8")) if r["source"] == "us" and r["ticker"]}
tick = json.loads(get("https://www.sec.gov/files/company_tickers_mf.json"))
f = {n: i for i, n in enumerate(tick["fields"])}
series_etfs, ciks = {}, set()
for row in tick["data"]:
    key = universe.get(row[f["symbol"]])
    if key:
        series_etfs.setdefault(row[f["seriesId"]], set()).add(key)
        ciks.add(int(row[f["cik"]]))
with_issuer = {r["etf_key"] for r in csv.DictReader(gzip.open(H / "summary.csv.gz", "rt", encoding="utf-8"))} if (H / "summary.csv.gz").exists() else set()
report.update({"series": len(series_etfs), "registrants": len(ciks)})

# 1-2. New NPORT-P filings by our registrants, from each registrant's filing history on data.sec.gov.
filings, failed = [], []
since = days[0].isoformat() if days else today.isoformat()
for cik in sorted(ciks):
    try:
        sub = json.loads(get(f"https://data.sec.gov/submissions/CIK{cik:010d}.json") or b"{}")
    except Exception as e:
        failed.append(f"{cik}: {type(e).__name__}: {e}"[:120]); continue
    recent = (sub.get("filings") or {}).get("recent") or {}
    for form, filed, acc, doc in zip(recent.get("form", []), recent.get("filingDate", []), recent.get("accessionNumber", []), recent.get("primaryDocument", [])):
        if form == "NPORT-P" and filed >= since:
            filings.append((filed, cik, acc, doc or "primary_doc.xml"))
filings.sort()
read_through = (today - dt.timedelta(days=1)).isoformat() if len(failed) < max(5, len(ciks) // 10) else state.get("last_day")
report["registrants_failed"] = failed[:20]
report.update({"since": since, "filings_found": len(filings)})


def local(tag): return tag.rsplit("}", 1)[-1]


def parse(xml_bytes):
    """Series, report date, net assets and positions from one N-PORT primary_doc.xml, streamed."""
    out = {"series": None, "date": None, "net_assets": None, "positions": []}
    pos, path = None, []
    for event, el in ET.iterparse(io.BytesIO(xml_bytes), events=("start", "end")):
        t = local(el.tag)
        if event == "start":
            path.append(t)
            if t == "invstOrSec": pos = {"name": "", "title": "", "weight": None, "country": "", "asset": "", "id": len(out["positions"])}
            continue
        path.pop()
        text = (el.text or "").strip()
        if pos is not None:
            if t == "name" and not pos["name"]: pos["name"] = text
            elif t == "title": pos["title"] = text
            elif t == "pctVal": pos["weight"] = float(text) if re.fullmatch(r"-?\d+(\.\d+)?(E-?\d+)?", text, re.I) else None
            elif t == "invCountry": pos["country"] = text
            elif t == "assetCat": pos["asset"] = text
            elif t == "assetConditional": pos["asset"] = pos["asset"] or el.get("assetCat", "")
            elif t == "invstOrSec":
                if pos["weight"] is not None:
                    pos["name"] = pos["name"] if pos["name"] and pos["name"].upper() != "N/A" else pos["title"]
                    out["positions"].append(pos)
                pos = None
                el.clear()
        elif t == "seriesId" and not out["series"]: out["series"] = text
        elif t == "repPdDate": out["date"] = text
        elif t == "netAssets": out["net_assets"] = float(text) if text else None
    return out


# 3-4. Read each filing and keep it where it is newer.
summary, holdings = read_sec_files()
aum = {}
if (U / "sec_nport.csv.gz").exists():
    aum = {r["etf_key"]: r for r in csv.DictReader(gzip.open(U / "sec_nport.csv.gz", "rt", encoding="utf-8"))}
updated, skipped, errors, other_series = 0, 0, [], 0
for filed, cik, acc, primary in filings[:MAX_FILINGS]:
    folder = f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}"
    try:
        url = f"{folder}/{primary.rsplit('/', 1)[-1] if primary.endswith('.xml') else 'primary_doc.xml'}"
        doc = get(url)
        if not doc: errors.append(f"{acc}: no primary_doc.xml"); continue
        try: rep = parse(doc)
        except ET.ParseError: rep = parse(get(url, tries=4))  # a download cut short; read it again
    except Exception as e:
        if len(errors) < 20: errors.append(f"{acc}: {type(e).__name__}: {e}"[:160])
        continue
    keys = series_etfs.get(rep["series"] or "")
    if not keys: other_series += 1; continue  # a mutual fund of the same registrant
    date = rep["date"] or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date): errors.append(f"{acc}: report date {date!r}"); continue
    page = f"{folder}/{acc}-index.htm"
    for key in sorted(keys):
        if rep["net_assets"] and (key not in aum or aum[key]["aum_as_of"] < date):
            aum[key] = {"etf_key": key, "aum": str(round(rep["net_assets"])), "aum_currency": "USD", "aum_as_of": date, "accession": acc}
        if key in with_issuer: continue
        old = summary.get(key)
        if old and old["as_of"] >= date and holdings.get(key): skipped += 1; continue
        rows, n, covered = fund_rows(key, rep["positions"])
        if not rows: continue
        holdings[key] = rows
        summary[key] = {"etf_key": key, "as_of": date, "n_holdings": n, "kept": len(rows), "covered_pct": covered, "source": SOURCE, "source_url": page}
        updated += 1

write_sec_files(summary, holdings)
with gzip.open(U / "sec_nport.csv.gz", "wt", newline="") as fh:
    w = csv.writer(fh); w.writerow(["etf_key", "aum", "aum_currency", "aum_as_of", "accession"])
    for key in sorted(aum): w.writerow([aum[key][c] for c in ("etf_key", "aum", "aum_currency", "aum_as_of", "accession")])

# Only move the bookmark past days whose filings were all read, so a capped run resumes where it stopped.
if len(filings) > MAX_FILINGS: read_through = (dt.date.fromisoformat(filings[MAX_FILINGS][0]) - dt.timedelta(days=1)).isoformat()
if read_through: STATE.write_text(json.dumps({"last_day": read_through}, indent=1) + "\n")
dates = sorted(r["as_of"] for r in summary.values())
report.update({"filings_read": min(len(filings), MAX_FILINGS), "etfs_updated": updated, "already_newer": skipped, "other_series": other_series,
               "errors": errors[:20], "read_through": read_through, "etfs_with_sec_holdings": len(summary),
               "newest_as_of": dates[-1] if dates else None, "oldest_as_of": dates[0] if dates else None})
(R / "nport_live_report.json").write_text(json.dumps(report, indent=1))
print(json.dumps(report)[:3000])
