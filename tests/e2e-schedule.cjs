const path = require("node:path");
const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("PLAYWRIGHT_PATH is required.");
const { chromium } = require(path.join(playwrightPath, "playwright"));
const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");
const baseUrl = process.env.LB_BASE_URL || "http://127.0.0.1:5500/?e2e=schedule";

async function login(page, email) {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#loginName").fill(email);
  await page.locator("#loginPasscode").fill(password);
  await page.locator("#loginForm button[type=submit]").click();
  await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
  console.log(`STEP login ${email}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const title = `E2E共有予定-${Date.now()}`;

  const studentContext = await browser.newContext({ acceptDownloads: true });
  const studentPage = await studentContext.newPage();
  await login(studentPage, "lb.student.20260722@example.com");
  await studentPage.locator("#scheduleDrawerOpen").click();
  await studentPage.locator("#scheduleDrawer").waitFor({ state: "visible" });
  const monthTitle = await studentPage.locator("#scheduleMonthTitle").textContent();
  if (!/^\d{4}年\d{1,2}月の予定$/.test(monthTitle || "")) throw new Error(`month title invalid: ${monthTitle}`);
  await studentPage.locator('#scheduleQuickForm [name="scheduleName"]').fill(title);
  await studentPage.locator('#scheduleQuickForm [name="scheduleDate"]').fill("2026-07-31");
  await studentPage.locator('#scheduleQuickForm [name="scheduleNotes"]').fill("英文300選 No.1-60");
  await studentPage.locator("#scheduleQuickForm button[type=submit]").click();
  const studentItem = studentPage.locator(".schedule-countdown-item").filter({ hasText: title });
  await studentItem.waitFor({ state: "visible", timeout: 30000 });
  console.log("STEP student item visible");
  if (!(await studentItem.textContent()).includes("登録者: 本人")) throw new Error("student creator label missing");
  if (process.env.LB_EXPECT_FIREBASE === "true") {
    await studentPage.waitForFunction(() => {
      const text = document.querySelector("#scheduleQuickStatus")?.textContent || "";
      return text.includes("共有予定として追加") || text.includes("Firebase共有に失敗");
    }, null, { timeout: 30000 });
    const saveStatus = await studentPage.locator("#scheduleQuickStatus").textContent();
    if (!saveStatus.includes("共有予定として追加")) throw new Error(saveStatus);
    console.log("STEP Firebase save confirmed");
  }
  const googleHref = await studentItem.locator("a", { hasText: "Googleへ追加" }).getAttribute("href");
  if (!googleHref?.startsWith("https://calendar.google.com/calendar/render?")) throw new Error("Google Calendar link missing");
  const downloadPromise = studentPage.waitForEvent("download");
  await studentPage.locator("#downloadScheduleIcs").click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().endsWith(".ics")) throw new Error("ICS download missing");

  if (process.env.LB_EXPECT_FIREBASE === "true") {
    await studentContext.close();

    const parentContext = await browser.newContext();
    const parentPage = await parentContext.newPage();
    await login(parentPage, "lb.parent.20260722@example.com");
    await parentPage.locator("#scheduleDrawerOpen").click();
    const parentItem = parentPage.locator(".schedule-countdown-item").filter({ hasText: title });
    await parentItem.waitFor({ state: "visible", timeout: 30000 });
    console.log("STEP parent share visible");
    if (await parentItem.locator("[data-delete-schedule]").count()) throw new Error("parent can delete student schedule");
    await parentContext.close();

    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    await login(teacherPage, "lb.teacher.20260722@example.com");
    await teacherPage.locator("#scheduleDrawerOpen").click();
    const teacherItem = teacherPage.locator(".schedule-countdown-item").filter({ hasText: title });
    await teacherItem.waitFor({ state: "visible", timeout: 30000 });
    console.log("STEP teacher share visible");
    await teacherItem.locator("[data-delete-schedule]").click();
    await teacherItem.waitFor({ state: "detached", timeout: 30000 });
    await teacherContext.close();
  } else {
    await studentContext.close();
  }

  await browser.close();
  console.log(`PASS SCHEDULE ${title}`);
})().catch((error) => {
  console.error(`FAIL SCHEDULE ${error.message}`);
  process.exitCode = 1;
});
