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

export function gradingSummaryText(record = {}) {
  const summary = record.aiConsensusSummary;
  if (!summary) {
    return record.gradingReviewStatus === "confirmed" ? "先生確認済み" : "AI採点は未確認";
  }
  const consensus = Number(summary.consensusCount || 0);
  const disagreements = Number(summary.disagreementCount || 0);
  if (disagreements > 0) {
    return `AI一致 ${consensus}件 / 要確認 ${disagreements}件`;
  }
  return consensus > 0
    ? `2つのAIが一致 ${consensus}件（先生確認前）`
    : "AI採点候補なし";
}

export function gradingReviewReasonText(record = {}) {
  const disagreements = Array.isArray(record.gradingDisagreements)
    ? record.gradingDisagreements
    : [];
  if (!disagreements.length) return "";
  const details = disagreements.slice(0, 3).map((item) =>
    `${item.label || "設問"}: ${item.reason || "2つのAIの判定が一致しません"}`
  );
  if (disagreements.length > details.length) {
    details.push(`ほか${disagreements.length - details.length}件`);
  }
  return `要確認理由 ${details.join(" / ")}`;
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

  const gradingNote = gradingSummaryText(record);
  const reviewReason = gradingReviewReasonText(record);
  elements.meta.textContent = `${record.subject || ""} ${record.course || ""} ${record.lesson || ""} ${record.part || ""} / ${record.testType || ""} / 回答数 ${record.answeredCount || "-"} / 正答率 ${record.score ? `${record.score}%` : "-"} / ${gradingNote}${reviewReason ? ` / ${reviewReason}` : ""} / 保存先 ${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}`;
  if (elements.gradingActions) elements.gradingActions.hidden = true;
  if (elements.regradeButton) {
    const canRegrade = Boolean(
      options.onRegrade
      && record.firebaseDocumentId
      && record.evidenceStoragePath
      && record.gradingReviewStatus !== "confirmed"
      && !["queued", "processing"].includes(record.aiAnalysisStatus)
    );
    elements.regradeButton.hidden = !canRegrade;
    elements.regradeButton.disabled = false;
    elements.regradeButton.textContent = "二重AIで再採点";
    elements.regradeButton.onclick = canRegrade
      ? () => options.onRegrade(record, elements.regradeButton)
      : null;
    if (canRegrade && elements.gradingActions) elements.gradingActions.hidden = false;
  }
  if (elements.experimentalButton) {
    elements.experimentalButton.hidden = false;
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
          ? `${record.subject || ""} ${record.course || ""} / 2つのAIが一致した仮採点だけ表示中（未確定・記録へ反映なし）`
          : `${record.subject || ""} ${record.course || ""} / ${gradingSummaryText(record)}${gradingReviewReasonText(record) ? ` / ${gradingReviewReasonText(record)}` : ""}`;
      };
    } else if (elements.experimentalButton) {
      elements.experimentalButton.hidden = true;
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
    const regradeButton = dialog.querySelector("#regradeEvidenceButton");
    if (regradeButton) {
      regradeButton.onclick = null;
      regradeButton.disabled = false;
    }
  });
}
