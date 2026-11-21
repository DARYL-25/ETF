import { expect, test } from "@playwright/test";

test("home shows the ask bar, looks inside a fund and opens a theme's fund", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every ETF in the world");
  await expect(page.getByLabel("Describe what you are looking for")).toBeVisible();
  await expect(page.getByRole("list", { name: /Largest holdings of/ }).getByRole("link").first()).toBeVisible();
  await page.getByRole("tab", { name: "Semiconductors" }).click();
  const row = page.getByRole("table").getByRole("link").first();
  const name = await row.textContent();
  await row.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name!);
});

test("search finds a fund by a secondary ticker", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search ETFs, pages or ask a question" }).click();
  await page.getByRole("combobox", { name: /Search ETFs/ }).fill("SXR8");
  await page.getByRole("option").filter({ hasText: "iShares Core S&P 500" }).getByRole("button").click();
  await expect(page).toHaveURL(/IE00B5BMR087/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("iShares Core S&P 500");
});

test("screener filters through the URL and reads back from a shared link", async ({ page, isMobile }) => {
  await page.goto("/screener");
  await expect(page.getByRole("status")).toHaveText(/ETFs$/);
  if (isMobile) await page.getByText("Filters", { exact: true }).click();
  await page.getByRole("checkbox", { name: /^Bonds/ }).locator("visible=true").check();
  await expect(page).toHaveURL(/assetClass=fixed_income/);
  await expect(page.getByRole("status")).not.toHaveText("37 ETFs");

  await page.goto("/screener?index=sp-500&distribution=accumulating&feeMax=0.07&sort=fee");
  await expect(page.getByRole("status")).toHaveText(/\d+ ETFs?$/);
  await expect(page.getByRole("link", { name: "Reset filters" })).toBeVisible();
});

test("sorting by fee shows funds with a fee first", async ({ page }) => {
  await page.goto("/screener?index=msci-world&sort=fee&dir=desc");
  await expect(page.locator("tbody tr").first()).toContainText("%");
});

test("table columns can be changed and stay in the link", async ({ page, isMobile }) => {
  test.skip(isMobile, "Same form on phones; the desktop run covers it.");
  await page.goto("/screener?cols=domicile,replication");
  await expect(page.getByRole("columnheader", { name: "Domicile" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Index" })).toHaveCount(0);
});

test("profile shows source, fee type and a working chart", async ({ page }) => {
  await page.goto("/etfs/IE00BK5BQT80");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("FTSE All-World");
  await expect(page.getByText("OCF", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the source" })).toHaveAttribute("href", /vanguard/);
  // Price files are private and may be absent, in which case the page must say so.
  const hasPrices = (await page.request.get("/api/v1/etfs/IE00BK5BQT80/prices")).ok();
  if (hasPrices) {
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.getByRole("button", { name: "MAX" }).click();
    await expect(page.getByText(/over the full history/)).toBeVisible();
  } else {
    await expect(page.getByText(/We have no price history for this ETF yet|We started collecting|collected by us since/)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Where it trades" })).toBeVisible();
});

test("a fund with missing facts says so instead of inventing them", async ({ page }) => {
  await page.goto("/etfs/IE00B60SX394");
  await expect(page.getByText("Not published on the source").first()).toBeVisible();
  await expect(page.getByText("Not loaded yet").first()).toBeVisible();
});

test("an old figure is flagged as out of date", async ({ page }) => {
  await page.goto("/etfs/CH0008899764");
  await expect(page.getByText("Out of date").first()).toBeVisible();
});

test("comparison builds from the tray", async ({ page }) => {
  await page.goto("/indices/sp-500?all=1");
  await page.getByRole("button", { name: "Add IE00B5BMR087 to comparison" }).click();
  await page.getByRole("button", { name: "Add IE00BFMXXD54 to comparison" }).click();
  await page.getByRole("link", { name: "Compare 2 ETFs" }).click();
  await expect(page).toHaveURL(/isins=IE00B5BMR087,IE00BFMXXD54/);
  await expect(page.getByRole("heading", { name: "Fees" }).or(page.getByRole("columnheader", { name: "Fees" }))).toBeVisible();
});

test("tax notes quote official sources and say they are unreviewed", async ({ page }) => {
  await page.goto("/tax");
  await page.getByRole("link", { name: /Switzerland/ }).first().click();
  await expect(page.getByRole("heading", { name: "Gains from selling are tax-free for private investors" })).toBeVisible();
  await expect(page.getByText(/No tax adviser has reviewed this page/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Federal Tax Administration, taxes in force/ }).first()).toHaveAttribute("href", /estv/);
  await page.goto("/tax/france");
  await expect(page.getByText(/31\.4%/).first()).toBeVisible();
  expect((await page.goto("/tax/atlantis"))?.status()).toBe(404);
});

test("choosing a country changes what an ETF page shows", async ({ page }) => {
  await page.goto("/etfs/IE00B5BMR087");
  await expect(page.getByRole("heading", { name: "Where do you live?" })).toBeVisible();
  await page.getByLabel("Choose the country you invest from").click();
  await page.getByRole("button", { name: /^Switzerland/ }).click();
  await expect(page.getByRole("heading", { name: "For an investor in Switzerland" })).toBeVisible();
  await expect(page.getByText(/keeps its income, and that income is still taxable each year/)).toBeVisible();
  await page.goto("/screener");
  await expect(page.getByLabel("Quick filters").getByRole("link").first()).toHaveText("Listed on SIX");
});

test("the data page shows the update schedule with last runs", async ({ page }) => {
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "Update schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prices", exact: true })).toBeVisible();
  await expect(page.getByText(/Tuesday to Saturday/)).toBeVisible();
});

test("a basic record has the same page, with a dated price and no invented facts", async ({ page }) => {
  await page.goto("/screener?q=VOO&hasFee=1");
  await page.getByRole("link", { name: "Vanguard S&P 500 ETF", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vanguard S&P 500 ETF");
  await expect(page.getByLabel("Key figures")).toContainText("0.03%");
  await expect(page.getByText(/No person has checked them yet/)).toBeVisible();
});

test("screener results export to CSV", async ({ request }) => {
  const res = await request.get("/api/v1/etfs/export?index=sp-500&hasFee=1");
  expect(res.headers()["content-type"]).toContain("text/csv");
  const lines = (await res.text()).split("\n");
  expect(lines[0]).toContain("name,isin,ticker");
  expect(lines.length).toBeGreaterThan(5);
});

test("an unknown ISIN returns a 404 page", async ({ page }) => {
  const res = await page.goto("/etfs/XX0000000000");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("pages never scroll sideways", async ({ page }) => {
  for (const path of ["/", "/screener", "/etfs", "/indices", "/etfs/IE00B5BMR087", "/compare?isins=IE00B5BMR087,IE00BK5BQT80,IE00BKM4GZ66", "/data", "/pricing", "/tax/switzerland", "/assistant?q=Nasdaq-100%20ETF%20for%20a%20Swiss%20investor", "/academy", "/etfs/ARCX-VOO"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("API serves the same screener", async ({ request }) => {
  const body = await (await request.get("/api/v1/etfs?index=msci-world&sort=fee")).json();
  expect(body.total).toBeGreaterThanOrEqual(3);
  expect(typeof body.rows[0].headline_fee_pct).toBe("number");
  const missing = await request.get("/api/v1/etfs/XX0000000000");
  expect(missing.status()).toBe(404);
});

test("a lesson's quiz marks progress on the academy page", async ({ page }) => {
  await page.goto("/academy/isin-ticker-listing");
  await page.getByRole("button", { name: "ISIN", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("2 of 2 correct")).toBeVisible();
  await page.getByRole("button", { name: "Mark lesson as done" }).click();
  await page.goto("/academy");
  await expect(page.getByText("1 of 4 lessons done")).toBeVisible();
});

test("the fee calculator responds to input", async ({ page }) => {
  await page.goto("/academy/calculators");
  await expect(page.getByText(/less\.$/).first()).toBeVisible();
  await page.getByLabel("Years").first().fill("10");
  await expect(page.getByText(/With 0.07%/)).toBeVisible();
});

test("an ETF can be saved to a watchlist and shows its data", async ({ page, isMobile }) => {
  test.skip(isMobile, "Same components; the desktop run covers it.");
  await page.goto("/etfs/IE00B4L5Y983");
  await page.getByText("Add to watchlist").click();
  await page.getByRole("button", { name: "Create a list with this ETF" }).click();
  await page.goto("/watchlists");
  await expect(page.getByRole("link", { name: /Core MSCI World/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "0.20%" })).toBeVisible();
});

test("a hypothetical portfolio values a position from NAV", async ({ page, isMobile }) => {
  test.skip(isMobile, "Same components; the desktop run covers it.");
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Create portfolio" }).click();
  await page.getByLabel("Find an ETF").click();
  await page.getByLabel("Find an ETF").fill("IE00BFZXGZ5");
  await page.getByLabel("Find an ETF").fill("IE00B4K48X80");
  await page.getByRole("button", { name: /Core MSCI Europe/ }).first().click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Value");
});

test("the AI search answers a Swiss Nasdaq-100 request", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByLabel("Describe what you are looking for").fill("Nasdaq-100 ETF for a Swiss investor");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Closest matches" })).toBeVisible();
  await expect(page.getByText(/Nasdaq|NASDAQ/).first()).toBeVisible();
  await expect(page.getByText(/Tax is not scored in this ranking/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the tax notes" })).toHaveAttribute("href", "/tax/switzerland");
});

test("the site switches to French and back, and French questions work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Passer en français" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tous les ETF du monde");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("button", { name: "ETF Nasdaq-100 pour un investisseur suisse" }).click();
  await expect(page.getByRole("heading", { name: "Meilleures correspondances" })).toBeVisible();
  await expect(page.getByText(/La fiscalité n'entre pas dans ce classement/)).toBeVisible();
  await expect(page.getByText(/Frais 0,\d\d %/).first()).toBeVisible();
  await page.goto("/tax/france");
  await expect(page.getByRole("heading", { name: /Le prélèvement forfaitaire sur les plus-values est de 31,4 %/ })).toBeVisible();
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { name: /The flat tax on gains is 31\.4%/ })).toBeVisible();
});

test("overlap and holders come from issuers' holdings files", async ({ page }) => {
  await page.goto("/compare?isins=ARCX-SPY,ARCX-XLK");
  await expect(page.getByRole("heading", { name: "Overlap" })).toBeVisible();
  await expect(page.getByText(/shared holdings/).first()).toBeVisible();
  await page.goto("/holdings?q=nvidia");
  await page.getByRole("link", { name: /NVIDIA/i }).first().click();
  await expect(page.getByRole("columnheader", { name: "Weight in the fund" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(10);
});

test("an ETF page turns its fee into money and shows what the fund holds", async ({ page }) => {
  await page.goto("/etfs/ARCX-SPY");
  await expect(page.getByRole("heading", { name: "What this fee costs in money" })).toBeVisible();
  await page.getByLabel(/^Years/).fill("20");
  await expect(page.getByText(/Over 20 years, a 0\.\d\d% fee takes about/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "What it holds" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sectors" })).toBeVisible();
});

test("themes group ETFs from every market and can be compared", async ({ page }) => {
  await page.goto("/themes");
  await expect(page.getByRole("heading", { level: 1, name: "Themes" })).toBeVisible();
  await page.getByRole("link", { name: /Semiconductors/ }).first().click();
  await expect(page).toHaveURL(/\/themes\/semiconductors/);
  await expect(page.getByRole("heading", { level: 1, name: "Semiconductors ETFs" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Semiconductor/ }).first()).toBeVisible();
  await page.getByRole("link", { name: /United States/ }).click();
  await expect(page).toHaveURL(/market=us/);
  await expect(page.getByRole("link", { name: /Compare the first/ })).toBeVisible();
});

test("the halal theme says who certifies compliance", async ({ page }) => {
  await page.goto("/themes/shariah");
  await expect(page.getByText(/certified by each fund's own Shariah board/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Islamic|Shariah|Sharia|Sukuk/ }).first()).toBeVisible();
});

test("French addresses show French and point search engines to both languages", async ({ page }) => {
  await page.goto("/fr/themes/defense");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Défense");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/themes\/defense$/);
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", /\/themes\/defense$/);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/themes\/defense$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("terms, privacy and the legal notice are published and marked as drafts", async ({ page }) => {
  for (const [path, title] of [["/legal/terms", "Terms of use"], ["/legal/privacy", "Privacy"], ["/legal/notice", "Legal notice"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/A lawyer has not reviewed this text yet/)).toBeVisible();
  }
});
