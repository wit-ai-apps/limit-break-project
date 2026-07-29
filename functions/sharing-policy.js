export const SHARING_LEVELS = Object.freeze({
  none: 0,
  summary: 1,
  detail: 2
});

export const SHARING_FIELDS = Object.freeze([
  "progress",
  "studyTime",
  "completion",
  "scores",
  "weaknesses",
  "schedule",
  "evidence",
  "fatigue",
  "yuiDialogue",
  "privateNotes"
]);

const ROLE_CAPS = Object.freeze({
  parent: {
    progress: "detail", studyTime: "detail", completion: "detail", scores: "detail",
    weaknesses: "detail", schedule: "detail", evidence: "detail", fatigue: "summary",
    yuiDialogue: "none", privateNotes: "none"
  },
  supporter: {
    progress: "summary", studyTime: "summary", completion: "summary", scores: "summary",
    weaknesses: "summary", schedule: "summary", evidence: "none", fatigue: "none",
    yuiDialogue: "none", privateNotes: "none"
  },
  teacher: {
    progress: "detail", studyTime: "detail", completion: "detail", scores: "detail",
    weaknesses: "detail", schedule: "detail", evidence: "detail", fatigue: "summary",
    yuiDialogue: "none", privateNotes: "none"
  }
});

export const DEFAULT_SHARING = Object.freeze({
  student: {
    progress: "detail", studyTime: "summary", completion: "detail", scores: "summary",
    weaknesses: "summary", schedule: "detail", evidence: "none", fatigue: "none",
    yuiDialogue: "none", privateNotes: "none"
  },
  guardian: {
    progress: "detail", studyTime: "summary", completion: "detail", scores: "summary",
    weaknesses: "summary", schedule: "detail", evidence: "none", fatigue: "none",
    yuiDialogue: "none", privateNotes: "none"
  }
});

export function normalizeSharingPreferences(value = {}, ownerRole = "student") {
  const defaults = DEFAULT_SHARING[ownerRole === "parent" ? "guardian" : "student"];
  return Object.fromEntries(SHARING_FIELDS.map((field) => {
    const level = String(value?.[field] || defaults[field] || "none");
    return [field, Object.hasOwn(SHARING_LEVELS, level) ? level : "none"];
  }));
}

export function effectiveSharing(studentPreferences = {}, guardianPreferences = {}, targetRole = "supporter") {
  const student = normalizeSharingPreferences(studentPreferences, "student");
  const guardian = normalizeSharingPreferences(guardianPreferences, "parent");
  const caps = ROLE_CAPS[targetRole] || ROLE_CAPS.supporter;
  return Object.fromEntries(SHARING_FIELDS.map((field) => {
    const level = Math.min(
      SHARING_LEVELS[student[field]],
      SHARING_LEVELS[guardian[field]],
      SHARING_LEVELS[caps[field] || "none"]
    );
    return [field, Object.keys(SHARING_LEVELS).find((key) => SHARING_LEVELS[key] === level) || "none"];
  }));
}

export function canManageSharing(user, studentId) {
  return Boolean(user && studentId && Array.isArray(user.linked_student_ids)
    && user.linked_student_ids.includes(studentId)
    && ["student", "parent", "admin", "lead_teacher"].includes(user.role));
}

export function resolveSharingRole(user, member) {
  if (member) {
    if (member.status !== "active") return "";
    return String(member.role || "");
  }
  // 旧版ではusers.linked_student_idsだけで本人・保護者を連携していた。
  // 外部サポーターと教師は必ず承認済みmember文書を要求する。
  return ["student", "parent"].includes(user?.role) ? user.role : "";
}
