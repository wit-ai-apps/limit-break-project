export function filterSupportSummary(summary = {}, permissions = {}) {
  const result = {};
  const include = (key, value) => {
    const level = permissions[key] || "none";
    if (level !== "none") result[key] = { level, value };
  };
  include("progress", summary.progress);
  include("studyTime", summary.studyTime);
  include("completion", summary.completion);
  include("scores", summary.scores);
  include("weaknesses", summary.weaknesses);
  include("schedule", summary.schedule);
  include("evidence", summary.evidence);
  include("fatigue", summary.fatigue);
  return result;
}

export function supportSummaryAccessFields(filtered = {}) {
  return Object.keys(filtered).filter((key) => filtered[key]?.level !== "none");
}
