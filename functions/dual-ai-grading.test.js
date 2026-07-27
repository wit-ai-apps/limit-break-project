import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, reconcileGradingAnalyses } from "./dual-ai-grading.js";

function mark(overrides = {}) {
  return {
    label: "(1)x",
    result: "correct",
    x: 30,
    y: 40,
    detectedAnswer: "2√6",
    correctAnswer: "2√6",
    markConfidence: 0.98,
    evidenceBasis: "計算結果と一致",
    ...overrides
  };
}

test("表記ゆれを正規化する", () => {
  assert.equal(normalizeAnswer("（ 3, −1 ）°"), "3-1");
});

test("2つのAIが一致した採点だけを候補にする", () => {
  const result = reconcileGradingAnalyses(
    { answerMarks: [mark()] },
    { answerMarks: [mark({ label: "問1 x", x: 31, y: 41 })] }
  );
  assert.equal(result.consensusMarks.length, 1);
  assert.equal(result.disagreements.length, 0);
  assert.equal(result.consensusMarks[0].verification, "dual_ai_consensus");
});

test("正答計算が割れた設問は要確認へ送る", () => {
  const result = reconcileGradingAnalyses(
    { answerMarks: [mark()] },
    { answerMarks: [mark({ correctAnswer: "2√5", result: "incorrect" })] }
  );
  assert.equal(result.consensusMarks.length, 0);
  assert.equal(result.disagreements.length, 1);
  assert.match(result.disagreements[0].reason, /正答/);
});

test("高い自己申告でも手書き読取が割れたら採用しない", () => {
  const result = reconcileGradingAnalyses(
    { answerMarks: [mark({ detectedAnswer: "720", markConfidence: 0.99 })] },
    { answerMarks: [mark({ detectedAnswer: "120", markConfidence: 0.99 })] }
  );
  assert.equal(result.consensusMarks.length, 0);
  assert.match(result.disagreements[0].reason, /読取/);
});

test("片方だけが検出した解答欄も要確認へ送る", () => {
  const result = reconcileGradingAnalyses(
    { answerMarks: [] },
    { answerMarks: [mark()] }
  );
  assert.equal(result.disagreements.length, 1);
  assert.match(result.disagreements[0].reason, /第一採点AI/);
});
