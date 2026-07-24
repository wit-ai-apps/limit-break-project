import test from "node:test";
import assert from "node:assert/strict";
import { buildVerifiedLearningIssues, learningIssueId } from "./learning-issues.js";

const baseAnalysis = {
  subject: "数学Ⅰ",
  course: "ベーシックレベル数学Ⅰ",
  lesson: "第3講",
  part: "PART2",
  unit: "二次関数",
  confidence: 0.96,
  needsReview: false,
  answerMarks: [
    {
      label: "問3",
      result: "incorrect",
      markConfidence: 0.99,
      detectedAnswer: "x=2",
      correctAnswer: "x=3"
    },
    {
      label: "問4",
      result: "correct",
      markConfidence: 0.99,
      detectedAnswer: "4",
      correctAnswer: "4"
    }
  ],
  learningIssues: [
    {
      problemLabel: "問3",
      contentSummary: "平方完成後の頂点座標を求める問題",
      domain: "二次関数",
      unit: "平方完成",
      skillTags: ["平方完成", "頂点"],
      mistakeType: "calculation",
      detectedAnswer: "x=2",
      correctAnswer: "x=3",
      confidence: 0.95
    },
    {
      problemLabel: "問4",
      contentSummary: "正解した問題は弱点にしない",
      domain: "二次関数",
      unit: "グラフ",
      skillTags: ["グラフ"],
      mistakeType: "knowledge",
      detectedAnswer: "4",
      correctAnswer: "4",
      confidence: 0.99
    }
  ]
};

test("検証済みの不正解だけを弱点データへ変換する", () => {
  const issues = buildVerifiedLearningIssues(baseAnalysis, {
    recordId: "2026-07-24_math-3",
    storagePath: "students/STU_1/evidence/2026-07-24/math.png"
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].problemLabel, "問3");
  assert.equal(issues[0].subject, "数学Ⅰ");
  assert.equal(issues[0].domain, "二次関数");
  assert.equal(issues[0].mistakeType, "calculation");
  assert.deepEqual(issues[0].skillTags, ["平方完成", "頂点"]);
});

test("要確認または低信頼の解析は弱点DBへ確定保存しない", () => {
  assert.deepEqual(buildVerifiedLearningIssues({ ...baseAnalysis, needsReview: true }), []);
  assert.deepEqual(buildVerifiedLearningIssues({ ...baseAnalysis, confidence: 0.5 }), []);
  const lowMark = structuredClone(baseAnalysis);
  lowMark.answerMarks[0].markConfidence = 0.9;
  assert.deepEqual(buildVerifiedLearningIssues(lowMark), []);
});

test("同じ教科・分野・技能の弱点IDは提出が変わっても同一になる", () => {
  const first = buildVerifiedLearningIssues(baseAnalysis, { recordId: "record-1" })[0];
  const second = buildVerifiedLearningIssues(baseAnalysis, { recordId: "record-2" })[0];
  assert.equal(first.id, second.id);
  assert.equal(learningIssueId(first), learningIssueId(second));
});

test("問題要約とタグは保存上限を超えない", () => {
  const longAnalysis = structuredClone(baseAnalysis);
  longAnalysis.learningIssues[0].contentSummary = "長".repeat(200);
  longAnalysis.learningIssues[0].skillTags = Array.from({ length: 20 }, (_, index) => `タグ${index}`);
  const issue = buildVerifiedLearningIssues(longAnalysis)[0];
  assert.equal(issue.contentSummary.length, 80);
  assert.equal(issue.skillTags.length, 8);
});

