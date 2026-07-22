const path = require("node:path");

const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));
const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");
const baseUrl = process.env.LB_BASE_URL || "http://127.0.0.1:5500/?e2e=viewers";

const viewers = [
  ["parent", "lb.parent.20260722@example.com", false],
  ["supporter", "lb.supporter.20260722@example.com", false],
  ["teacher", "lb.teacher.20260722@example.com", true]
];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const failures = [];
  for (const [role, email, shouldSeeScore] of viewers) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.locator("#loginName").fill(email);
      await page.locator("#loginPasscode").fill(password);
      await page.locator("#loginForm button[type=submit]").click();
      await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
      await page.getByRole("button", { name: "提出画像", exact: true }).click();
      const row = page.locator(".evidence-table tbody tr").filter({ hasText: "ベーシックレベル数学Ⅰ" }).first();
      await row.waitFor({ state: "visible", timeout: 30000 });
      const text = (await row.textContent()).replace(/\s+/g, " ").trim();
      if (!text.includes("自動分類済み")) throw new Error(`analysis status missing: ${text}`);
      if (shouldSeeScore && !text.includes("80%")) throw new Error(`teacher score missing: ${text}`);
      if (!shouldSeeScore && text.includes("80%")) throw new Error(`score exposed to ${role}: ${text}`);
      console.log(`PASS VIEWER ${role}`);
    } catch (error) {
      failures.push(`${role}: ${error.message}`);
      console.error(`FAIL VIEWER ${role}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
