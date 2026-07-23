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
