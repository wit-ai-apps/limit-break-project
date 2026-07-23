import test from "node:test";
import assert from "node:assert/strict";
import { buildAdaptivePlan, decideVideoRoute } from "./adaptive-scheduler.js";

const recent = { date: "2026-07-23", answeredCount: 10, aiAnalysisStatus: "completed", aiAnalysis: { confidence: 0.95 } };

test("uses diagnostic first when no reliable evidence exists", () => {
  assert.equal(decideVideoRoute(null, "2026-07-23").route, "diagnostic_first");
  assert.equal(decideVideoRoute({ ...recent, score: 90, answeredCount: 3 }, "2026-07-23").route, "diagnostic_first");
  assert.equal(decideVideoRoute({ ...recent, score: 90, date: "2026-07-01" }, "2026-07-23").route, "diagnostic_first");
});

test("maps confirmation score to the video route", () => {
  assert.equal(decideVideoRoute({ ...recent, score: 90 }, "2026-07-23").route, "skip_video");
  assert.equal(decideVideoRoute({ ...recent, score: 75 }, "2026-07-23").route, "short_review");
  assert.equal(decideVideoRoute({ ...recent, score: 60 }, "2026-07-23").route, "rewatch");
  assert.equal(decideVideoRoute({ ...recent, score: 40 }, "2026-07-23").route, "rebuild");
});

test("recalculates remaining workload against August 31", () => {
  const plan = buildAdaptivePlan({
    studentId: "STU_TEST",
    today: "2026-07-23",
    deadline: "2026-08-31",
    records: [{
      ...recent,
      score: 90,
      course: "ベーシックレベル数学Ⅰ",
      lesson: "第1講",
      part: "PART1"
    }]
  });
  assert.equal(plan.daysRemaining, 39);
  assert.equal(plan.originalPlanDays, 57);
  assert.equal(plan.coursePlans[0].completedUnits, 1);
  assert.equal(plan.coursePlans[0].remainingUnits, 47);
  assert.equal(plan.coursePlans[1].route, "diagnostic_first");
  assert.ok(plan.dailyActions.every((action) => action.minutes > 0));
});
