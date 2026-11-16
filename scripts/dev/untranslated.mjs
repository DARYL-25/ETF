// Dev tool: lists text that reads the same on the English and French versions of each page and looks like English.
import { chromium } from "playwright";
const pages = ["/", "/screener", "/etfs/IE00B5BMR087", "/etfs/IE00B6YX5C33", "/compare?isins=IE00B5BMR087,IE00BK5BQT80", "/indices", "/indices/sp-500", "/holdings?q=nvidia", "/tax", "/tax/switzerland", "/data", "/pricing", "/profile", "/watchlists", "/portfolio", "/assistant?q=ETF%20Nasdaq-100%20pour%20un%20investisseur%20suisse", "/login", "/academy", "/nope"];
const b = await chromium.launch();
const texts = async (lang, path) => {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addCookies([{ name: "lang", value: lang, url: "http://localhost:3100" }, { name: "lens", value: "CH", url: "http://localhost:3100" }]);
  const p = await c.newPage();
  await p.goto("http://localhost:3100" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(path.startsWith("/assistant") ? 2500 : 300);
  const out = await p.evaluate(() => {
    const found = new Set();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { const t = n.textContent.trim().replace(/\s+/g, " "); if (t.length > 2 && !n.parentElement.closest("script,style")) found.add(t); }
    for (const el of document.querySelectorAll("[placeholder],[aria-label],[title]")) for (const a of ["placeholder", "aria-label", "title"]) if (el.getAttribute(a)) found.add(el.getAttribute(a));
    return [...found];
  });
  await c.close();
  return out;
};
const english = /\b(the|and|of|with|for|is|are|not|from|by|no|to|on|in|your|this|that|each|all|or|yet|only)\b/i;
const seen = new Set();
for (const path of pages) {
  const en = new Set(await texts("en", path));
  for (const t of await texts("fr", path)) if (en.has(t) && (english.test(t) || /^[A-Z][a-z]+( [a-z]+)*$/.test(t)) && !seen.has(t)) { seen.add(t); console.log(`${path}\t${t.slice(0, 140)}`); }
}
await b.close();
