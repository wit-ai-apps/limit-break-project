const path = require("node:path");
const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage();
  await page.goto(process.env.LB_BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#loginName").fill("lb.teacher.20260722@example.com");
  await page.locator("#loginPasscode").fill(process.env.LB_TEST_PASSWORD);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  await page.locator("#scheduleDrawerOpen").click();
  let removed = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const testItems = page.locator(".schedule-countdown-item").filter({ hasText: "E2E共有予定-" });
    const before = await testItems.count();
    if (before === 0) break;
    await testItems.first().locator("[data-delete-schedule]").click();
    await page.waitForFunction((previousCount) => {
      return [...document.querySelectorAll(".schedule-countdown-item")]
        .filter((item) => item.textContent.includes("E2E共有予定-")).length < previousCount;
    }, before, { timeout: 30000 });
    removed += 1;
  }
  console.log(`PASS SCHEDULE_CLEANUP removed=${removed}`);
  await browser.close();
})().catch((error) => {
  console.error(`FAIL SCHEDULE_CLEANUP ${error.message}`);
  process.exitCode = 1;
});
