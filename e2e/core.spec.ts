import { expect, test } from "@playwright/test";

test("dashboard shows the fee ruler and opens a fund from a dot", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find an ETF");
  await page.getByRole("link", { name: /iShares Global Clean Energy.*TER 0\.65%/ }).click();
  await expect(page).toHaveURL(/IE00B1XNHC34/);
});

test("search finds a fund by a secondary ticker", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: /Search ETFs/ }).locator("visible=true").fill("SXR8");
  const option = page.getByRole("option").locator("visible=true").filter({ hasText: "iShares Core S&P 500" });
  await option.getByRole("button").click();
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
  await expect(page.getByRole("status")).toHaveText("2 ETFs");
  await expect(page.getByRole("link", { name: "Reset filters" })).toBeVisible();
});

test("sorting by fee puts missing fees last", async ({ page }) => {
  await page.goto("/screener?sort=fee&dir=desc&pageSize=100");
  const lastRow = page.locator("tbody tr").last();
  await expect(lastRow).toContainText("—");
  await expect(page.locator("tbody tr").first()).toContainText("0.65%");
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
    await expect(page.getByText("We have no price history for this ETF yet.")).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Where it trades" })).toBeVisible();
});

test("a fund with missing facts says so instead of inventing them", async ({ page }) => {
  await page.goto("/etfs/IE00B60SX394");
  await expect(page.getByText("We have no price history for this ETF yet.")).toBeVisible();
  await expect(page.getByText("Not published on the source").first()).toBeVisible();
});

test("an old figure is flagged as out of date", async ({ page }) => {
  await page.goto("/etfs/CH0008899764");
  await expect(page.getByText("Out of date").first()).toBeVisible();
});

test("comparison builds from the tray", async ({ page }) => {
  await page.goto("/indices/sp-500");
  await page.getByRole("button", { name: "Add IE00B5BMR087 to comparison" }).click();
  await page.getByRole("button", { name: "Add IE00BFMXXD54 to comparison" }).click();
  await page.getByRole("link", { name: "Compare 2 ETFs" }).click();
  await expect(page).toHaveURL(/isins=IE00B5BMR087,IE00BFMXXD54/);
  await expect(page.getByRole("heading", { name: "Fees" }).or(page.getByRole("columnheader", { name: "Fees" }))).toBeVisible();
});

test("unbuilt sections say so plainly", async ({ page }) => {
  await page.goto("/tax");
  await expect(page.getByText(/Not built yet/)).toBeVisible();
});

test("an unknown ISIN returns a 404 page", async ({ page }) => {
  const res = await page.goto("/etfs/XX0000000000");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("pages never scroll sideways", async ({ page }) => {
  for (const path of ["/", "/screener", "/etfs", "/indices", "/etfs/IE00B5BMR087", "/compare?isins=IE00B5BMR087,IE00BK5BQT80,IE00BKM4GZ66", "/data", "/pricing"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("API serves the same screener", async ({ request }) => {
  const body = await (await request.get("/api/v1/etfs?index=msci-world&sort=fee")).json();
  expect(body.total).toBeGreaterThanOrEqual(3);
  expect(body.rows[0].ter_pct).toBe(0.2);
  const missing = await request.get("/api/v1/etfs/XX0000000000");
  expect(missing.status()).toBe(404);
});
