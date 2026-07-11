export const FALLBACK_EXAMS = [
  {
    exam_name: "共通テスト本試験",
    exam_type: "common_test",
    date_start: "2027-01-16",
    date_end: "2027-01-17",
    countdown_target: "2027-01-16",
    priority: 1,
    notes: "2026-06-30時点であと200日"
  },
  {
    exam_name: "国公立前期・二次試験",
    exam_type: "national_secondary",
    date_start: "2027-02-25",
    date_end: "2027-02-25",
    countdown_target: "2027-02-25",
    priority: 2,
    notes: "国公立前期日程開始"
  },
  {
    exam_name: "私立一般入試開始",
    exam_type: "private_general",
    date_start: "2027-02-01",
    date_end: "2027-03-25",
    countdown_target: "2027-02-01",
    priority: 3,
    notes: "Phase1では仮データ。候補校は後で入力可能にする"
  }
];

export function todayJapanKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateDaysUntil(targetDate) {
  const today = new Date(`${todayJapanKey()}T00:00:00+09:00`);
  const target = new Date(`${targetDate}T00:00:00+09:00`);
  return Math.ceil((target - today) / 86400000);
}

export function dateDaysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T00:00:00+09:00`);
  return Math.floor((end - start) / 86400000);
}

export function countdownLabel(exam) {
  if (exam.exam_type === "common_test") return "共通テストまで";
  if (exam.exam_type === "national_secondary") return "国公立二次まで";
  if (exam.exam_type === "private_general") return "私立入試開始まで";
  return `${exam.exam_name}まで`;
}

export function formatDateTimeInput(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
