const os = require("node:os");
const path = require("node:path");

const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));

const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");
const baseUrl = process.env.LB_BASE_URL || "http://127.0.0.1:5500/?e2e=ai";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const fixturePage = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await fixturePage.setContent(`<!doctype html><html lang="ja"><body style="font-family:sans-serif;padding:60px;background:white;color:#111">
    <h1>ベーシックレベル数学Ⅰ</h1>
    <h2>第1講 PART 1　二次関数　確認テスト</h2>
    <p style="font-size:30px">回答数：10問</p>
    <p style="font-size:30px">正解数：8問</p>
    <p style="font-size:42px;font-weight:bold">正答率 80%</p>
  </body></html>`);
  const fixturePath = path.join(os.tmpdir(), `limit-break-ai-e2e-${Date.now()}.png`);
  await fixturePage.screenshot({ path: fixturePath, fullPage: true });
  await fixturePage.close();

  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#loginName").fill("lb.student.20260722@example.com");
  await page.locator("#loginPasscode").fill(password);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  await page.getByRole("button", { name: "提出画像", exact: true }).click();
  await page.locator("#randomEvidenceImage").setInputFiles(fixturePath);
  await page.locator("#randomEvidenceSubmitButton").click();
  const row = page.locator(".evidence-table tbody tr").filter({ hasText: path.basename(fixturePath) }).first();
  await row.waitFor({ state: "visible", timeout: 60000 });
  await page.waitForFunction((fileName) => {
    const rows = [...document.querySelectorAll(".evidence-table tbody tr")];
    const row = rows.find((item) => item.textContent.includes(fileName));
    if (!row) return false;
    const text = row.textContent;
    return text.includes("自動分類済み") || text.includes("要確認") || text.includes("解析エラー");
  }, path.basename(fixturePath), { timeout: 180000 });
  const rowText = (await row.textContent()).replace(/\s+/g, " ").trim();
  if (rowText.includes("解析エラー")) throw new Error(`AI analysis failed: ${rowText}`);
  if (!rowText.includes("Firebase")) {
    const diagnostic = await page.evaluate((fileName) => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith("limitBreakProjectRecords")) continue;
        try {
          const records = JSON.parse(localStorage.getItem(key) || "[]");
          const record = records.find((item) => item.evidenceImageName === fileName);
          if (record) return String(record.firebaseSyncError || record.firebaseSyncStatus || "unknown").slice(0, 300);
        } catch (_) {}
      }
      return "record_not_found";
    }, path.basename(fixturePath));
    throw new Error(`Firebase sync failed (${diagnostic}): ${rowText}`);
  }
  if (rowText.includes("AI解析待ち")) throw new Error(`AI fields were not updated: ${rowText}`);
  if (errors.length) throw new Error(`browser errors: ${errors.join(" | ")}`);
  console.log(`PASS AI_UPLOAD ${rowText}`);
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(`FAIL AI_UPLOAD ${error.message}`);
  process.exitCode = 1;
});
