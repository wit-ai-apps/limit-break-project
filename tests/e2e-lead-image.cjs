const path = require("node:path");
const { chromium } = require(path.join(process.env.PLAYWRIGHT_PATH, "playwright"));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(process.env.LB_BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#loginName").fill("lb.teacher.20260722@example.com");
  await page.locator("#loginPasscode").fill(process.env.LB_TEST_PASSWORD);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  console.log(`ROLE=${await page.locator("body").getAttribute("data-role")}`);
  console.log(`DASHBOARD=${(await page.locator("#roleDashboard").innerText()).slice(0, 500)}`);
  console.log(`PRE_TARGET_ERRORS=${errors.join(" | ")}`);
  const target = page.locator('[data-lead-student-id="STU_0001"]');
  await target.waitFor({ state: "visible", timeout: 30000 });
  await target.click();
  await page.getByRole("button", { name: "提出画像", exact: true }).click();
  const imageButtons = page.getByRole("button", { name: /254\.png/ });
  await imageButtons.first().waitFor({ state: "visible", timeout: 30000 });
  console.log(`IMAGE_BUTTONS=${await imageButtons.count()}`);
  for (let index = 0; index < await imageButtons.count(); index += 1) {
    const imageButton = imageButtons.nth(index);
    console.log(`BUTTON_${index}=${JSON.stringify(await imageButton.evaluate((element) => ({
      key: element.dataset.evidenceKey,
      html: element.outerHTML.slice(0, 500)
    })))}`);
    await imageButton.click();
    await page.waitForTimeout(500);
    console.log(`DIALOG_AFTER_${index}=${await page.locator("#evidencePreviewDialog").getAttribute("open")}`);
    console.log(`ERRORS_AFTER_${index}=${errors.join(" | ")}`);
    if (await page.locator("#evidencePreviewDialog[open]").count()) break;
  }
  await page.locator("#evidencePreviewDialog[open]").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#evidencePreviewImage").waitFor({ state: "visible", timeout: 15000 });
  console.log(`IMAGE_SRC=${Boolean(await page.locator("#evidencePreviewImage").getAttribute("src"))}`);
  console.log(`MARKS=${await page.locator("#evidenceMarkLayer .evidence-mark").count()}`);
  console.log(`ERRORS=${errors.join(" | ")}`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
