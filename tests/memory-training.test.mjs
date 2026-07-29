import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMemoryRating,
  loadMemoryQueue,
  memorySummary,
  recordEnglishTrainingResults
} from "../assets/js/learning/memory.js";

function mockStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

const question = {
  id: "e1",
  prompt: "文型を答えなさい。",
  text: "The leaves turned red.",
  model: "SVC",
  phase: "構造理解",
  video: "基本文型"
};

test("英語10文の誤答を当日の暗記キューへ登録する", () => {
  const storage = mockStorage();
  const now = new Date("2026-07-29T03:00:00.000Z");
  recordEnglishTrainingResults([question], [{ id: "e1", correct: false }], { e1: "SVO" }, now, storage);
  const queue = loadMemoryQueue(storage);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].nextReview, "2026-07-29");
  assert.equal(queue[0].incorrectCount, 1);
});

test("○判定は復習段階を進め、次回を1日後にする", () => {
  const item = { id: "x", stage: 0, nextReview: "2026-07-29" };
  const updated = applyMemoryRating(item, "○", new Date("2026-07-29T03:00:00.000Z"));
  assert.equal(updated.stage, 1);
  assert.equal(updated.nextReview, "2026-07-30");
});

test("復習対象・定着数・正答率を集計する", () => {
  const queue = [
    { id: "a", stage: 1, nextReview: "2026-07-29", correctCount: 2, incorrectCount: 1 },
    { id: "b", stage: 5, nextReview: "2026-08-01", correctCount: 4, incorrectCount: 0 }
  ];
  const summary = memorySummary(queue, new Date("2026-07-29T03:00:00.000Z"));
  assert.equal(summary.due.length, 1);
  assert.equal(summary.mastered, 1);
  assert.equal(summary.accuracy, 86);
});
