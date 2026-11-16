// Screenshot of one page after scrolling through it, so on-scroll drawings have played:
// node scripts/dev/shot.mjs /tax/france out.png [fr] [width] [dark]
import { chromium } from "playwright";
const [path, out, lang, width, scheme] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: Number(width) || 1280, height: 900 }, colorScheme: scheme === "dark" ? "dark" : "light" });
if (lang && lang !== "en") await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3100" }]);
const page = await context.newPage();
await page.goto("http://localhost:3100" + path, { waitUntil: "networkidle" });
const height = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < height; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
