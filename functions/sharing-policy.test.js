import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveSharing, normalizeSharingPreferences, resolveSharingRole
} from "./sharing-policy.js";

test("生徒と保護者の狭い設定を採用する", () => {
  const result = effectiveSharing({ scores: "detail" }, { scores: "summary" }, "parent");
  assert.equal(result.scores, "summary");
});

test("外部サポーターへ会話と答案を公開しない", () => {
  const all = Object.fromEntries(["progress", "studyTime", "completion", "scores", "weaknesses",
    "schedule", "evidence", "fatigue", "yuiDialogue", "privateNotes"].map((key) => [key, "detail"]));
  const result = effectiveSharing(all, all, "supporter");
  assert.equal(result.evidence, "none");
  assert.equal(result.yuiDialogue, "none");
  assert.equal(result.privateNotes, "none");
  assert.equal(result.progress, "summary");
});

test("不正な値は非公開に正規化する", () => {
  assert.equal(normalizeSharingPreferences({ scores: "everything" }).scores, "none");
});

test("旧版の連携済み保護者はmember文書なしでも移行できる", () => {
  assert.equal(resolveSharingRole({ role: "parent" }, null), "parent");
  assert.equal(resolveSharingRole({ role: "supporter" }, null), "");
});

test("停止中memberは利用できない", () => {
  assert.equal(resolveSharingRole({ role: "parent" }, { role: "parent", status: "revoked" }), "");
});
