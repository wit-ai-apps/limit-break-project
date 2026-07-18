export function openEvidencePreviewRecord(key, records, elements, recordKey) {
  const record = records.find((item) => recordKey(item) === key);
  const src = record?.evidenceImageData || record?.evidenceImageUrl;
  if (!src) return;

  elements.title.textContent = record.evidenceImageName || "提出画像";
  elements.meta.textContent = `${record.subject || ""} ${record.course || ""} ${record.lesson || ""} ${record.part || ""} / ${record.testType || ""} / 回答数 ${record.answeredCount || "-"} / 正答率 ${record.score ? `${record.score}%` : "-"} / 保存先 ${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}`;
  elements.image.src = src;
  elements.dialog.showModal();
}

export function bindEvidencePreviewDialog({ dialog, image, closeButton }) {
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
  });
}
