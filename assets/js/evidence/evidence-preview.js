function markTransform(mark, index) {
  const x = Number(mark.x) || 0;
  const y = Number(mark.y) || 0;
  const seed = Math.round((x * 7) + (y * 11) + (index * 13));
  const rotation = (seed % 17) - 8;
  const scaleX = 0.9 + ((seed % 7) * 0.025);
  const scaleY = 0.88 + ((seed % 5) * 0.035);
  return `translate(-50%, -50%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
}

export function renderEvidenceMarks(markLayer, marks = [], experimental = false) {
  if (!markLayer) return;
  markLayer.innerHTML = marks.map((mark, index) => `
    <span class="evidence-mark ${mark.result === "correct" ? "correct" : mark.result === "incorrect" ? "incorrect" : "unknown"}${experimental ? " experimental" : ""}"
      style="left:${Number(mark.x) || 0}%;top:${Number(mark.y) || 0}%;transform:${markTransform(mark, index)}">
      ${mark.result === "correct" ? "〇" : mark.result === "incorrect" ? "×" : "?"}
    </span>
  `).join("");
}

export async function openEvidencePreviewRecord(
  key,
  records,
  elements,
  recordKey,
  resolveImageUrl,
  options = {}
) {
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
    : "AI採点は未確認";
  elements.meta.textContent = `${record.subject || ""} ${record.course || ""} ${record.lesson || ""} ${record.part || ""} / ${record.testType || ""} / 回答数 ${record.answeredCount || "-"} / 正答率 ${record.score ? `${record.score}%` : "-"} / ${gradingNote} / 保存先 ${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}`;
  if (elements.gradingActions) elements.gradingActions.hidden = true;
  if (elements.experimentalButton) {
    elements.experimentalButton.onclick = null;
    elements.experimentalButton.textContent = "AI仮採点を表示";
    elements.experimentalButton.setAttribute("aria-pressed", "false");
  }
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
    const confirmedMarks = record.gradingReviewStatus === "confirmed" && Array.isArray(record.gradingMarks)
      ? record.gradingMarks
      : [];
    renderEvidenceMarks(elements.markLayer, confirmedMarks);
    const proposedMarks = Array.isArray(record.proposedGradingMarks) ? record.proposedGradingMarks : [];
    const canExperiment = options.allowExperimentalPreview && !confirmedMarks.length && proposedMarks.length > 0;
    if (canExperiment && elements.experimentalButton) {
      if (elements.gradingActions) elements.gradingActions.hidden = false;
      let showing = false;
      elements.experimentalButton.onclick = () => {
        showing = !showing;
        renderEvidenceMarks(elements.markLayer, showing ? proposedMarks : [], showing);
        elements.experimentalButton.textContent = showing ? "AI仮採点を隠す" : "AI仮採点を表示";
        elements.experimentalButton.setAttribute("aria-pressed", String(showing));
        elements.meta.textContent = showing
          ? `${record.subject || ""} ${record.course || ""} / AI仮採点を実験表示中（未確定・記録へ反映なし）`
          : `${record.subject || ""} ${record.course || ""} / AI採点は未確認`;
      };
    }
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
    const gradingActions = dialog.querySelector("#evidenceGradingActions");
    if (gradingActions) gradingActions.hidden = true;
  });
}
