import { createHash } from "node:crypto";

export const INVITE_ROLES = new Set(["parent", "supporter", "teacher"]);

export const INVITE_PERMISSIONS = {
  parent: ["progress.read", "evidence.read", "schedule.read", "members.manage"],
  supporter: ["progress.read", "schedule.read", "support.write"],
  teacher: ["progress.read", "evidence.read", "schedule.read", "schedule.write", "instruction.write"]
};

export function inviteHash(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function normalizedEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

export function linkedToStudent(user, studentId) {
  return Array.isArray(user?.linked_student_ids) && user.linked_student_ids.includes(studentId);
}

export function canInvite(user, studentId) {
  return ["admin", "lead_teacher"].includes(user?.role)
    || user?.role === "parent" && linkedToStudent(user, studentId);
}

export function canApprove(user, studentId) {
  return canInvite(user, studentId);
}

export function inviteClaimState(invite, nowMs = Date.now()) {
  if (!invite) return "not_found";
  if (invite.status !== "issued") return "already_used";
  const expiresAt = typeof invite.expires_at?.toMillis === "function"
    ? invite.expires_at.toMillis()
    : Number(invite.expires_at || 0);
  if (!expiresAt || expiresAt <= nowMs) return "expired";
  return "claimable";
}

export function canRevokeInvite(invite, user, uid) {
  if (!invite || !["issued", "pending_approval"].includes(invite.status)) return false;
  return invite.invited_by_uid === uid || canApprove(user, invite.student_id);
}
