import test from "node:test";
import assert from "node:assert/strict";
import { canRenderEvidenceRecord } from "../assets/js/evidence/evidence-policy.js";
import {
  gradingReviewReasonText,
  gradingSummaryText,
  humanGradingPanelHtml,
  openEvidencePreviewRecord,
  renderEvidenceMarks
} from "../assets/js/evidence/evidence-preview.js";

test("Storageパスだけの提出画像も保護者向け一覧へ表示する", () => {
  assert.equal(canRenderEvidenceRecord({
    evidenceImageName: "result.png",
    evidenceStoragePath: "students/STU_1/evidence/2026-07-23/result.png"
  }), true);
});

test("画像URLがない場合はStorageパスから再取得して表示する", async () => {
  const record = {
    id: "record-1",
    evidenceImageName: "result.png",
    evidenceStoragePath: "students/STU_1/evidence/2026-07-23/result.png",
    firebaseSyncStatus: "synced"
  };
  const elements = {
    title: { textContent: "" },
    meta: { textContent: "" },
    image: { src: "" },
    dialog: { showModal() {} }
  };
  await openEvidencePreviewRecord(
    "record-1",
    [record],
    elements,
    (item) => item.id,
    async () => "https://example.invalid/result.png"
  );
  assert.equal(elements.image.src, "https://example.invalid/result.png");
  assert.equal(elements.title.textContent, "result.png");
});

test("先生未確認のAI採点マークは答案へ重ねない", async () => {
  const record = {
    id: "record-2",
    evidenceImageName: "answer.png",
    evidenceImageUrl: "https://example.invalid/answer.png",
    gradingMarks: [{ result: "incorrect", x: 50, y: 50 }],
    gradingReviewStatus: "teacher_confirmation_required",
    firebaseSyncStatus: "synced"
  };
  const elements = {
    title: { textContent: "" },
    meta: { textContent: "" },
    image: { src: "", hidden: false },
    markLayer: { innerHTML: "old-mark" },
    dialog: { open: true, showModal() {} }
  };
  await openEvidencePreviewRecord(
    "record-2",
    [record],
    elements,
    (item) => item.id
  );
  assert.equal(elements.markLayer.innerHTML, "");
  assert.match(elements.meta.textContent, /未確認/);
});

test("実験採点は操作するまで表示せず記録も変更しない", async () => {
  const record = {
    id: "record-3",
    evidenceImageName: "answer.png",
    evidenceImageUrl: "https://example.invalid/answer.png",
    proposedGradingMarks: [{ result: "correct", x: 20, y: 30 }],
    gradingReviewStatus: "teacher_confirmation_required",
    firebaseSyncStatus: "synced"
  };
  const gradingActions = { hidden: true };
  const experimentalButton = {
    textContent: "",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    onclick: null
  };
  const markLayer = { innerHTML: "" };
  const elements = {
    title: { textContent: "" },
    meta: { textContent: "" },
    image: { src: "", hidden: false },
    markLayer,
    gradingActions,
    experimentalButton,
    dialog: { open: true, showModal() {} }
  };
  await openEvidencePreviewRecord(
    "record-3",
    [record],
    elements,
    (item) => item.id,
    undefined,
    { allowExperimentalPreview: true }
  );
  assert.equal(markLayer.innerHTML, "");
  assert.equal(gradingActions.hidden, false);
  experimentalButton.onclick();
  assert.match(markLayer.innerHTML, /〇/);
  assert.match(markLayer.innerHTML, /experimental/);
  assert.equal(record.gradingReviewStatus, "teacher_confirmation_required");
});

test("手書き風採点マークは位置ごとに傾きを変える", () => {
  const markLayer = { innerHTML: "" };
  renderEvidenceMarks(markLayer, [
    { result: "correct", x: 20, y: 30 },
    { result: "incorrect", x: 70, y: 80 }
  ], true);
  assert.match(markLayer.innerHTML, /rotate\(/);
  assert.match(markLayer.innerHTML, /〇/);
  assert.match(markLayer.innerHTML, /×/);
});

test("2つのAIの一致件数と要確認件数を表示する", () => {
  assert.equal(gradingSummaryText({
    aiConsensusSummary: { consensusCount: 8, disagreementCount: 2 }
  }), "AI一致 8件 / 要確認 2件");
  assert.equal(gradingSummaryText({
    aiConsensusSummary: { consensusCount: 10, disagreementCount: 0 }
  }), "2つのAIが一致 10件（先生確認前）");
  assert.equal(gradingReviewReasonText({
    gradingDisagreements: [
      { label: "(2)x", reason: "計算した正答が一致しません" }
    ]
  }), "要確認理由 (2)x: 計算した正答が一致しません");
});

test("Firebase保存済みの未確定画像は二重AIで再採点できる", async () => {
  const record = {
    id: "record-4",
    firebaseDocumentId: "record-4",
    evidenceImageName: "needs-review.png",
    evidenceImageUrl: "https://example.invalid/needs-review.png",
    evidenceStoragePath: "students/STU_1/evidence/needs-review.png",
    aiAnalysisStatus: "needs_review",
    gradingReviewStatus: "ai_disagreement",
    firebaseSyncStatus: "synced"
  };
  const regradeButton = { hidden: true, disabled: false, textContent: "", onclick: null };
  const gradingActions = { hidden: true };
  let requestedRecord = null;
  await openEvidencePreviewRecord(
    "record-4",
    [record],
    {
      title: { textContent: "" },
      meta: { textContent: "" },
      image: { src: "", hidden: false },
      gradingActions,
      regradeButton,
      dialog: { open: true, showModal() {} }
    },
    (item) => item.id,
    undefined,
    { onRegrade: (item) => { requestedRecord = item; } }
  );
  assert.equal(regradeButton.hidden, false);
  assert.equal(gradingActions.hidden, false);
  regradeButton.onclick();
  assert.equal(requestedRecord, record);
});

test("AI不一致理由と模範解答案を人間採点画面へ表示する", () => {
  const html = humanGradingPanelHtml({
    gradingDisagreements: [{
      label: "(2)x",
      reason: "計算した正答が一致しません",
      primary: { detectedAnswer: "75", correctAnswer: "75" },
      reviewer: { detectedAnswer: "75", correctAnswer: "70" }
    }]
  });
  assert.match(html, /計算した正答が一致しません/);
  assert.match(html, /Gemini 読取: 75/);
  assert.match(html, /模範解答案: 75/);
  assert.match(html, /模範解答案: 70/);
  assert.match(html, /人間の採点を確定/);
});
