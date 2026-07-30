import test from "node:test";
import assert from "node:assert/strict";

import {
  dailyStorageKey,
  gradeMathTrainingAnswers,
  mathPreviewMarkup,
  remainingTimeMs
} from "../assets/js/training/math-training.js";

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

test("30分の残り時間は更新しても開始時刻から計算する", () => {
  const startedAt = "2026-07-29T00:00:00.000Z";
  const now = new Date("2026-07-29T00:12:34.000Z").getTime();
  assert.equal(remainingTimeMs(startedAt, now), 17 * 60 * 1000 + 26 * 1000);
  assert.equal(remainingTimeMs(startedAt, now + 18 * 60 * 1000), 0);
});

test("毎日の記録キーは日本時間の午前8時55分に切り替わる", () => {
  assert.equal(
    dailyStorageKey(new Date("2026-07-28T23:54:59.000Z")),
    "limitBreakMathTrainingHighSchoolDay1V2:2026-07-28"
  );
  assert.equal(
    dailyStorageKey(new Date("2026-07-28T23:55:00.000Z")),
    "limitBreakMathTrainingHighSchoolDay1V2:2026-07-29"
  );
});

test("数式入力プレビューは分数と指数を教科書形式で表示する", () => {
  const markup = mathPreviewMarkup("√3/2＋x^2");
  assert.match(markup, /math-input-frac/);
  assert.match(markup, /<sup>2<\/sup>/);
  assert.match(markup, /math-variable">x<\/span>/);
  assert.doesNotMatch(markup, /math-variable">2<\/span>/);
});

test("数式入力プレビューはHTMLを無害化する", () => {
  assert.doesNotMatch(mathPreviewMarkup("<img src=x>"), /<img/);
});
