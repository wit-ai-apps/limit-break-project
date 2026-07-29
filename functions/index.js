import { initializeApp } from "firebase-admin/app";
import { randomBytes } from "node:crypto";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";
import { buildAdaptivePlan, dateKeyJst, DEFAULT_DEADLINE } from "./adaptive-scheduler.js";
import { reconcileGradingAnalyses } from "./dual-ai-grading.js";
import {
  INVITE_PERMISSIONS,
  INVITE_ROLES,
  canApprove,
  canInvite,
  canRevokeInvite,
  inviteClaimState,
  inviteHash,
  linkedToStudent,
  normalizedEmail
} from "./invite-policy.js";
import { buildVerifiedLearningIssues } from "./learning-issues.js";
import { buildMaterialStudyPlan } from "./material-planner.js";
import {
  DEFAULT_SHARING,
  canManageSharing,
  effectiveSharing,
  normalizeSharingPreferences,
  resolveSharingRole
} from "./sharing-policy.js";
import { filterSupportSummary, supportSummaryAccessFields } from "./support-summary.js";
import { buildGuardianAnswer } from "./guardian-answer.js";

initializeApp();

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
const primaryVisionModel = defineString("OPENROUTER_PRIMARY_VISION_MODEL", {
  default: "google/gemini-3.6-flash"
});
const reviewVisionModel = defineString("OPENROUTER_REVIEW_VISION_MODEL", {
  default: "openai/gpt-5.6-terra"
});
const adaptiveDeadline = defineString("ADAPTIVE_PLAN_DEADLINE", { default: DEFAULT_DEADLINE });

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "LOGIN_REQUIRED");
  return request.auth.uid;
}

async function requireUser(uid) {
  const snapshot = await getFirestore().doc(`users/${uid}`).get();
  if (!snapshot.exists) throw new HttpsError("failed-precondition", "USER_PROFILE_REQUIRED");
  return { ref: snapshot.ref, data: snapshot.data() };
}

export const createUserOnboarding = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const role = String(request.data?.role || "student");
  if (!["student", "parent", "supporter", "teacher"].includes(role)) {
    throw new HttpsError("invalid-argument", "INVALID_ROLE");
  }
  const email = normalizedEmail(request.auth.token.email);
  const displayName = String(request.data?.displayName || email.split("@")[0] || "利用者").trim().slice(0, 80);
  const studentId = role === "student" ? `STU_${uid.slice(0, 12).toUpperCase()}` : "";
  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const existing = await userRef.get();
  if (existing.exists) return { created: false, studentId: existing.data().linked_student_ids?.[0] || "" };
  const batch = db.batch();
  batch.set(userRef, {
    uid,
    email,
    displayName,
    role,
    supporter_type: role === "supporter" ? String(request.data?.supporterType || "family") : "",
    linked_student_ids: studentId ? [studentId] : [],
    classroom_ids: [],
    status: studentId ? "active" : "awaiting_invite_or_student_setup",
    created_at: FieldValue.serverTimestamp(),
    last_login_at: FieldValue.serverTimestamp(),
    login_count: 1
  });
  if (studentId) {
    batch.set(db.doc(`students/${studentId}`), {
      student_id: studentId,
      owner_uid: uid,
      status: "active",
      created_at: FieldValue.serverTimestamp()
    }, { merge: true });
    batch.set(db.doc(`students/${studentId}/members/${uid}`), {
      uid,
      role: "student",
      relationship: "本人",
      permissions: ["progress.read", "evidence.read", "evidence.write", "schedule.read", "schedule.write"],
      status: "active",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
  return { created: true, studentId };
});

export const createStudentForParent = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: parent } = await requireUser(uid);
  if (parent.role !== "parent") throw new HttpsError("permission-denied", "PARENT_REQUIRED");
  const displayName = String(request.data?.displayName || "").trim().slice(0, 80);
  if (!displayName) throw new HttpsError("invalid-argument", "STUDENT_NAME_REQUIRED");
  const studentId = `STU_${randomBytes(8).toString("hex").toUpperCase()}`;
  const db = getFirestore();
  const batch = db.batch();
  batch.set(db.doc(`students/${studentId}`), {
    student_id: studentId,
    display_name: displayName,
    grade: String(request.data?.grade || "").trim().slice(0, 40),
    owner_uid: uid,
    status: "pending_student_account",
    created_at: FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`students/${studentId}/members/${uid}`), {
    uid,
    role: "parent",
    relationship: "保護者",
    permissions: INVITE_PERMISSIONS.parent,
    status: "active",
    approved_by_uid: uid,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  batch.update(db.doc(`users/${uid}`), {
    linked_student_ids: FieldValue.arrayUnion(studentId),
    status: "active",
    updated_at: FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { studentId };
});

export const getSharingPreferences = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (!canManageSharing(user, studentId)) {
    throw new HttpsError("permission-denied", "SHARING_SETTINGS_NOT_ALLOWED");
  }
  const db = getFirestore();
  const [studentSnapshot, guardianSnapshot] = await Promise.all([
    db.doc(`students/${studentId}/privacy_preferences/student`).get(),
    db.doc(`students/${studentId}/privacy_preferences/guardian`).get()
  ]);
  const student = normalizeSharingPreferences(
    studentSnapshot.exists ? studentSnapshot.data().permissions : DEFAULT_SHARING.student,
    "student"
  );
  const guardian = normalizeSharingPreferences(
    guardianSnapshot.exists ? guardianSnapshot.data().permissions : DEFAULT_SHARING.guardian,
    "parent"
  );
  return {
    student,
    guardian,
    effective: {
      parent: effectiveSharing(student, guardian, "parent"),
      supporter: effectiveSharing(student, guardian, "supporter"),
      teacher: effectiveSharing(student, guardian, "teacher")
    }
  };
});

export const saveSharingPreferences = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (!canManageSharing(user, studentId) || !["student", "parent"].includes(user.role)) {
    throw new HttpsError("permission-denied", "SHARING_SETTINGS_NOT_ALLOWED");
  }
  const owner = user.role === "student" ? "student" : "guardian";
  const permissions = normalizeSharingPreferences(request.data?.permissions, user.role);
  await getFirestore().doc(`students/${studentId}/privacy_preferences/${owner}`).set({
    owner_uid: uid,
    owner_role: user.role,
    permissions,
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });
  return { owner, permissions };
});

export const savePrivateLearningState = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (user.role !== "student" || !canManageSharing(user, studentId)) {
    throw new HttpsError("permission-denied", "STUDENT_PRIVATE_STATE_ONLY");
  }
  const kind = String(request.data?.kind || "");
  if (!["memory", "yui_dialogue"].includes(kind)) {
    throw new HttpsError("invalid-argument", "INVALID_PRIVATE_STATE_KIND");
  }
  const value = request.data?.value;
  const serialized = JSON.stringify(value ?? null);
  if (serialized.length > 750000) throw new HttpsError("invalid-argument", "PRIVATE_STATE_TOO_LARGE");
  await getFirestore().doc(`students/${studentId}/private_learning_state/${kind}`).set({
    owner_uid: uid,
    value,
    updated_at: FieldValue.serverTimestamp()
  }, { merge: true });
  return { saved: true };
});

async function sharingContext(uid, user, studentId) {
  if (!linkedToStudent(user, studentId)) {
    throw new HttpsError("permission-denied", "STUDENT_LINK_REQUIRED");
  }
  const db = getFirestore();
  const [memberSnapshot, studentPrefSnapshot, guardianPrefSnapshot] = await Promise.all([
    db.doc(`students/${studentId}/members/${uid}`).get(),
    db.doc(`students/${studentId}/privacy_preferences/student`).get(),
    db.doc(`students/${studentId}/privacy_preferences/guardian`).get()
  ]);
  const role = resolveSharingRole(user, memberSnapshot.exists ? memberSnapshot.data() : null);
  if (!role) {
    throw new HttpsError("permission-denied", "ACTIVE_MEMBERSHIP_REQUIRED");
  }
  if (!memberSnapshot.exists && ["student", "parent"].includes(role)) {
    await db.doc(`students/${studentId}/members/${uid}`).set({
      uid,
      role,
      relationship: role === "student" ? "本人" : "保護者",
      permissions: role === "parent"
        ? INVITE_PERMISSIONS.parent
        : ["progress.read", "evidence.read", "evidence.write", "schedule.read", "schedule.write"],
      status: "active",
      migrated_from_legacy_link: true,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });
  }
  const student = studentPrefSnapshot.exists
    ? studentPrefSnapshot.data().permissions : DEFAULT_SHARING.student;
  const guardian = guardianPrefSnapshot.exists
    ? guardianPrefSnapshot.data().permissions : DEFAULT_SHARING.guardian;
  return { role, permissions: effectiveSharing(student, guardian, role) };
}

async function loadSupportSummaryData(db, studentId, permissions) {
  const [evidenceSnapshot, schedulesSnapshot, studentSnapshot] = await Promise.all([
    db.collection(`students/${studentId}/evidence_records`).limit(50).get(),
    db.collection(`students/${studentId}/schedules`).limit(30).get(),
    db.doc(`students/${studentId}`).get()
  ]);
  const records = evidenceSnapshot.docs.map((document) => document.data());
  const completed = records.filter((record) =>
    record.submitted === true || record.status === "completed"
      || Number.isFinite(Number(record.score)) && String(record.score ?? "").trim() !== "").length;
  const scores = records.map((record) => Number(record.score))
    .filter((score) => Number.isFinite(score) && score >= 0);
  const average = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const weaknesses = [...new Set(records.map((record) =>
    String(record.weaknessAnalysis || record.mistakeReason || "").trim()).filter(Boolean))].slice(0, 3);
  const latestDate = records.map((record) =>
    String(record.savedAt || record.submittedAt || record.date || "")).sort().reverse()[0] || "";
  const nextSchedules = schedulesSnapshot.docs.map((document) => document.data())
    .map((schedule) => ({
      title: String(schedule.title || schedule.label || "学習予定").slice(0, 80),
      date: String(schedule.date || schedule.start || "").slice(0, 30)
    })).slice(0, permissions.schedule === "detail" ? 10 : 3);
  return {
    studentName: String(studentSnapshot.data()?.display_name || "生徒").slice(0, 80),
    raw: {
      progress: {
        latestLearningDate: latestDate,
        status: completed ? "学習記録あり" : "記録なし"
      },
      studyTime: {
        minutes: records.reduce((sum, record) => sum + Math.max(0, Number(record.studyMinutes || 0)), 0)
      },
      completion: { completed, recorded: records.length },
      scores: permissions.scores === "detail"
        ? { average, count: scores.length, recent: scores.slice(-10) }
        : { average, count: scores.length },
      weaknesses: permissions.weaknesses === "detail" ? weaknesses : weaknesses.slice(0, 1),
      schedule: nextSchedules,
      evidence: { submittedCount: records.filter((record) => record.evidenceStoragePath).length },
      fatigue: { level: null, note: "本人の自己申告がある場合だけ表示" }
    }
  };
}

export const getSupportSummary = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const { role, permissions } = await sharingContext(uid, user, studentId);
  if (!["parent", "supporter", "teacher"].includes(role)) {
    throw new HttpsError("permission-denied", "SUPPORT_ROLE_REQUIRED");
  }
  const db = getFirestore();
  const summaryData = await loadSupportSummaryData(db, studentId, permissions);
  const filtered = filterSupportSummary(summaryData.raw, permissions);
  await db.collection(`students/${studentId}/access_logs`).add({
    viewer_uid: uid,
    viewer_role: role,
    viewer_name: String(user.displayName || user.email || role).slice(0, 80),
    action: "support_summary.read",
    fields: supportSummaryAccessFields(filtered),
    created_at: FieldValue.serverTimestamp()
  });
  return {
    student: {
      displayName: summaryData.studentName
    },
    role,
    fields: filtered
  };
});

export const submitGuardianQuestion = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const question = String(request.data?.question || "").trim().slice(0, 300);
  if (!question) throw new HttpsError("invalid-argument", "QUESTION_REQUIRED");
  const { role, permissions } = await sharingContext(uid, user, studentId);
  if (role !== "parent") throw new HttpsError("permission-denied", "PARENT_REQUIRED");
  const db = getFirestore();
  const summaryData = await loadSupportSummaryData(db, studentId, permissions);
  const fields = filterSupportSummary(summaryData.raw, permissions);
  const result = buildGuardianAnswer(question, fields);
  const questionRef = db.collection(`students/${studentId}/guardian_questions`).doc();
  await questionRef.set({
    asked_by_uid: uid,
    asked_by_name: String(user.displayName || user.email || "保護者").slice(0, 80),
    question,
    answer: result.answer,
    topic: result.field,
    fields_used: result.fieldsUsed,
    answer_type: "privacy_filtered_rule",
    status: "answered",
    created_at: FieldValue.serverTimestamp(),
    answered_at: FieldValue.serverTimestamp()
  });
  await db.collection(`students/${studentId}/access_logs`).add({
    viewer_uid: uid,
    viewer_role: "parent",
    viewer_name: String(user.displayName || user.email || "保護者").slice(0, 80),
    action: "guardian_question.answer",
    fields: result.fieldsUsed,
    created_at: FieldValue.serverTimestamp()
  });
  return { id: questionRef.id, answer: result.answer, fieldsUsed: result.fieldsUsed };
});

export const listGuardianQuestions = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (!canManageSharing(user, studentId) || !["student", "parent", "admin", "lead_teacher"].includes(user.role)) {
    throw new HttpsError("permission-denied", "GUARDIAN_QUESTION_HISTORY_NOT_ALLOWED");
  }
  const snapshot = await getFirestore().collection(`students/${studentId}/guardian_questions`)
    .orderBy("created_at", "desc").limit(30).get();
  return {
    questions: snapshot.docs.map((document) => {
      const item = document.data();
      return {
        id: document.id,
        askedByName: item.asked_by_name || "保護者",
        question: item.question || "",
        answer: item.answer || "",
        fieldsUsed: Array.isArray(item.fields_used) ? item.fields_used : [],
        createdAt: item.created_at?.toDate().toISOString() || ""
      };
    })
  };
});

export const listAccessLogs = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (!canManageSharing(user, studentId) || !["student", "parent", "admin", "lead_teacher"].includes(user.role)) {
    throw new HttpsError("permission-denied", "ACCESS_LOG_NOT_ALLOWED");
  }
  const snapshot = await getFirestore().collection(`students/${studentId}/access_logs`)
    .orderBy("created_at", "desc").limit(50).get();
  return {
    logs: snapshot.docs.map((document) => {
      const log = document.data();
      return {
        id: document.id,
        viewerRole: log.viewer_role || "",
        viewerName: log.viewer_name || "",
        action: log.action || "",
        fields: Array.isArray(log.fields) ? log.fields : [],
        createdAt: log.created_at?.toDate().toISOString() || ""
      };
    })
  };
});

export const inspectGroupInvite = onCall({ region: "us-east1" }, async (request) => {
  const hash = inviteHash(request.data?.token);
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new HttpsError("invalid-argument", "INVALID_INVITE");
  const snapshot = await getFirestore().doc(`group_invites/${hash}`).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "INVITE_NOT_FOUND");
  const invite = snapshot.data();
  const expired = !invite.expires_at || invite.expires_at.toMillis() <= Date.now();
  return {
    status: expired && invite.status === "issued" ? "expired" : invite.status,
    targetRole: invite.target_role,
    relationship: invite.relationship || "",
    expiresAt: invite.expires_at?.toDate().toISOString() || "",
    loginRequired: !request.auth?.uid
  };
});

export const createGroupInvite = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const targetRole = String(request.data?.targetRole || "").trim();
  if (!studentId || !INVITE_ROLES.has(targetRole)) {
    throw new HttpsError("invalid-argument", "INVALID_INVITE_REQUEST");
  }
  if (!canInvite(user, studentId)) throw new HttpsError("permission-denied", "INVITE_NOT_ALLOWED");

  const ttlHours = Math.min(72, Math.max(1, Number(request.data?.ttlHours) || 72));
  const token = randomBytes(32).toString("base64url");
  const hash = inviteHash(token);
  const now = Date.now();
  await getFirestore().doc(`group_invites/${hash}`).set({
    student_id: studentId,
    target_role: targetRole,
    target_email: normalizedEmail(request.data?.targetEmail),
    relationship: String(request.data?.relationship || "").trim().slice(0, 80),
    permissions: INVITE_PERMISSIONS[targetRole],
    status: "issued",
    invited_by_uid: uid,
    invited_by_role: user.role,
    created_at: FieldValue.serverTimestamp(),
    expires_at: Timestamp.fromMillis(now + ttlHours * 60 * 60 * 1000),
    claimed_by_uid: "",
    approved_by_uid: ""
  });
  return { token, expiresAt: new Date(now + ttlHours * 60 * 60 * 1000).toISOString() };
});

export const claimGroupInvite = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const hash = inviteHash(request.data?.token);
  const db = getFirestore();
  const inviteRef = db.doc(`group_invites/${hash}`);
  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (transaction) => {
    const [inviteSnapshot, userSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(userRef)
    ]);
    if (!inviteSnapshot.exists) throw new HttpsError("not-found", "INVITE_NOT_FOUND");
    if (!userSnapshot.exists) throw new HttpsError("failed-precondition", "USER_PROFILE_REQUIRED");
    const invite = inviteSnapshot.data();
    const user = userSnapshot.data();
    const claimState = inviteClaimState(invite);
    if (claimState === "already_used") throw new HttpsError("failed-precondition", "INVITE_ALREADY_USED");
    if (claimState === "expired") {
      transaction.update(inviteRef, { status: "expired", updated_at: FieldValue.serverTimestamp() });
      throw new HttpsError("deadline-exceeded", "INVITE_EXPIRED");
    }
    const expectedEmail = normalizedEmail(invite.target_email);
    const actualEmail = normalizedEmail(request.auth.token.email || user.email);
    if (expectedEmail && expectedEmail !== actualEmail) {
      throw new HttpsError("permission-denied", "INVITE_EMAIL_MISMATCH");
    }
    transaction.update(inviteRef, {
      status: "pending_approval",
      claimed_by_uid: uid,
      claimed_email: actualEmail,
      claimed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    });
  });
  return { status: "pending_approval" };
});

export const approveGroupInvite = onCall({ region: "us-east1" }, async (request) => {
  const approverUid = requireAuth(request);
  const inviteId = String(request.data?.inviteId || "");
  const db = getFirestore();
  const inviteRef = db.doc(`group_invites/${inviteId}`);
  await db.runTransaction(async (transaction) => {
    const [inviteSnapshot, approverSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(db.doc(`users/${approverUid}`))
    ]);
    if (!inviteSnapshot.exists || !approverSnapshot.exists) {
      throw new HttpsError("not-found", "INVITE_OR_APPROVER_NOT_FOUND");
    }
    const invite = inviteSnapshot.data();
    const approver = approverSnapshot.data();
    if (!canApprove(approver, invite.student_id)) throw new HttpsError("permission-denied", "APPROVAL_NOT_ALLOWED");
    if (invite.status !== "pending_approval" || !invite.claimed_by_uid) {
      throw new HttpsError("failed-precondition", "INVITE_NOT_PENDING");
    }
    const memberRef = db.doc(`students/${invite.student_id}/members/${invite.claimed_by_uid}`);
    const claimedUserRef = db.doc(`users/${invite.claimed_by_uid}`);
    transaction.set(memberRef, {
      uid: invite.claimed_by_uid,
      role: invite.target_role,
      relationship: invite.relationship || "",
      permissions: invite.permissions || INVITE_PERMISSIONS[invite.target_role] || [],
      status: "active",
      invited_by_uid: invite.invited_by_uid,
      approved_by_uid: approverUid,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.update(claimedUserRef, {
      role: invite.target_role,
      linked_student_ids: FieldValue.arrayUnion(invite.student_id),
      status: "active",
      updated_at: FieldValue.serverTimestamp()
    });
    transaction.update(inviteRef, {
      status: "approved",
      approved_by_uid: approverUid,
      approved_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    });
  });
  return { status: "approved" };
});

export const revokeGroupInvite = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const inviteId = String(request.data?.inviteId || "");
  const db = getFirestore();
  const inviteRef = db.doc(`group_invites/${inviteId}`);
  const [inviteSnapshot, user] = await Promise.all([inviteRef.get(), requireUser(uid)]);
  if (!inviteSnapshot.exists) throw new HttpsError("not-found", "INVITE_NOT_FOUND");
  const invite = inviteSnapshot.data();
  if (!canRevokeInvite(invite, user.data, uid)) {
    throw new HttpsError("permission-denied", "REVOKE_NOT_ALLOWED");
  }
  await inviteRef.update({
    status: "revoked",
    revoked_by_uid: uid,
    revoked_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  return { status: "revoked" };
});

export const listGroupInvites = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  if (!studentId || !canApprove(user, studentId)) throw new HttpsError("permission-denied", "LIST_NOT_ALLOWED");
  const snapshot = await getFirestore().collection("group_invites")
    .where("student_id", "==", studentId)
    .limit(50)
    .get();
  return {
    invites: snapshot.docs.map((document) => {
      const invite = document.data();
      return {
        id: document.id,
        targetRole: invite.target_role,
        targetEmail: invite.target_email,
        relationship: invite.relationship || "",
        status: invite.status,
        expiresAt: invite.expires_at?.toDate().toISOString() || "",
        claimedEmail: invite.claimed_email || ""
      };
    })
  };
});

export const recoverStalledEvidenceAnalyses = onCall(
  { region: "us-east1", memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    const uid = requireAuth(request);
    const { data: user } = await requireUser(uid);
    const studentId = String(request.data?.studentId || "").trim();
    if (!studentId || !linkedToStudent(user, studentId) || !["student", "parent", "teacher", "lead_teacher", "admin"].includes(user.role)) {
      throw new HttpsError("permission-denied", "RECOVERY_NOT_ALLOWED");
    }
    const snapshot = await getFirestore().collection(`students/${studentId}/evidence_records`)
      .where("aiAnalysisStatus", "in", ["queued", "processing"])
      .limit(20)
      .get();
    const cutoff = Date.now() - 10 * 60 * 1000;
    const stalled = snapshot.docs.filter((document) => {
      const record = document.data();
      const updated = record.aiAnalysisUpdatedAt?.toMillis?.()
        || Date.parse(record.savedAt || record.submittedAt || "");
      return Number.isFinite(updated) && updated < cutoff && record.evidenceStoragePath;
    }).slice(0, 3);

    let recovered = 0;
    for (const document of stalled) {
      const record = document.data();
      const bucketName = `${process.env.GCLOUD_PROJECT || "cortex-limit-break"}.firebasestorage.app`;
      const file = getStorage().bucket(bucketName).file(record.evidenceStoragePath);
      try {
        const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
        await document.ref.set({
          aiAnalysisStatus: "queued",
          aiAnalysisError: "",
          aiAnalysisRetryCount: FieldValue.increment(1),
          aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        await file.save(buffer, {
          resumable: false,
          contentType: metadata.contentType || "image/jpeg",
          metadata: {
            metadata: {
              ...(metadata.metadata || {}),
              retry_id: String(Date.now())
            }
          }
        });
        recovered += 1;
      } catch (_) {
        await document.ref.set({
          aiAnalysisStatus: "error",
          aiAnalysisError: "AI_ANALYSIS_RECOVERY_FAILED",
          aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
    return { recovered, checked: snapshot.size };
  }
);

export const regradeEvidenceAnalysis = onCall(
  { region: "us-east1", memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    const uid = requireAuth(request);
    const { data: user } = await requireUser(uid);
    const studentId = String(request.data?.studentId || "").trim();
    const recordId = String(request.data?.recordId || "").trim();
    const allowedRoles = ["student", "parent", "supporter", "teacher", "lead_teacher", "admin"];
    if (!studentId || !recordId || !linkedToStudent(user, studentId) || !allowedRoles.includes(user.role)) {
      throw new HttpsError("permission-denied", "REGRADE_NOT_ALLOWED");
    }
    const recordRef = getFirestore().doc(`students/${studentId}/evidence_records/${recordId}`);
    const snapshot = await recordRef.get();
    if (!snapshot.exists) throw new HttpsError("not-found", "EVIDENCE_NOT_FOUND");
    const record = snapshot.data();
    if (!record.evidenceStoragePath) {
      throw new HttpsError("failed-precondition", "EVIDENCE_IMAGE_NOT_STORED");
    }
    if (record.gradingReviewStatus === "confirmed") {
      throw new HttpsError("failed-precondition", "CONFIRMED_GRADING_CANNOT_BE_REPLACED");
    }
    if (["queued", "processing"].includes(record.aiAnalysisStatus)) {
      return { status: record.aiAnalysisStatus, changed: false };
    }

    const bucketName = `${process.env.GCLOUD_PROJECT || "cortex-limit-break"}.firebasestorage.app`;
    const file = getStorage().bucket(bucketName).file(record.evidenceStoragePath);
    try {
      const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      await recordRef.set({
        aiAnalysisStatus: "queued",
        aiAnalysisError: "",
        aiAnalysisRetryCount: FieldValue.increment(1),
        aiAnalysisRequestedBy: uid,
        aiAnalysisUpdatedAt: FieldValue.serverTimestamp(),
        gradingMarks: [],
        proposedGradingMarks: [],
        gradingDisagreements: [],
        aiConsensusSummary: null,
        gradingReviewStatus: "not_available"
      }, { merge: true });
      await file.save(buffer, {
        resumable: false,
        contentType: metadata.contentType || record.evidenceImageType || "image/jpeg",
        metadata: {
          metadata: {
            ...(metadata.metadata || {}),
            retry_id: String(Date.now()),
            retry_requested_by: uid
          }
        }
      });
      return { status: "queued", changed: true };
    } catch (_) {
      await recordRef.set({
        aiAnalysisStatus: "error",
        aiAnalysisError: "AI_REGRADE_REQUEST_FAILED",
        aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      throw new HttpsError("internal", "AI_REGRADE_REQUEST_FAILED");
    }
  }
);

export const confirmEvidenceGrading = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const recordId = String(request.data?.recordId || "").trim();
  const decisions = Array.isArray(request.data?.decisions) ? request.data.decisions : [];
  if (!studentId || !recordId || !linkedToStudent(user, studentId)
    || !["parent", "teacher", "lead_teacher", "admin"].includes(user.role)) {
    throw new HttpsError("permission-denied", "GRADING_CONFIRMATION_NOT_ALLOWED");
  }
  const recordRef = getFirestore().doc(`students/${studentId}/evidence_records/${recordId}`);
  const snapshot = await recordRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "EVIDENCE_NOT_FOUND");
  const record = snapshot.data();
  const disagreements = Array.isArray(record.gradingDisagreements)
    ? record.gradingDisagreements
    : [];
  if (!disagreements.length) {
    throw new HttpsError("failed-precondition", "NO_GRADING_DISAGREEMENTS");
  }
  if (decisions.length !== disagreements.length) {
    throw new HttpsError("invalid-argument", "ALL_DISAGREEMENTS_REQUIRE_DECISIONS");
  }

  const humanMarks = disagreements.map((item, index) => {
    const decision = decisions.find((candidate) => Number(candidate?.index) === index);
    const result = String(decision?.result || "");
    const correctAnswer = String(decision?.correctAnswer || "").trim().slice(0, 120);
    if (!["correct", "incorrect"].includes(result) || !correctAnswer) {
      throw new HttpsError("invalid-argument", "INVALID_HUMAN_GRADING_DECISION");
    }
    return {
      label: String(item.label || `設問${index + 1}`).slice(0, 80),
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      result,
      detectedAnswer: item.primary?.detectedAnswer || item.reviewer?.detectedAnswer || "",
      correctAnswer,
      markConfidence: 1,
      verification: "human_confirmed",
      evidenceBasis: "人間が答案画像とAIの模範解答案を確認して確定"
    };
  });
  const consensusMarks = Array.isArray(record.proposedGradingMarks)
    ? record.proposedGradingMarks
    : [];
  const gradingMarks = [...consensusMarks, ...humanMarks];
  await recordRef.set({
    gradingMarks,
    gradingReviewStatus: "confirmed",
    aiAnalysisStatus: "completed",
    humanGradingReview: {
      confirmedBy: uid,
      confirmerRole: user.role,
      decisions: humanMarks.map((mark) => ({
        label: mark.label,
        result: mark.result,
        correctAnswer: mark.correctAnswer
      }))
    },
    humanGradingConfirmedAt: FieldValue.serverTimestamp(),
    aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { status: "confirmed", gradingMarks };
});

export const cancelEvidenceAnalysis = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const recordId = String(request.data?.recordId || "").trim();
  if (!studentId || !recordId || !linkedToStudent(user, studentId) || !["student", "parent", "teacher", "lead_teacher", "admin"].includes(user.role)) {
    throw new HttpsError("permission-denied", "CANCEL_NOT_ALLOWED");
  }
  const recordRef = getFirestore().doc(`students/${studentId}/evidence_records/${recordId}`);
  const snapshot = await recordRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "EVIDENCE_NOT_FOUND");
  const status = snapshot.data().aiAnalysisStatus;
  if (!["queued", "processing", "stalled"].includes(status)) {
    return { status, changed: false };
  }
  await recordRef.set({
    aiAnalysisStatus: "cancelled",
    aiAnalysisError: "",
    aiAnalysisCancelledBy: uid,
    aiAnalysisCancelledAt: FieldValue.serverTimestamp(),
    aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { status: "cancelled", changed: true };
});

export const deleteFailedEvidenceRecord = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const recordId = String(request.data?.recordId || "").trim();
  if (!studentId || !recordId || !linkedToStudent(user, studentId) || !["student", "parent", "teacher", "lead_teacher", "admin"].includes(user.role)) {
    throw new HttpsError("permission-denied", "DELETE_FAILED_EVIDENCE_NOT_ALLOWED");
  }
  const recordRef = getFirestore().doc(`students/${studentId}/evidence_records/${recordId}`);
  const snapshot = await recordRef.get();
  if (!snapshot.exists) return { deleted: true };
  const record = snapshot.data();
  const isFailedPlaceholder = record.firebaseSyncStatus === "error"
    || (!record.evidenceStoragePath && !["completed"].includes(record.aiAnalysisStatus));
  if (!isFailedPlaceholder) {
    throw new HttpsError("failed-precondition", "ONLY_FAILED_PLACEHOLDER_CAN_BE_DELETED");
  }
  await recordRef.delete();
  return { deleted: true };
});

export const deleteEvidenceSubmission = onCall({ region: "us-east1" }, async (request) => {
  const uid = requireAuth(request);
  const { data: user } = await requireUser(uid);
  const studentId = String(request.data?.studentId || "").trim();
  const recordId = String(request.data?.recordId || "").trim();
  if (!studentId || !recordId || !linkedToStudent(user, studentId)) {
    throw new HttpsError("permission-denied", "DELETE_EVIDENCE_NOT_ALLOWED");
  }
  if (!["student", "teacher", "lead_teacher", "admin"].includes(user.role)) {
    throw new HttpsError("permission-denied", "DELETE_EVIDENCE_NOT_ALLOWED");
  }
  const recordRef = getFirestore().doc(`students/${studentId}/evidence_records/${recordId}`);
  const snapshot = await recordRef.get();
  if (!snapshot.exists) return { deleted: true };
  const record = snapshot.data();
  if (record.gradingReviewStatus === "confirmed" && !["teacher", "lead_teacher", "admin"].includes(user.role)) {
    throw new HttpsError("failed-precondition", "CONFIRMED_EVIDENCE_REQUIRES_TEACHER");
  }
  if (user.role === "student" && record.created_by_uid && record.created_by_uid !== uid) {
    throw new HttpsError("permission-denied", "NOT_EVIDENCE_OWNER");
  }
  if (record.evidenceStoragePath) {
    try {
      await getStorage().bucket().file(record.evidenceStoragePath).delete({ ignoreNotFound: true });
    } catch (error) {
      if (Number(error?.code) !== 404) {
        throw new HttpsError("internal", "EVIDENCE_FILE_DELETE_FAILED");
      }
    }
  }
  await recordRef.delete();
  return {
    deleted: true,
    submissionGroupId: record.submissionGroupId || "",
    pageNumber: Number(record.pageNumber || 1)
  };
});

const MATERIAL_HINTS = [
  ["数学", "中学総復習数学"],
  ["数学Ⅰ", "ベーシックレベル数学Ⅰ"],
  ["数学A", "ベーシックレベル数学A"],
  ["数学Ⅱ", "ベーシックレベル数学Ⅱ"],
  ["数学B", "ベーシックレベル数学B"],
  ["英語", "中学総復習英語"],
  ["英語", "高1・高2・高3 英語超入門"],
  ["英語", "ベーシックレベル英語"],
  ["英語", "スタンダードレベル英語 文法・読解"],
  ["英語", "スタンダードレベル英語 長文"],
  ["物理基礎", "ベーシックレベル物理基礎"],
  ["物理", "ベーシックレベル物理"],
  ["化学基礎", "ベーシックレベル化学基礎"],
  ["化学", "ベーシックレベル化学"],
  ["国語", "高3スタンダード現代文"],
  ["古文", "高1・高2・高3 古文"],
  ["公共", "ベーシックレベル公共"]
].map(([subject, course]) => ({ subject, course }));

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    course: { type: "string" },
    lesson: { type: "string" },
    part: { type: "string" },
    unit: { type: "string" },
    testType: { type: "string" },
    documentType: {
      type: "string",
      enum: ["result_screen", "answer_sheet", "question_sheet", "unknown"]
    },
    answeredCount: { type: ["integer", "null"] },
    correctRate: { type: ["number", "null"], minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    needsReview: { type: "boolean" },
    reviewReason: { type: "string" },
    detectedTextSummary: { type: "string" },
    strengthAnalysis: { type: "string" },
    weaknessAnalysis: { type: "string" },
    nextLearningAction: { type: "string" },
    answerMarks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          result: { type: "string", enum: ["correct", "incorrect", "unknown"] },
          x: { type: "number", minimum: 0, maximum: 100 },
          y: { type: "number", minimum: 0, maximum: 100 },
          detectedAnswer: { type: "string" },
          correctAnswer: { type: "string" },
          markConfidence: { type: "number", minimum: 0, maximum: 1 },
          evidenceBasis: { type: "string" }
        },
        required: [
          "label", "result", "x", "y", "detectedAnswer", "correctAnswer",
          "markConfidence", "evidenceBasis"
        ]
      }
    },
    learningIssues: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          problemLabel: { type: "string" },
          contentSummary: { type: "string" },
          domain: { type: "string" },
          unit: { type: "string" },
          skillTags: {
            type: "array",
            maxItems: 8,
            items: { type: "string" }
          },
          mistakeType: {
            type: "string",
            enum: ["knowledge", "calculation", "reading", "condition", "careless", "unknown"]
          },
          detectedAnswer: { type: "string" },
          correctAnswer: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: [
          "problemLabel", "contentSummary", "domain", "unit", "skillTags",
          "mistakeType", "detectedAnswer", "correctAnswer", "confidence"
        ]
      }
    }
  },
  required: [
    "subject", "course", "lesson", "part", "unit", "testType", "documentType",
    "answeredCount", "correctRate", "confidence", "needsReview",
    "reviewReason", "detectedTextSummary", "strengthAnalysis",
    "weaknessAnalysis", "nextLearningAction", "answerMarks", "learningIssues"
  ]
};

function parseEvidencePath(name) {
  const match = String(name || "").match(/^students\/([^/]+)\/evidence\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { studentId: match[1], date: match[2], fileName: match[3] };
}

function safeRecordId(date, missionId) {
  return `${date}_${missionId}`
    .replace(/[\/#?[\]]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);
}

async function rebuildPlanForStudent(studentId) {
  const db = getFirestore();
  const evidenceSnapshot = await db.collection(`students/${studentId}/evidence_records`).get();
  const records = evidenceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const today = dateKeyJst();
  const plan = buildAdaptivePlan({
    studentId,
    records,
    today,
    deadline: adaptiveDeadline.value()
  });
  const payload = { ...plan, generatedAt: FieldValue.serverTimestamp() };
  await Promise.all([
    db.doc(`students/${studentId}/adaptive_plans/${today}`).set(payload, { merge: true }),
    db.doc(`students/${studentId}/adaptive_state/current`).set(payload, { merge: true })
  ]);
  return plan;
}

async function saveLearningIssuesForEvidence({
  db,
  studentId,
  recordId,
  storagePath,
  analysis,
  recordContext
}) {
  const issues = buildVerifiedLearningIssues(analysis, {
    ...recordContext,
    recordId,
    storagePath
  });
  if (!issues.length) return [];
  const issueRefs = issues.map((issue) => db.doc(`students/${studentId}/learning_issues/${issue.id}`));
  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(issueRefs.map((ref) => transaction.get(ref)));
    issues.forEach((issue, index) => {
      const issueRef = issueRefs[index];
      const snapshot = snapshots[index];
      const existing = snapshot.exists ? snapshot.data() : {};
      const sourceRecordIds = Array.isArray(existing.source_record_ids) ? existing.source_record_ids : [];
      const isNewOccurrence = !sourceRecordIds.includes(recordId);
      const payload = {
        student_id: studentId,
        subject: issue.subject,
        course: issue.course,
        lesson: issue.lesson,
        part: issue.part,
        domain: issue.domain,
        unit: issue.unit,
        problem_label: issue.problemLabel,
        content_summary: issue.contentSummary,
        mistake_type: issue.mistakeType,
        skill_tags: issue.skillTags,
        latest_detected_answer: issue.detectedAnswer,
        latest_correct_answer: issue.correctAnswer,
        confidence: issue.confidence,
        source_record_ids: FieldValue.arrayUnion(recordId),
        source_storage_paths: FieldValue.arrayUnion(storagePath),
        occurrence_count: isNewOccurrence ? FieldValue.increment(1) : (existing.occurrence_count || 1),
        review_count: existing.review_count || 0,
        correct_streak: 0,
        status: "reviewing",
        review_status: "ai_proposed",
        visible_to: ["student", "parent", "supporter", "teacher"],
        schema_version: issue.schemaVersion,
        last_detected_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      };
      if (!snapshot.exists) payload.first_detected_at = FieldValue.serverTimestamp();
      if (existing.status === "resolved" && isNewOccurrence) {
        payload.reopened_at = FieldValue.serverTimestamp();
      }
      transaction.set(issueRef, payload, { merge: true });
    });
  });
  return issues.map((issue) => issue.id);
}

export const rebuildAdaptiveSchedules = onSchedule(
  {
    schedule: "55 8 * * *",
    timeZone: "Asia/Tokyo",
    region: "us-east1",
    memory: "512MiB",
    timeoutSeconds: 300,
    retryCount: 1
  },
  async () => {
    const usersSnapshot = await getFirestore().collection("users").get();
    const studentIds = new Set();
    usersSnapshot.docs.forEach((doc) => {
      const linkedIds = doc.data().linked_student_ids;
      if (Array.isArray(linkedIds)) linkedIds.forEach((id) => id && studentIds.add(String(id)));
    });
    await Promise.all([...studentIds].map((studentId) => rebuildPlanForStudent(studentId)));
  }
);

export const rebuildAdaptiveScheduleOnEvidence = onDocumentWritten(
  {
    document: "students/{studentId}/evidence_records/{recordId}",
    region: "us-east1",
    memory: "512MiB",
    timeoutSeconds: 120
  },
  async (event) => rebuildPlanForStudent(event.params.studentId)
);

function evidenceAnalysisPrompt(role) {
  return [
    `あなたは日本の学習答案を採点する${role}です。ほかのAIの回答は見ず、独立して判定してください。`,
    "教科、教材名、講、PART/Chapter、単元、テスト種別、回答数、正答率を抽出してください。",
    "次の登録教材を優先して照合してください。完全一致しなければ画像内表記を使ってください。",
    JSON.stringify(MATERIAL_HINTS),
    "読めない値は空文字またはnullにし、推測が強い場合はneedsReview=trueにしてください。",
    "問題文や解答本文は保存せず、detectedTextSummaryは識別に必要な短い見出しだけにしてください。",
    "最初にdocumentTypeを結果画面・答案・問題用紙・不明へ分類してください。",
    "答案の採点は、問題文・生徒解答・数学的に検証した正答の3点がそろう設問だけ行ってください。",
    "正答表が画像にない場合も、計算・論証できる問題は自分で解いて正答を検証してください。",
    "図形、角度、根号、分数、選択肢、複数解答枠を別々に確認してください。",
    "1点でも不明ならresult=unknownとし、ページ全体ではなく設問単位で判定してください。",
    "answerMarksのx,yは実際の解答記入欄の中心を画像左上基準の百分率で返してください。",
    "見出し、余白、印刷例、得点欄、アプリ操作欄、サムネイルには採点位置を置かないでください。",
    "各markConfidenceと、正誤判断の短い根拠evidenceBasisを返してください。",
    "できた点、弱点、次の学習は短く返してください。答案から正答率を推測計算しないでください。",
    "learningIssuesはresult=incorrectで、問題・生徒解答・正答が明瞭な設問だけ返してください。",
    "個人情報や問題文全体は出力しないでください。"
  ].join("\n");
}

function parseMaterialPath(name) {
  const match = String(name || "").match(/^students\/([^/]+)\/materials\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { studentId: match[1], materialId: match[2], fileName: match[3] };
}

const MATERIAL_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    materialName: { type: "string" },
    subject: { type: "string" },
    materialType: { type: "string", enum: ["reference", "workbook", "combined", "school_text", "unknown"] },
    detectedPageCount: { type: "integer", minimum: 1 },
    difficulty: { type: "string", enum: ["foundation", "basic", "standard", "advanced"] },
    estimatedUnits: { type: "integer", minimum: 1 },
    overallLearningGoals: { type: "array", maxItems: 8, items: { type: "string" } },
    recommendedUse: { type: "string" },
    warnings: { type: "array", maxItems: 8, items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    needsReview: { type: "boolean" },
    unitStructure: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          order: { type: "integer", minimum: 1 },
          title: { type: "string" },
          pageStart: { type: ["integer", "null"] },
          pageEnd: { type: ["integer", "null"] },
          estimatedProblems: { type: ["integer", "null"] },
          difficulty: { type: "string", enum: ["foundation", "basic", "standard", "advanced"] },
          prerequisites: { type: "array", maxItems: 6, items: { type: "string" } },
          learningGoals: { type: "array", maxItems: 6, items: { type: "string" } }
        },
        required: ["order", "title", "pageStart", "pageEnd", "estimatedProblems", "difficulty", "prerequisites", "learningGoals"]
      }
    }
  },
  required: [
    "materialName", "subject", "materialType", "detectedPageCount", "difficulty",
    "estimatedUnits", "overallLearningGoals", "recommendedUse", "warnings",
    "confidence", "needsReview", "unitStructure"
  ]
};

async function requestEvidenceAnalysis({
  openrouter,
  model,
  role,
  dataUrl,
  isPdf,
  fileName,
  reasoningEffort
}) {
  const startedAt = Date.now();
  const request = {
    model,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: evidenceAnalysisPrompt(role) },
        isPdf
          ? { type: "file", file: { filename: fileName, file_data: dataUrl } }
          : { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
      ]
    }],
    ...(isPdf ? {
      plugins: [{
        id: "file-parser",
        pdf: { engine: "cloudflare-ai" }
      }]
    } : {}),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evidence_analysis",
        strict: true,
        schema: ANALYSIS_SCHEMA
      }
    },
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    stream: false
  };
  let response;
  try {
    response = await openrouter.chat.completions.create(request);
  } catch (error) {
    // Some OpenRouter providers reject reasoning_effort even when the routed
    // model otherwise supports image analysis. Retry once without that hint.
    if (reasoningEffort && Number(error?.status) === 400) {
      const { reasoning_effort: _ignored, ...compatibleRequest } = request;
      response = await openrouter.chat.completions.create(compatibleRequest);
    } else {
      throw error;
    }
  }
  const output = response.choices?.[0]?.message?.content;
  if (!output) throw new Error(`${model} returned an empty analysis response.`);
  return {
    model,
    analysis: JSON.parse(output),
    elapsedMs: Date.now() - startedAt,
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens ?? null,
      completionTokens: response.usage.completion_tokens ?? null,
      totalTokens: response.usage.total_tokens ?? null,
      cost: response.usage.cost ?? null
    } : null
  };
}

export const analyzeEvidenceImage = onObjectFinalized(
  {
    region: "us-east1",
    memory: "1GiB",
    timeoutSeconds: 120,
    secrets: [openRouterApiKey]
  },
  async (event) => {
    const object = event.data;
    const path = parseEvidencePath(object.name);
    const contentType = String(object.contentType || "");
    const isPdf = contentType === "application/pdf";
    if (!path || (!contentType.startsWith("image/") && !isPdf)) return;

    const missionId = object.metadata?.mission_id;
    if (!missionId) return;

    const db = getFirestore();
    const recordId = safeRecordId(path.date, missionId);
    const recordRef = db.doc(`students/${path.studentId}/evidence_records/${recordId}`);
    await recordRef.set({
      aiAnalysisStatus: "processing",
      evidenceStatus: "submitted",
      evidenceImageName: object.metadata?.original_file_name || path.fileName,
      evidenceImageType: contentType || "image/jpeg",
      evidenceStoragePath: object.name,
      submissionGroupId: object.metadata?.submission_group_id || "",
      pageNumber: Number(object.metadata?.page_number || 1),
      pageCount: Number(object.metadata?.page_count || 1),
      firebaseSyncStatus: "synced",
      aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    try {
      const [buffer] = await getStorage().bucket(object.bucket).file(object.name).download();
      const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
      const openrouter = new OpenAI({
        apiKey: openRouterApiKey.value(),
        baseURL: "https://openrouter.ai/api/v1",
        timeout: 90000,
        maxRetries: 1,
        defaultHeaders: {
          "HTTP-Referer": "https://wit-ai-apps.github.io/limit-break-project/",
          "X-OpenRouter-Title": "CORTEX Limit Break"
        }
      });
      const fileName = object.metadata?.original_file_name || path.fileName;
      const [primaryRun, reviewerRun] = await Promise.allSettled([
        requestEvidenceAnalysis({
          openrouter,
          model: primaryVisionModel.value(),
          role: "第一採点AI",
          dataUrl,
          isPdf,
          fileName,
          reasoningEffort: "minimal"
        }),
        requestEvidenceAnalysis({
          openrouter,
          model: reviewVisionModel.value(),
          role: "独立再判定AI",
          dataUrl,
          isPdf,
          fileName,
          reasoningEffort: "medium"
        })
      ]);
      if (primaryRun.status === "rejected" && reviewerRun.status === "rejected") {
        throw primaryRun.reason;
      }
      const primaryResult = primaryRun.status === "fulfilled"
        ? primaryRun.value
        : {
            model: primaryVisionModel.value(),
            analysis: { answerMarks: [] },
            elapsedMs: null,
            usage: null,
            error: "PRIMARY_AI_UNAVAILABLE"
          };
      const reviewerResult = reviewerRun.status === "fulfilled"
        ? reviewerRun.value
        : {
            model: reviewVisionModel.value(),
            analysis: { answerMarks: [] },
            elapsedMs: null,
            usage: null,
            error: "REVIEW_AI_UNAVAILABLE"
          };
      const analysis = primaryRun.status === "fulfilled"
        ? primaryResult.analysis
        : reviewerResult.analysis;
      const reviewAnalysis = reviewerResult.analysis;
      const reconciliation = reconcileGradingAnalyses(primaryResult.analysis, reviewAnalysis, {
        minimumConfidence: 0.9
      });
      const latestSnapshot = await recordRef.get();
      if (latestSnapshot.data()?.aiAnalysisStatus === "cancelled") return;
      const bothModelsCompleted = primaryRun.status === "fulfilled" && reviewerRun.status === "fulfilled";
      const classificationConfident = bothModelsCompleted && analysis.confidence >= 0.9 && !analysis.needsReview;
      const resultScreenConfident = analysis.documentType === "result_screen" && classificationConfident;
      const proposedMarks = reconciliation.consensusMarks;
      // AI grading remains a proposal until a teacher confirms it.
      // Do not let experimental marks alter weakness records or study plans.
      const learningIssueIds = [];
      await recordRef.set({
        subject: analysis.subject || "未分類",
        course: analysis.course || "教材不明",
        lesson: analysis.lesson || "",
        part: analysis.part || analysis.unit || "",
        testType: analysis.testType || "確認テスト",
        answeredCount: resultScreenConfident ? (analysis.answeredCount ?? "") : "",
        score: resultScreenConfident ? (analysis.correctRate ?? "") : "",
        aiAnalysis: primaryRun.status === "fulfilled" ? analysis : null,
        aiReviewAnalysis: reviewerRun.status === "fulfilled" ? reviewAnalysis : null,
        aiAnalysisError: bothModelsCompleted
          ? ""
          : primaryRun.status === "rejected"
            ? "PRIMARY_AI_UNAVAILABLE"
            : "REVIEW_AI_UNAVAILABLE",
        strengthAnalysis: analysis.strengthAnalysis || "",
        weaknessAnalysis: analysis.weaknessAnalysis || "",
        nextLearningAction: analysis.nextLearningAction || "",
        learningIssueIds,
        learningIssueCount: learningIssueIds.length,
        proposedLearningIssueCount: Array.isArray(analysis.learningIssues)
          ? analysis.learningIssues.length
          : 0,
        proposedGradingMarks: proposedMarks,
        gradingDisagreements: reconciliation.disagreements,
        aiConsensusSummary: reconciliation.summary,
        gradingMarks: [],
        gradingReviewStatus: reconciliation.disagreements.length
          ? "ai_disagreement"
          : proposedMarks.length
            ? "teacher_confirmation_required"
            : "not_available",
        aiAnalysisStatus: resultScreenConfident ? "completed" : "needs_review",
        aiAnalysisModel: primaryResult.model,
        aiReviewModel: reviewerResult.model,
        aiModelRuns: [
          {
            role: "primary",
            model: primaryResult.model,
            elapsedMs: primaryResult.elapsedMs,
            usage: primaryResult.usage,
            status: primaryRun.status === "fulfilled" ? "completed" : "unavailable"
          },
          {
            role: "reviewer",
            model: reviewerResult.model,
            elapsedMs: reviewerResult.elapsedMs,
            usage: reviewerResult.usage,
            status: reviewerRun.status === "fulfilled" ? "completed" : "unavailable"
          }
        ],
        aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      await recordRef.set({
        aiAnalysisStatus: "error",
        aiAnalysisError: "AI_ANALYSIS_FAILED",
        aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      throw error;
    }
  }
);

export const analyzeUploadedMaterial = onObjectFinalized(
  {
    region: "us-east1",
    memory: "1GiB",
    timeoutSeconds: 300,
    secrets: [openRouterApiKey]
  },
  async (event) => {
    const object = event.data;
    const path = parseMaterialPath(object.name);
    if (!path || String(object.contentType || "") !== "application/pdf") return;
    const db = getFirestore();
    const materialRef = db.doc(`students/${path.studentId}/materials/${path.materialId}`);
    const snapshot = await materialRef.get();
    if (!snapshot.exists) return;
    const material = snapshot.data();
    await materialRef.set({
      analysisStatus: "processing",
      analysisError: "",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    try {
      const [buffer] = await getStorage().bucket(object.bucket).file(object.name).download();
      const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
      const openrouter = new OpenAI({
        apiKey: openRouterApiKey.value(),
        baseURL: "https://openrouter.ai/api/v1",
        timeout: 240000,
        maxRetries: 1,
        defaultHeaders: {
          "HTTP-Referer": "https://wit-ai-apps.github.io/limit-break-project/",
          "X-OpenRouter-Title": "CORTEX Limit Break Material Planner"
        }
      });
      const response = await openrouter.chat.completions.create({
        model: primaryVisionModel.value(),
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "日本の生徒向け教材PDFの学習計画を作るため、教材の構造だけを分析してください。",
                "著作権保護のため、問題文・解説・解答・長い本文は転記しないでください。",
                "教材名、教科、教材種別、推定ページ数、難易度、短い章見出し、学習目標、前提単元だけを返してください。",
                "判別できない場合は推測で埋めずneedsReview=trueにしてください。",
                `利用者入力: ${JSON.stringify({
                  materialName: material.materialName || "",
                  subject: material.subject || "",
                  designation: material.designation || "",
                  goal: material.goal || ""
                })}`
              ].join("\n")
            },
            { type: "file", file: { filename: material.originalFileName || path.fileName, file_data: dataUrl } }
          ]
        }],
        plugins: [{ id: "file-parser", pdf: { engine: "cloudflare-ai" } }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "material_profile", strict: true, schema: MATERIAL_ANALYSIS_SCHEMA }
        },
        stream: false
      });
      const output = response.choices?.[0]?.message?.content;
      if (!output) throw new Error("MATERIAL_ANALYSIS_EMPTY");
      const profile = JSON.parse(output);
      const studyPlan = buildMaterialStudyPlan(profile, {
        deadline: material.deadline,
        weeklyStudyDays: material.weeklyStudyDays,
        dailyMinutes: material.dailyMinutes,
        designation: material.designation
      });
      await materialRef.set({
        analysisStatus: profile.needsReview ? "needs_review" : "completed",
        materialProfile: profile,
        studyPlan,
        analysisModel: primaryVisionModel.value(),
        analysisUsage: response.usage ? {
          promptTokens: response.usage.prompt_tokens ?? null,
          completionTokens: response.usage.completion_tokens ?? null,
          totalTokens: response.usage.total_tokens ?? null,
          cost: response.usage.cost ?? null
        } : null,
        analyzedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Material analysis failed", path.studentId, path.materialId, error);
      await materialRef.set({
        analysisStatus: "error",
        analysisError: "MATERIAL_ANALYSIS_FAILED",
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
);
