const path = require("node:path");

const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));

const baseUrl = process.env.LB_BASE_URL || "http://127.0.0.1:5500/?responsive=1";
const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");

const sizes = [
  { name: "split-pc", width: 1000, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "tablet-landscape", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 }
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const failures = [];

  for (const size of sizes) {
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.locator("#loginName").fill("lb.student.20260722@example.com");
      await page.locator("#loginPasscode").fill(password);
      await page.locator("#loginForm button[type=submit]").click();
      await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });

      await page.locator("#uiModeToggleButton").click();
      if ((await page.locator("body").getAttribute("data-ui-mode")) !== "focus") {
        throw new Error("focus mode did not activate");
      }
      if (await page.locator("#appNav .nav-button").count() !== 6) {
        throw new Error("focus navigation should contain 5 views and update button");
      }

      for (const label of ["今日", "提出", "進み具合", "AI先生"]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        const activeGeometry = await page.evaluate(() => {
          const active = [...document.querySelectorAll(".view-section")]
            .find((element) => getComputedStyle(element).display !== "none" && element.getBoundingClientRect().width > 0);
          const shell = document.querySelector(".shell");
          if (!active || !shell) return null;
          const activeRect = active.getBoundingClientRect();
          const shellRect = shell.getBoundingClientRect();
          return {
            leftGap: activeRect.left - shellRect.left,
            activeWidth: activeRect.width,
            shellWidth: shellRect.width
          };
        });
        if (activeGeometry && size.width >= 1000 &&
            (activeGeometry.leftGap > 80 || activeGeometry.activeWidth < activeGeometry.shellWidth * 0.7)) {
          throw new Error(`active view pushed aside: ${JSON.stringify(activeGeometry)}`);
        }
      }

      await page.getByRole("button", { name: "いまやる", exact: true }).click({ force: true });
      const todayLabel = await page.locator("#todayDateLabel").textContent();
      if (!/7(?:月|\/)24/.test(String(todayLabel))) {
        throw new Error(`today label is stale: ${todayLabel}`);
      }

      const geometry = await page.evaluate(() => {
        const main = document.querySelector("main");
        const columns = main ? getComputedStyle(main).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
        return {
          viewport: window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          columns
        };
      });
      if (geometry.pageWidth > geometry.viewport + 2) {
        throw new Error(`page overflow ${geometry.pageWidth}px > ${geometry.viewport}px`);
      }
      if (size.width <= 1180 && geometry.columns !== 1) {
        throw new Error(`compact layout has ${geometry.columns} main columns`);
      }
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      console.log(`PASS ${size.name} ${size.width}x${size.height}`);
    } catch (error) {
      failures.push(`${size.name}: ${error.message}`);
      console.error(`FAIL ${size.name}: ${error.message}`);
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
