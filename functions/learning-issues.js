import { createHash } from "node:crypto";

export const LEARNING_ISSUE_SCHEMA_VERSION = 1;

const MISTAKE_TYPES = new Set([
  "knowledge",
  "calculation",
  "reading",
  "condition",
  "careless",
  "unknown"
]);

function compactText(value, maxLength = 80) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>{}[\]]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizedKeyPart(value) {
  return compactText(value, 120)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function uniqueTags(tags) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => compactText(tag, 32))
    .filter(Boolean))]
    .slice(0, 8);
}

export function learningIssueId(issue) {
  const tags = uniqueTags(issue.skillTags).map(normalizedKeyPart).sort().join("|");
  const identity = [
    issue.subject,
    issue.course,
    issue.domain,
    issue.unit,
    tags || issue.contentSummary,
    issue.mistakeType
  ].map(normalizedKeyPart).join("|");
  return `issue_${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

export function buildVerifiedLearningIssues(analysis, context = {}) {
  if (!analysis || Number(analysis.confidence) < 0.9 || analysis.needsReview) return [];
  const verifiedIncorrectMarks = new Map(
    (Array.isArray(analysis.answerMarks) ? analysis.answerMarks : [])
      .filter((mark) => mark.result === "incorrect" && Number(mark.markConfidence) >= 0.98)
      .map((mark) => [normalizedKeyPart(mark.label), mark])
  );
  if (!verifiedIncorrectMarks.size) return [];

  const issues = [];
  const seen = new Set();
  (Array.isArray(analysis.learningIssues) ? analysis.learningIssues : []).forEach((candidate) => {
    const labelKey = normalizedKeyPart(candidate.problemLabel);
    const verifiedMark = verifiedIncorrectMarks.get(labelKey);
    if (!verifiedMark || Number(candidate.confidence) < 0.9) return;
    const issue = {
      subject: compactText(analysis.subject || context.subject || "未分類", 40),
      course: compactText(analysis.course || context.course || "教材不明", 100),
      lesson: compactText(analysis.lesson || context.lesson, 40),
      part: compactText(analysis.part || context.part, 40),
      domain: compactText(candidate.domain, 60),
      unit: compactText(candidate.unit || analysis.unit || analysis.part, 60),
      problemLabel: compactText(candidate.problemLabel || verifiedMark.label, 40),
      contentSummary: compactText(candidate.contentSummary, 80),
      mistakeType: MISTAKE_TYPES.has(candidate.mistakeType) ? candidate.mistakeType : "unknown",
      skillTags: uniqueTags(candidate.skillTags),
      detectedAnswer: compactText(candidate.detectedAnswer || verifiedMark.detectedAnswer, 80),
      correctAnswer: compactText(candidate.correctAnswer || verifiedMark.correctAnswer, 80),
      confidence: Math.min(1, Math.max(0, Number(candidate.confidence) || 0)),
      sourceRecordId: compactText(context.recordId, 180),
      sourceStoragePath: String(context.storagePath || "").slice(0, 500),
      schemaVersion: LEARNING_ISSUE_SCHEMA_VERSION
    };
    if (!issue.domain && !issue.unit && !issue.contentSummary && !issue.skillTags.length) return;
    const id = learningIssueId(issue);
    if (seen.has(id)) return;
    seen.add(id);
    issues.push({ id, ...issue });
  });
  return issues.slice(0, 20);
}

