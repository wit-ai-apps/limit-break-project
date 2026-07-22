const path = require("node:path");
const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));
const email = process.env.LB_REGISTRATION_EMAIL;
const password = process.env.LB_TEST_PASSWORD;
if (!email || !password) throw new Error("LB_REGISTRATION_EMAIL and LB_TEST_PASSWORD are required.");
const baseUrl = process.env.LB_BASE_URL;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#loginName").fill(email);
  await page.locator("#loginPasscode").fill(password);
  await page.locator("#registerAccountButton").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  if (await page.locator("body").getAttribute("data-role") !== "student") throw new Error("new account role mismatch");
  await page.locator("#headerLogoutButton").click();
  await page.waitForFunction(() => document.body.dataset.auth === "out", null, { timeout: 15000 });
  await page.locator("#loginName").fill(email);
  await page.locator("#loginPasscode").fill(password);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  console.log(`PASS REGISTRATION ${email}`);
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(`FAIL REGISTRATION ${error.message}`);
  process.exitCode = 1;
});
