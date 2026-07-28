const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function difficultyFactor(value) {
  return { foundation: 0.85, basic: 1, standard: 1.2, advanced: 1.5 }[value] || 1.2;
}

export function buildMaterialStudyPlan(analysis = {}, preferences = {}, now = new Date()) {
  const start = dateOnly(now);
  const requestedDeadline = preferences.deadline ? dateOnly(preferences.deadline) : new Date(start.getTime() + 29 * DAY_MS);
  const deadline = requestedDeadline < start ? start : requestedDeadline;
  const calendarDays = Math.floor((deadline - start) / DAY_MS) + 1;
  const weeklyStudyDays = clamp(preferences.weeklyStudyDays, 1, 7);
  const dailyMinutes = clamp(preferences.dailyMinutes, 15, 240);
  const studyDays = Math.max(1, Math.floor(calendarDays / 7) * weeklyStudyDays + Math.min(calendarDays % 7, weeklyStudyDays));
  const pages = clamp(analysis.detectedPageCount || analysis.pageCount || 30, 1, 3000);
  const units = Array.isArray(analysis.unitStructure) && analysis.unitStructure.length
    ? analysis.unitStructure
    : Array.from({ length: clamp(analysis.estimatedUnits || Math.ceil(pages / 12), 1, 100) }, (_, index) => ({
        order: index + 1,
        title: `範囲 ${index + 1}`
      }));
  const requiredMinutes = Math.ceil(pages * 4.5 * difficultyFactor(analysis.difficulty));
  const availableMinutes = studyDays * dailyMinutes;
  const loadRatio = requiredMinutes / availableMinutes;
  const feasibility = loadRatio <= 0.8 ? "comfortable" : loadRatio <= 1.05 ? "tight" : "overloaded";
  const schoolRequired = preferences.designation === "school_required";
  const coverageRate = Math.min(1, availableMinutes / requiredMinutes);
  const targetUnits = Math.max(1, Math.min(units.length, Math.floor(units.length * coverageRate)));
  const orderedUnits = units
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .slice(0, feasibility === "overloaded" && !schoolRequired ? targetUnits : units.length);
  const phases = [
    { key: "understand", label: "理解", rate: 0.25 },
    { key: "practice", label: "演習", rate: 0.5 },
    { key: "error_review", label: "間違い直し", rate: 0.2 },
    { key: "final_check", label: "仕上げ確認", rate: 0.05 }
  ].map((phase) => ({
    ...phase,
    minutes: Math.max(15, Math.round(Math.min(requiredMinutes, availableMinutes) * phase.rate))
  }));
  const unitsPerDay = Math.max(1, Math.ceil(orderedUnits.length / studyDays));
  const dailyTasks = [];
  for (let day = 0; day < Math.min(studyDays, 14); day += 1) {
    const from = day * unitsPerDay;
    const todaysUnits = orderedUnits.slice(from, from + unitsPerDay);
    if (!todaysUnits.length) break;
    dailyTasks.push({
      studyDay: day + 1,
      unitTitles: todaysUnits.map((unit) => unit.title || `範囲 ${unit.order || from + 1}`),
      minutes: dailyMinutes,
      steps: ["要点を自分の言葉で説明", "問題を解く", "誤答理由を記録", "翌日復習へ登録"]
    });
  }
  return {
    generatedAt: now.toISOString(),
    deadline: deadline.toISOString().slice(0, 10),
    calendarDays,
    studyDays,
    dailyMinutes,
    weeklyStudyDays,
    requiredMinutes,
    availableMinutes,
    feasibility,
    coverageRate: Math.round(coverageRate * 100),
    priorityPolicy: schoolRequired
      ? "学校指定範囲を最優先し、提出・定期テスト日から逆算"
      : "本人の好みを尊重しつつ、前提単元の順序を維持",
    recommendation: feasibility === "overloaded"
      ? schoolRequired
        ? "時間不足です。学校指定範囲は維持し、例題と頻出問題を優先して先生と学習時間を再調整してください。"
        : `全範囲は過負荷です。まず重要度の高い約${Math.round(coverageRate * 100)}%を完了し、残りは次期計画へ回します。`
      : feasibility === "tight"
        ? "期限内に可能ですが余裕は少なめです。週1回、遅れを自動確認します。"
        : "期限内に復習日を確保して進められます。",
    phases,
    reviewCadenceDays: [1, 3, 7],
    adjustmentRules: [
      "確認問題が80%以上なら次の範囲へ進む",
      "60〜79%なら翌日に誤答だけ再演習する",
      "60%未満なら前提単元へ戻り、計画を1段階ゆっくりにする"
    ],
    dailyTasks
  };
}
