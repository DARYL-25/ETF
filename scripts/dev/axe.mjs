// Accessibility check of the main pages with axe. Run against a started site: node scripts/dev/axe.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
const base = process.env.BASE ?? "http://localhost:3100";
const pages = ["/", "/screener", "/etfs/IE00B6YX5C33", "/compare?isins=ARCX-SPY,IE00B6YX5C33", "/indices", "/holdings", "/tax/switzerland", "/data", "/pricing", "/academy", "/assistant", "/watchlists", "/portfolio", "/login"];
const browser = await chromium.launch();
let total = 0;
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme });
  const page = await context.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    for (const v of violations) {
      total += v.nodes.length;
      console.log(`${scheme} ${path}: ${v.id} (${v.impact}) x${v.nodes.length}`);
      for (const n of v.nodes.slice(0, 3)) console.log("   ", n.html.slice(0, 140), "|", (n.any[0]?.message ?? n.none[0]?.message ?? "").slice(0, 120));
    }
  }
  await context.close();
}
await browser.close();
console.log(total ? `${total} problems` : "No problems found");
