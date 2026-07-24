const os = require("node:os");
const path = require("node:path");

const { chromium } = require(path.join(process.env.PLAYWRIGHT_PATH, "playwright"));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const fixture = await browser.newPage({ viewport: { width: 500, height: 300 } });
  await fixture.setContent("<h1>数学 確認テスト</h1><p>正答率 80%</p>");
  const filePath = path.join(os.tmpdir(), `limit-break-upload-diagnostic-${Date.now()}.png`);
  await fixture.screenshot({ path: filePath });
  await fixture.close();

  const page = await browser.newPage();
  const network = [];
  page.on("requestfailed", (request) => {
    if (request.url().includes("firebasestorage")) {
      network.push(`FAILED ${request.failure()?.errorText || ""}`);
    }
  });
  page.on("response", (response) => {
    if (response.url().includes("firebasestorage")) {
      network.push(`HTTP ${response.status()} ${response.url().split("?")[0].slice(-100)}`);
    }
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(process.env.LB_BASE_URL, { waitUntil: "networkidle" });
  await page.locator("#loginName").fill("lb.student.20260722@example.com");
  await page.locator("#loginPasscode").fill(process.env.LB_TEST_PASSWORD);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  await page.locator(".nav-button").filter({ hasText: /提出画像|提出/ }).first().click({ force: true });
  await page.waitForFunction(() => document.body.dataset.view === "evidence");
  await page.locator("#randomEvidenceImage").setInputFiles(filePath);
  await page.locator("#randomEvidenceSubmitButton").click();
  await page.waitForFunction(() => {
    const logs = JSON.parse(localStorage.getItem("limitBreakDiagnosticLogV1") || "[]");
    return logs.some((entry) => entry.event === "evidence.sync.complete" || entry.event === "evidence.sync.error");
  }, null, { timeout: 110000 });
  const logs = await page.evaluate(() => JSON.parse(localStorage.getItem("limitBreakDiagnosticLogV1") || "[]")
    .filter((entry) => entry.event.startsWith("evidence.")));
  console.log(JSON.stringify({ network, logs }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
