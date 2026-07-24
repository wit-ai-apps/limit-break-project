export async function openEvidencePreviewRecord(key, records, elements, recordKey, resolveImageUrl) {
  const record = records.find((item) => recordKey(item) === key);
  if (!record) return;
  elements.title.textContent = record.evidenceImageName || "提出画像";
  elements.meta.textContent = "画像を読み込んでいます...";
  if (!elements.dialog.open) elements.dialog.showModal();
  let src = record.evidenceImageData || record.evidenceImageUrl;
  if (!src && record.evidenceStoragePath && resolveImageUrl) {
    try {
      src = await resolveImageUrl(record);
    } catch (_) {
      elements.meta.textContent = "画像を読み込めませんでした。生徒との連携設定またはStorage権限を確認してください。";
      return;
    }
  }
  if (!src) {
    elements.meta.textContent = "画像の保存場所が記録されていません。再提出またはFirebase同期を確認してください。";
    return;
  }

  const gradingNote = record.gradingReviewStatus === "confirmed"
    ? "先生確認済み"
    : "AIの〇×は先生確認前のため表示していません";
  elements.meta.textContent = `${record.subject || ""} ${record.course || ""} ${record.lesson || ""} ${record.part || ""} / ${record.testType || ""} / 回答数 ${record.answeredCount || "-"} / 正答率 ${record.score ? `${record.score}%` : "-"} / ${gradingNote} / 保存先 ${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}`;
  const isPdf = record.evidenceImageType === "application/pdf" || /\.pdf$/i.test(record.evidenceImageName || "");
  if (isPdf && elements.pdf) {
    elements.image.hidden = true;
    elements.pdf.hidden = false;
    elements.pdf.src = src;
    if (elements.markLayer) elements.markLayer.replaceChildren();
    return;
  }
  if (elements.pdf) {
    elements.pdf.hidden = true;
    elements.pdf.removeAttribute("src");
  }
  let retried = false;
  elements.image.onload = () => {
    elements.image.hidden = false;
  };
  elements.image.onerror = async () => {
    if (!retried && record.evidenceStoragePath && resolveImageUrl) {
      retried = true;
      elements.meta.textContent = "画像URLを更新して再読み込みしています...";
      try {
        elements.image.src = await resolveImageUrl(record, true);
        return;
      } catch (_) {
        // Show the stable error message below.
      }
    }
    elements.image.hidden = true;
    elements.meta.textContent = "画像を取得できませんでした。Firebase同期状態を確認して再提出してください。";
  };
  elements.image.src = src;
  if (elements.markLayer) {
    const marks = record.gradingReviewStatus === "confirmed" && Array.isArray(record.gradingMarks)
      ? record.gradingMarks
      : [];
    elements.markLayer.innerHTML = marks.map((mark) => `
      <span class="evidence-mark ${mark.result === "correct" ? "correct" : mark.result === "incorrect" ? "incorrect" : "unknown"}"
        style="left:${Number(mark.x) || 0}%;top:${Number(mark.y) || 0}%">
        ${mark.result === "correct" ? "〇" : mark.result === "incorrect" ? "×" : "?"}
      </span>
    `).join("");
  }
}

export function bindEvidencePreviewDialog({ dialog, image, pdf, closeButton }) {
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    image.hidden = false;
    image.onload = null;
    image.onerror = null;
    if (pdf) {
      pdf.removeAttribute("src");
      pdf.hidden = true;
    }
    dialog.querySelector(".evidence-mark-layer")?.replaceChildren();
  });
}
