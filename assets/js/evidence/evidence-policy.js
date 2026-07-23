export function evidenceTypeForUnit(unit) {
  const labels = (unit?.segments || []).map((segment) => segment.label).join(" ");
  if (labels.includes("復習テスト")) return "復習テスト";
  if (labels.includes("基本文テスト")) return "基本文テスト";
  if (labels.includes("AI Check Test") || labels.includes("AI確認")) return "AI確認テスト";
  return "確認問題";
}

export function hasEvidence(record) {
  return Boolean(record && record.evidenceImageName);
}

export function canRenderEvidenceRecord(record) {
  return Boolean(record?.evidenceImageName && (
    record.evidenceImageData ||
    record.evidenceImageUrl ||
    record.evidenceStoragePath
  ));
}

export function canSubmitEvidence(role) {
  return Boolean(role?.canEditRecord);
}

export function canViewEvidenceScore(role) {
  return role?.showScore === true;
}
