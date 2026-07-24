import test from "node:test";
import assert from "node:assert/strict";
import { canRenderEvidenceRecord } from "../assets/js/evidence/evidence-policy.js";
import { openEvidencePreviewRecord } from "../assets/js/evidence/evidence-preview.js";

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
  assert.match(elements.meta.textContent, /先生確認前/);
});
