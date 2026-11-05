#!/usr/bin/env python3
"""Downloads each issuer's published site icon into public/logos. A refusal leaves initials in the UI."""
import json, re, time, urllib.parse, urllib.request
from pathlib import Path
OUT = Path("public/logos"); OUT.mkdir(parents=True, exist_ok=True)
UA = "etf-intelligence-universe/1.0 (+https://github.com/DARYL-25/ETF)"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30) as r: return r.read()
src = Path("src/lib/etfs/brands.ts").read_text()
report = {}
for slug, domain in re.findall(r'slug: "([^"]+)".*?domain: "([^"]+)"', src):
    base = f"https://www.{domain}/" if domain.count(".") == 1 else f"https://{domain}/"
    found = None
    try:
        html = get(base).decode("utf-8", "replace")
        links = re.findall(r'<link[^>]+rel=["\'][^"\']*(?:apple-touch-icon|icon)[^"\']*["\'][^>]*>', html, re.I)
        links.sort(key=lambda l: "apple-touch" not in l.lower())
        urls = [urllib.parse.urljoin(base, m.group(1)) for l in links for m in [re.search(r'href=["\']([^"\']+)', l)] if m]
    except Exception as e:
        urls = []; report[slug] = f"page: {e}"[:80]
    for u in urls + [urllib.parse.urljoin(base, "favicon.ico")]:
        try:
            b = get(u)
            ext = "png" if b[:4] == b"\x89PNG" else "svg" if b"<svg" in b[:400] else "ico" if b[:4] == b"\0\0\1\0" else None
            if ext and len(b) < 300000:
                (OUT / f"{slug}.{ext}").write_bytes(b); found = u; break
        except Exception:
            pass
    report[slug] = found or report.get(slug, "none")
    time.sleep(1)
(OUT / "report.json").write_text(json.dumps(report, indent=1)); print(report)
