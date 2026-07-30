import test from "node:test";
import assert from "node:assert/strict";
import { buildMathParentReview, gradeMathSubmission, validTrainingDateKey } from "./math-training-review.js";

const correctAnswers = {
  q1: { answer: "8x^3-36x^2y+54xy^2-27y^3" },
  q2: { quotient: "2x^2-x-1", remainder: "-4x+8" },
  q3: { answer: "-3,3" },
  q4: { x: "7/5", y: "4/5", z: "2" },
  q5: { answer: "2(x-2)^2-3" },
  q6: { answer: "5" },
  q7: { answer: "√3/2" },
  q8: { answer: "-i" },
  q9: { answer: "e^x(x+1)^2" },
  q10: { answer: "-8" }
};

test("server grades all ten math answers", () => {
  assert.equal(gradeMathSubmission(correctAnswers).filter((item) => item.correct).length, 10);
});

test("parent review contains student and model answers", () => {
  const review = buildMathParentReview({ answers: correctAnswers, submitted_at: "2026-07-30T01:00:00.000Z" });
  assert.equal(review.correctCount, 10);
  assert.equal(review.items.length, 10);
  assert.equal(review.items[0].studentAnswer.includes("8x"), true);
  assert.equal(review.items[0].modelAnswer.includes("8x"), true);
});

test("training date key is strict", () => {
  assert.equal(validTrainingDateKey("2026-07-30"), true);
  assert.equal(validTrainingDateKey("../users"), false);
});
