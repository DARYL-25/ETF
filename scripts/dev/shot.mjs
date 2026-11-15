// Screenshot of one page: node scripts/dev/shot.mjs /tax/france out.png [fr]
import { chromium } from "playwright";
const [path, out, lang] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
if (lang) await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3100" }]);
const page = await context.newPage();
await page.goto("http://localhost:3100" + path, { waitUntil: "networkidle" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
