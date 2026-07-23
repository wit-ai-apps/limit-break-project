export const DEFAULT_DEADLINE = "2026-08-31";

export const COURSE_TARGETS = [
  { subject: "数学Ⅰ", course: "ベーシックレベル数学Ⅰ", totalUnits: 48, baseMinutes: 90, priority: 1 },
  { subject: "数学A", course: "ベーシックレベル数学A", totalUnits: 24, baseMinutes: 90, priority: 2 },
  { subject: "英語", course: "ベーシックレベル英語", totalUnits: 72, baseMinutes: 60, priority: 3 },
  { subject: "英語", course: "スタンダードレベル英語 文法・読解", totalUnits: 36, baseMinutes: 75, priority: 4 }
];

export function decideVideoRoute(record, today = dateKeyJst()) {
  if (!record || record.aiAnalysisStatus === "error" || record.aiAnalysisStatus === "needs_review") {
    return decision("diagnostic_first", "判定できる提出がないため、短い確認テストを先に実施", 20);
  }
  const score = numberOrNull(record.score ?? record.aiAnalysis?.correctRate);
  const answeredCount = numberOrNull(record.answeredCount ?? record.aiAnalysis?.answeredCount);
  const confidence = numberOrNull(record.aiAnalysis?.confidence);
  if (score === null || (answeredCount !== null && answeredCount < 5) || (confidence !== null && confidence < 0.65)) {
    return decision("diagnostic_first", "回答数または解析信頼度が不足しているため再確認", 20);
  }
  const ageDays = daysBetween(record.date || record.savedAt?.slice?.(0, 10), today);
  if (ageDays === null || ageDays > 14) {
    return decision("diagnostic_first", "以前の理解が現在も残っているか確認してから映像を判定", 20);
  }
  if (score >= 85) return decision("skip_video", "確認テスト85%以上。映像は省略し、短い定着確認へ", 15);
  if (score >= 70) return decision("short_review", "確認テスト70〜84%。映像は要点部分だけ視聴", 35);
  if (score >= 50) return decision("rewatch", "確認テスト50〜69%。通常の映像授業と確認問題を実施", 90);
  return decision("rebuild", "確認テスト50%未満。前提事項へ戻って映像を視聴", 120);
}

export function buildAdaptivePlan({ studentId, records = [], today = dateKeyJst(), deadline = DEFAULT_DEADLINE }) {
  const daysRemaining = Math.max(0, daysBetween(today, deadline) ?? 0);
  const studyDaysRemaining = Math.max(1, Math.floor((daysRemaining + 1) * 6 / 7));
  const latestByUnit = new Map();
  [...records].sort(newestFirst).forEach((record) => {
    const key = unitKey(record);
    if (key && !latestByUnit.has(key)) latestByUnit.set(key, record);
  });
  const recentSubmissionCount = records.filter((record) => {
    const age = daysBetween(record.date || record.savedAt?.slice?.(0, 10), today);
    return age !== null && age >= 0 && age <= 2 && record.evidenceStatus !== "missing";
  }).length;

  const coursePlans = COURSE_TARGETS.map((target) => {
    const courseRecords = [...latestByUnit.values()].filter((record) => normalize(record.course) === normalize(target.course));
    const completedUnits = courseRecords.filter((record) => {
      const route = decideVideoRoute(record, today).route;
      return route === "skip_video" || route === "short_review";
    }).length;
    const remainingUnits = Math.max(0, target.totalUnits - completedUnits);
    const requiredUnitsPerStudyDay = Math.ceil((remainingUnits / studyDaysRemaining) * 10) / 10;
    const latest = courseRecords.sort(newestFirst)[0] || null;
    const route = decideVideoRoute(latest, today);
    return {
      ...target,
      completedUnits,
      remainingUnits,
      requiredUnitsPerStudyDay,
      route: route.route,
      routeLabel: route.label,
      reason: latest ? route.reason : "提出記録がないため、最初に診断テストを実施",
      plannedMinutes: Math.min(180, Math.max(route.minutes, Math.ceil(requiredUnitsPerStudyDay * target.baseMinutes)))
    };
  });

  const requiredMinutes = coursePlans.reduce((sum, course) => sum + course.plannedMinutes, 0);
  const risk = daysRemaining === 0
    ? "deadline"
    : recentSubmissionCount === 0
      ? "no_recent_submission"
      : requiredMinutes > 420
        ? "compressed"
        : "on_track";
  return {
    studentId,
    planDate: today,
    deadline,
    daysRemaining,
    studyDaysRemaining,
    originalPlanDays: 57,
    recentSubmissionCount,
    risk,
    requiredMinutes,
    generatedAt: new Date().toISOString(),
    policyVersion: "1.0.0",
    coursePlans,
    dailyActions: coursePlans.map((course) => ({
      subject: course.subject,
      course: course.course,
      action: course.route,
      actionLabel: course.routeLabel,
      units: course.requiredUnitsPerStudyDay,
      minutes: course.plannedMinutes,
      reason: course.reason
    }))
  };
}

export function dateKeyJst(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function decision(route, reason, minutes) {
  const labels = {
    diagnostic_first: "先に確認テスト",
    skip_video: "映像を省略",
    short_review: "要点映像のみ",
    rewatch: "通常視聴",
    rebuild: "基礎から再構築"
  };
  return { route, label: labels[route], reason, minutes };
}

function unitKey(record) {
  if (!record?.course) return "";
  return [record.course, record.lesson || "", record.part || record.aiAnalysis?.unit || ""].map(normalize).join("|");
}

function normalize(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

function newestFirst(a, b) {
  return String(b.savedAt || b.date || "").localeCompare(String(a.savedAt || a.date || ""));
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function daysBetween(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(`${String(start).slice(0, 10)}T00:00:00+09:00`);
  const endDate = new Date(`${String(end).slice(0, 10)}T00:00:00+09:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return Math.floor((endDate - startDate) / 86400000);
}
