import test from "node:test";
import assert from "node:assert/strict";
import { filterSupportSummary, supportSummaryAccessFields } from "./support-summary.js";

test("非公開項目を応答から除外する", () => {
  const result = filterSupportSummary(
    { progress: 50, scores: 80, evidence: ["secret"] },
    { progress: "summary", scores: "none", evidence: "none" }
  );
  assert.deepEqual(Object.keys(result), ["progress"]);
  assert.equal(result.progress.value, 50);
});

test("閲覧履歴には実際に返した項目だけを記録する", () => {
  assert.deepEqual(supportSummaryAccessFields({
    progress: { level: "summary", value: 50 },
    scores: { level: "none", value: null }
  }), ["progress"]);
});
