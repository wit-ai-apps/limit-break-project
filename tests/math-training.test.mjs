import test from "node:test";
import assert from "node:assert/strict";

import { gradeMathTrainingAnswers } from "../assets/js/training/math-training.js";

test("高校数学スライド式10題の模範解答を全問正解にする", () => {
  const results = gradeMathTrainingAnswers({
    q1: { answer: "8x³−36x²y+54xy²−27y³" },
    q2: { quotient: "2x²−x−1", remainder: "−4x+8" },
    q3: { answer: "x=-3, 3" },
    q4: { x: "7/5", y: "4/5", z: "2" },
    q5: { answer: "2(x−2)²−3" },
    q6: { answer: "5" },
    q7: { answer: "√3/2" },
    q8: { answer: "−i" },
    q9: { answer: "e^x(x+1)^2" },
    q10: { answer: "−8" }
  });

  assert.equal(results.length, 10);
  assert.equal(results.every((result) => result.correct), true);
});

test("空欄は全問不正解として安全に扱う", () => {
  const results = gradeMathTrainingAnswers({});
  assert.equal(results.every((result) => result.correct === false), true);
});
