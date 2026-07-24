const path = require("node:path");

const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));

const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("http://127.0.0.1:5500/?e2e=v416-local", { waitUntil: "networkidle" });
  await page.locator("#loginName").fill("lb.student.20260722@example.com");
  await page.locator("#loginPasscode").fill(password);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("limitBreakProjectRecords")) || "limitBreakProjectRecordsV120";
    const records = JSON.parse(localStorage.getItem(key) || "[]");
    records.push({
      date: "2026-07-24",
      missionId: `local_failed_${Date.now()}`,
      missionTitle: "ローカル失敗記録",
      subject: "AI解析待ち",
      course: "AI解析待ち",
      testType: "AI画像確認テスト",
      evidenceImageName: "local-failed.pdf",
      evidenceImageType: "application/pdf",
      evidenceImageData: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK",
      firebaseSyncStatus: "error",
      aiAnalysisStatus: "needs_review",
      savedAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(records));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  await page.getByRole("button", { name: "提出画像", exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.view === "evidence", null, { timeout: 30000 });

  const pdfInput = page.locator("#randomEvidenceImage");
  const accept = await pdfInput.getAttribute("accept");
  if (!accept.includes("application/pdf")) throw new Error("PDF accept is missing.");

  const row = page.locator(".evidence-table tbody tr").filter({ hasText: "local-failed.pdf" }).first();
  await row.waitFor({ state: "visible" });
  await page.waitForTimeout(3000);
  const deleteButton = row.getByRole("button", { name: "削除", exact: true });
  if (!(await deleteButton.isVisible())) throw new Error("Delete button disappeared after sync.");
  if (!(await row.getByRole("button", { name: "共有", exact: true }).isVisible())) {
    throw new Error("Share button is missing.");
  }
  await deleteButton.click();
  await row.waitFor({ state: "detached" });
  await page.locator(".nav-button").filter({ hasText: "進み具合" }).click();
  await page.waitForFunction(() => document.body.dataset.view === "progress");
  await page.locator(".nav-button").filter({ hasText: "AI先生" }).click();
  await page.waitForFunction(() => document.body.dataset.view === "ai");
  await page.goBack();
  await page.waitForFunction(() => document.body.dataset.view === "progress");
  console.log("PASS local: PDF / persistent delete / share / deletion / back history");
  await browser.close();
})().catch((error) => {
  console.error(`FAIL v4.16 local: ${error.message}`);
  process.exitCode = 1;
});
