import test from "node:test";
import assert from "node:assert/strict";
import { buildMaterialStudyPlan } from "./material-planner.js";

test("builds a feasible plan from a PDF profile and preferences", () => {
  const plan = buildMaterialStudyPlan(
    { detectedPageCount: 60, difficulty: "basic", estimatedUnits: 10 },
    { deadline: "2026-08-30", weeklyStudyDays: 6, dailyMinutes: 60 },
    new Date("2026-08-01T00:00:00+09:00")
  );
  assert.equal(plan.feasibility, "comfortable");
  assert.equal(plan.dailyTasks[0].steps.length, 4);
  assert.deepEqual(plan.reviewCadenceDays, [1, 3, 7]);
});

test("does not hide an overloaded school-required plan", () => {
  const plan = buildMaterialStudyPlan(
    { detectedPageCount: 500, difficulty: "advanced", estimatedUnits: 40 },
    { designation: "school_required", deadline: "2026-08-07", weeklyStudyDays: 3, dailyMinutes: 30 },
    new Date("2026-08-01T00:00:00+09:00")
  );
  assert.equal(plan.feasibility, "overloaded");
  assert.match(plan.recommendation, /時間不足/);
  assert.match(plan.priorityPolicy, /学校指定/);
});
