const ANSWER_SPACE_PATTERN = /[\s　,，、。．・:：;；()（）[\]【】{}「」『』'"`]/g;

export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(ANSWER_SPACE_PATTERN, "")
    .replace(/[−–—]/g, "-")
    .replace(/°/g, "");
}

export function normalizeLabel(value) {
  return normalizeAnswer(value)
    .replace(/question|problem|問|設問/g, "")
    .replace(/[アイウエオカキクケコサシスセソタチツテト]/g, "");
}

function coordinateDistance(a, b) {
  const dx = Number(a?.x) - Number(b?.x);
  const dy = Number(a?.y) - Number(b?.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return Number.POSITIVE_INFINITY;
  return Math.hypot(dx, dy);
}

function findReviewerMark(primaryMark, reviewerMarks, usedIndexes) {
  const primaryLabel = normalizeLabel(primaryMark.label);
  let index = reviewerMarks.findIndex((mark, candidateIndex) =>
    !usedIndexes.has(candidateIndex)
    && primaryLabel
    && normalizeLabel(mark.label) === primaryLabel
  );
  if (index >= 0) return index;

  let nearest = { index: -1, distance: Number.POSITIVE_INFINITY };
  reviewerMarks.forEach((mark, candidateIndex) => {
    if (usedIndexes.has(candidateIndex)) return;
    const distance = coordinateDistance(primaryMark, mark);
    if (distance < nearest.distance) nearest = { index: candidateIndex, distance };
  });
  return nearest.distance <= 10 ? nearest.index : -1;
}

function disagreementReason(primary, reviewer) {
  if (!reviewer) return "再判定AIに対応する解答欄がありません";
  if (primary.result === "unknown" || reviewer.result === "unknown") {
    return "いずれかのAIが判定不能としました";
  }
  if (normalizeAnswer(primary.detectedAnswer) !== normalizeAnswer(reviewer.detectedAnswer)) {
    return "手書き解答の読取結果が一致しません";
  }
  if (normalizeAnswer(primary.correctAnswer) !== normalizeAnswer(reviewer.correctAnswer)) {
    return "計算した正答が一致しません";
  }
  if (primary.result !== reviewer.result) return "〇×判定が一致しません";
  return "採点信頼度が基準未満です";
}

export function reconcileGradingAnalyses(primaryAnalysis, reviewerAnalysis, options = {}) {
  const minimumConfidence = Number(options.minimumConfidence ?? 0.9);
  const primaryMarks = Array.isArray(primaryAnalysis?.answerMarks) ? primaryAnalysis.answerMarks : [];
  const reviewerMarks = Array.isArray(reviewerAnalysis?.answerMarks) ? reviewerAnalysis.answerMarks : [];
  const usedReviewerIndexes = new Set();
  const consensusMarks = [];
  const disagreements = [];

  primaryMarks.forEach((primary) => {
    const reviewerIndex = findReviewerMark(primary, reviewerMarks, usedReviewerIndexes);
    const reviewer = reviewerIndex >= 0 ? reviewerMarks[reviewerIndex] : null;
    if (reviewerIndex >= 0) usedReviewerIndexes.add(reviewerIndex);

    const agrees = Boolean(reviewer)
      && primary.result !== "unknown"
      && reviewer.result !== "unknown"
      && normalizeAnswer(primary.detectedAnswer) === normalizeAnswer(reviewer.detectedAnswer)
      && normalizeAnswer(primary.correctAnswer) === normalizeAnswer(reviewer.correctAnswer)
      && primary.result === reviewer.result
      && Number(primary.markConfidence) >= minimumConfidence
      && Number(reviewer.markConfidence) >= minimumConfidence;

    if (agrees) {
      consensusMarks.push({
        ...primary,
        markConfidence: Math.min(Number(primary.markConfidence), Number(reviewer.markConfidence)),
        verification: "dual_ai_consensus",
        reviewerEvidenceBasis: reviewer.evidenceBasis
      });
      return;
    }

    disagreements.push({
      label: primary.label,
      x: primary.x,
      y: primary.y,
      reason: disagreementReason(primary, reviewer),
      primary: {
        result: primary.result,
        detectedAnswer: primary.detectedAnswer,
        correctAnswer: primary.correctAnswer,
        confidence: primary.markConfidence,
        evidenceBasis: primary.evidenceBasis
      },
      reviewer: reviewer ? {
        result: reviewer.result,
        detectedAnswer: reviewer.detectedAnswer,
        correctAnswer: reviewer.correctAnswer,
        confidence: reviewer.markConfidence,
        evidenceBasis: reviewer.evidenceBasis
      } : null
    });
  });

  reviewerMarks.forEach((reviewer, index) => {
    if (usedReviewerIndexes.has(index)) return;
    disagreements.push({
      label: reviewer.label,
      x: reviewer.x,
      y: reviewer.y,
      reason: "第一採点AIに対応する解答欄がありません",
      primary: null,
      reviewer: {
        result: reviewer.result,
        detectedAnswer: reviewer.detectedAnswer,
        correctAnswer: reviewer.correctAnswer,
        confidence: reviewer.markConfidence,
        evidenceBasis: reviewer.evidenceBasis
      }
    });
  });

  return {
    consensusMarks,
    disagreements,
    summary: {
      primaryCount: primaryMarks.length,
      reviewerCount: reviewerMarks.length,
      consensusCount: consensusMarks.length,
      disagreementCount: disagreements.length
    }
  };
}
