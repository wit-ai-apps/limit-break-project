const path = require("node:path");

const playwrightPath = process.env.PLAYWRIGHT_PATH;
if (!playwrightPath) {
  throw new Error("PLAYWRIGHT_PATH is required.");
}
const { chromium } = require(path.join(playwrightPath, "playwright"));

const baseUrl = process.env.LB_BASE_URL || "http://127.0.0.1:5500/?e2e=1";
const password = process.env.LB_TEST_PASSWORD;
if (!password) throw new Error("LB_TEST_PASSWORD is required.");

const accounts = [
  ["student", "lb.student.20260722@example.com"],
  ["parent", "lb.parent.20260722@example.com"],
  ["supporter", "lb.supporter.20260722@example.com"],
  ["teacher", "lb.teacher.20260722@example.com"]
].filter(([, email]) => !process.env.LB_ACCOUNT_FILTER || email.includes(process.env.LB_ACCOUNT_FILTER));

const roleLabels = {
  student: "本人",
  parent: "保護者",
  supporter: "サポーター",
  teacher: "塾講師"
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const failures = [];
  for (const [expectedRole, email] of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });
    try {
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page.locator("#loginVersionBadge").waitFor({ state: "visible" });
      const version = await page.locator("#loginVersionBadge").textContent();
      if (!/^v\d/.test(String(version || ""))) throw new Error(`version badge invalid: ${version}`);
      await page.locator("#loginName").fill(email);
      await page.locator("#loginPasscode").fill(password);
      await page.locator("#loginForm button[type=submit]").click();
      await page.waitForFunction(() => document.body.dataset.auth === "in", null, { timeout: 30000 });
      const actualRole = await page.locator("body").getAttribute("data-role");
      if (actualRole !== expectedRole) throw new Error(`role ${actualRole}, expected ${expectedRole}`);
      const roleBadge = await page.locator("#sessionRoleBadge").textContent();
      if (!roleBadge.includes(roleLabels[expectedRole])) throw new Error(`role badge invalid: ${roleBadge}`);
      const studentBadge = await page.locator("#sessionStudentBadge").textContent();
      if (!studentBadge.includes("STU_TEST_20260722")) throw new Error(`student badge invalid: ${studentBadge}`);
      await page.locator("#headerLogoutButton").click();
      await page.waitForFunction(() => document.body.dataset.auth === "out", null, { timeout: 15000 });
      if (await page.locator("#loginName").inputValue()) throw new Error("email remained after logout");
      if (await page.locator("#loginPasscode").inputValue()) throw new Error("password remained after logout");
      if (pageErrors.length) throw new Error(`browser errors: ${pageErrors.join(" | ")}`);
      console.log(`PASS ${expectedRole} ${email}`);
    } catch (error) {
      failures.push(`${email}: ${error.message}`);
      console.error(`FAIL ${email}: ${error.message}`);
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
