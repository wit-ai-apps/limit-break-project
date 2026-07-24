export async function openEvidencePreviewRecord(key, records, elements, recordKey, resolveImageUrl) {
  const record = records.find((item) => recordKey(item) === key);
  if (!record) return;
  let src = record.evidenceImageData || record.evidenceImageUrl;
  if (!src && record.evidenceStoragePath && resolveImageUrl) {
    elements.title.textContent = record.evidenceImageName || "提出画像";
    elements.meta.textContent = "画像をFirebase Storageから読み込んでいます...";
    elements.dialog.showModal();
    try {
      src = await resolveImageUrl(record);
    } catch (_) {
      elements.meta.textContent = "画像を読み込めませんでした。生徒との連携設定またはStorage権限を確認してください。";
      return;
    }
  }
  if (!src) return;

  elements.title.textContent = record.evidenceImageName || "提出画像";
  elements.meta.textContent = `${record.subject || ""} ${record.course || ""} ${record.lesson || ""} ${record.part || ""} / ${record.testType || ""} / 回答数 ${record.answeredCount || "-"} / 正答率 ${record.score ? `${record.score}%` : "-"} / 保存先 ${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}`;
  elements.image.src = src;
  if (elements.markLayer) {
    const marks = record.gradingMarks || record.aiAnalysis?.answerMarks || [];
    elements.markLayer.innerHTML = marks.map((mark) => `
      <span class="evidence-mark ${mark.result === "correct" ? "correct" : mark.result === "incorrect" ? "incorrect" : "unknown"}"
        style="left:${Number(mark.x) || 0}%;top:${Number(mark.y) || 0}%">
        ${mark.result === "correct" ? "〇" : mark.result === "incorrect" ? "×" : "?"}
      </span>
    `).join("");
  }
  elements.dialog.showModal();
}

export function bindEvidencePreviewDialog({ dialog, image, closeButton }) {
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    dialog.querySelector(".evidence-mark-layer")?.replaceChildren();
  });
}
