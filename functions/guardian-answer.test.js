import test from "node:test";
import assert from "node:assert/strict";
import { buildGuardianAnswer, detectGuardianQuestionField } from "./guardian-answer.js";

test("保護者質問の対象項目を判定する", () => {
  assert.equal(detectGuardianQuestionField("今日の点数はどうでしたか"), "scores");
  assert.equal(detectGuardianQuestionField("宿題は終わりましたか"), "completion");
  assert.equal(detectGuardianQuestionField("最近の学習状況を教えて"), "overview");
});

test("学習状況には許可された複数項目をまとめる", () => {
  const result = buildGuardianAnswer("最近の学習状況を教えて", {
    progress: { level: "summary", value: { status: "学習記録あり" } },
    completion: { level: "summary", value: { recorded: 5, completed: 3 } },
    scores: { level: "summary", value: { average: 78 } },
    studyTime: { level: "none", value: { minutes: 999 } }
  });
  assert.match(result.answer, /5件のうち、完了は3件/);
  assert.match(result.answer, /78点/);
  assert.doesNotMatch(result.answer, /999/);
  assert.deepEqual(result.fieldsUsed, ["progress", "completion", "scores"]);
});

test("非公開項目は内容を回答しない", () => {
  const result = buildGuardianAnswer("苦手は何ですか", {
    weaknesses: { level: "none", value: ["秘密"] }
  });
  assert.deepEqual(result.fieldsUsed, []);
  assert.doesNotMatch(result.answer, /秘密/);
});

test("ユイ先生との会話は設定に関係なく回答しない", () => {
  const result = buildGuardianAnswer("ユイ先生と何を話した？", {
    yuiDialogue: { level: "detail", value: "秘密の相談" }
  });
  assert.deepEqual(result.fieldsUsed, []);
  assert.doesNotMatch(result.answer, /秘密の相談/);
});

test("共有された点数だけで回答する", () => {
  const result = buildGuardianAnswer("成績を教えて", {
    scores: { level: "summary", value: { average: 82 } }
  });
  assert.deepEqual(result.fieldsUsed, ["scores"]);
  assert.match(result.answer, /82点/);
});
