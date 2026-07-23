import test from "node:test";
import assert from "node:assert/strict";
import {
  canDeleteSchedule,
  googleCalendarUrl,
  scheduleCreatorLabel
} from "../assets/js/schedule/schedule-store.js";

const schedule = {
  id: "goal_test",
  exam_name: "英語到達度テスト",
  date_start: "2026-07-31",
  date_end: "2026-07-31",
  notes: "英文300選 No.1-60",
  created_by_uid: "student-1",
  created_by_role: "student",
  source: "custom"
};

test("shows the creator role", () => {
  assert.equal(scheduleCreatorLabel(schedule), "本人");
  assert.equal(scheduleCreatorLabel({ ...schedule, created_by_role: "parent" }), "保護者");
  assert.equal(scheduleCreatorLabel({ source: "fixed" }), "学校・運営");
});

test("limits deletion to the creator or teacher", () => {
  assert.equal(canDeleteSchedule(schedule, { uid: "student-1" }, "student"), true);
  assert.equal(canDeleteSchedule(schedule, { uid: "parent-1" }, "parent"), false);
  assert.equal(canDeleteSchedule(schedule, { uid: "teacher-1" }, "teacher"), true);
  assert.equal(canDeleteSchedule({ source: "fixed" }, { uid: "teacher-1" }, "teacher"), false);
});

test("creates an all-day Google Calendar URL", () => {
  const url = new URL(googleCalendarUrl(schedule));
  assert.equal(url.hostname, "calendar.google.com");
  assert.equal(url.searchParams.get("text"), "英語到達度テスト");
  assert.equal(url.searchParams.get("dates"), "20260731/20260801");
});
