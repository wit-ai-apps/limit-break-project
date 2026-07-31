import test from "node:test";
import assert from "node:assert/strict";
import {
  ENGLISH_QUESTIONS,
  englishDailyStorageKey,
  englishRemainingTimeMs,
  gradeEnglishTrainingAnswers,
  isTeacherEnglishTrainingRole
} from "../assets/js/training/english-training.js";

test("英文構文デモ10文の模範解答を全問正解にする", () => {
  const answers = Object.fromEntries(ENGLISH_QUESTIONS.map((q) => [q.id, q.answer]));
  const results = gradeEnglishTrainingAnswers(answers);
  assert.equal(results.length, 10);
  assert.equal(results.every((result) => result.correct), true);
});

test("英文トレーニングも30分で終了する", () => {
  const startedAt = "2026-07-29T00:00:00.000Z";
  assert.equal(englishRemainingTimeMs(
    startedAt, new Date("2026-07-29T00:20:00.000Z").getTime()), 10 * 60 * 1000);
});

test("英文トレーニングは日本時間の午前8時55分に日次切替する", () => {
  assert.match(englishDailyStorageKey(new Date("2026-07-28T23:54:59.000Z")), /:2026-07-28$/);
  assert.match(englishDailyStorageKey(new Date("2026-07-28T23:55:00.000Z")), /:2026-07-29$/);
});

test("英語も教師と主任教師は時間制限のない検証対象とする", () => {
  assert.equal(isTeacherEnglishTrainingRole("teacher"), true);
  assert.equal(isTeacherEnglishTrainingRole("lead_teacher"), true);
  assert.equal(isTeacherEnglishTrainingRole("student"), false);
});
