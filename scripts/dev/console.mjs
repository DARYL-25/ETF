// Lists browser console errors on the main pages. Run against a started site.
import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
const seen = [];
page.on("console", (m) => { if (m.type() === "error") seen.push(`${page.url()} ${m.text().slice(0, 200)}`); });
page.on("pageerror", (e) => seen.push(`${page.url()} ${String(e).slice(0, 200)}`));
for (const p of ["/", "/screener", "/etfs/IE00B6YX5C33", "/etfs/ARCX-SPY", "/compare?isins=ARCX-SPY,IE00B6YX5C33", "/indices/sp-500", "/holdings", "/tax/france", "/data", "/portfolio", "/assistant", "/academy/calculators"]) await page.goto(base + p, { waitUntil: "networkidle" });
await browser.close();
console.log(seen.length ? seen.join("\n") : "No console errors");
