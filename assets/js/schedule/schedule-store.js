const CREATOR_LABELS = {
  student: "本人",
  parent: "保護者",
  supporter: "サポーター",
  teacher: "講師",
  admin: "運営",
  system: "学校・運営"
};

export function scheduleCreatorLabel(item) {
  if (item?.source === "fixed") return "学校・運営";
  return CREATOR_LABELS[item?.created_by_role] || "登録者不明";
}

export function canDeleteSchedule(item, currentUser, currentRole) {
  if (!item || item.source === "fixed") return false;
  if (currentRole === "teacher" || currentRole === "admin") return true;
  return Boolean(currentUser?.uid && item.created_by_uid === currentUser.uid);
}

export function googleCalendarUrl(item) {
  const start = compactDate(item?.date_start || item?.countdown_target);
  if (!start) return "";
  const end = compactDate(addDays(item?.date_end || item?.date_start || item?.countdown_target, 1));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.exam_name || "Limit Break予定",
    dates: `${start}/${end}`,
    details: `${item.notes || ""}\n登録元: CORTEX Limit Break`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadSchedulesIcs(items, fileName = "limit-break-schedule.ics") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CORTEX Limit Break//Schedule//JA", "CALSCALE:GREGORIAN"];
  items.filter((item) => item?.countdown_target || item?.date_start).forEach((item) => {
    const startDate = item.date_start || item.countdown_target;
    const endDate = addDays(item.date_end || startDate, 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.id || item.custom_id || `${startDate}-${item.exam_name}`)}@limit-break`,
      `DTSTART;VALUE=DATE:${compactDate(startDate)}`,
      `DTEND;VALUE=DATE:${compactDate(endDate)}`,
      `SUMMARY:${escapeIcs(item.exam_name || "Limit Break予定")}`,
      `DESCRIPTION:${escapeIcs(`${item.notes || ""} / 登録者: ${scheduleCreatorLabel(item)}`)}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([`${lines.join("\r\n")}\r\n`], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function compactDate(value) {
  return String(value || "").replaceAll("-", "").slice(0, 8);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeIcs(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}
