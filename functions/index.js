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

initializeApp();

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
const visionModel = defineString("OPENROUTER_VISION_MODEL", { default: "openai/gpt-4o-mini" });
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
    }
  },
  required: [
    "subject", "course", "lesson", "part", "unit", "testType", "documentType",
    "answeredCount", "correctRate", "confidence", "needsReview",
    "reviewReason", "detectedTextSummary", "strengthAnalysis",
    "weaknessAnalysis", "nextLearningAction", "answerMarks"
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
      const response = await openrouter.chat.completions.create({
        model: visionModel.value(),
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "日本の高校学習用の確認テスト・答案・結果画面を解析してください。",
                "教科、教材名、講、PART/Chapter、単元、テスト種別、回答数、正答率を抽出してください。",
                "次の登録教材を優先して照合してください。完全一致しなければ画像内表記を使ってください。",
                JSON.stringify(MATERIAL_HINTS),
                "読めない値は空文字またはnullにし、推測が強い場合はneedsReview=trueにしてください。",
                "問題文や解答本文は保存せず、detectedTextSummaryは識別に必要な短い見出しだけにしてください。"
                ,"最初にdocumentTypeを結果画面・答案・問題用紙・不明へ分類してください。"
                ,"答案の採点は、同じ設問の問題文・生徒の解答・検証可能な正解の3点がすべて明瞭に読める場合だけ行ってください。1点でも欠ける場合はresult=unknownとし、決して推測で正誤を決めないでください。"
                ,"answerMarksのx,yは実際の解答記入欄の中心だけを画像左上基準の百分率で返してください。見出し、余白、印刷例、得点欄、問題ではない場所には置かないでください。"
                ,"各markConfidenceと、正誤判断の短い根拠evidenceBasisを返してください。3点が完全に読めない場合markConfidenceは0.98未満にしてください。"
                ,"できた点、弱点、次の学習は短く返してください。結果画面に表示済みの正答率は抽出できますが、答案から正答率を推測計算しないでください。"
              ].join("\n")
            },
            isPdf
              ? { type: "file", file: { filename: object.metadata?.original_file_name || path.fileName, file_data: dataUrl } }
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
        stream: false
      });

      const output = response.choices?.[0]?.message?.content;
      if (!output) throw new Error("OpenRouter returned an empty analysis response.");
      const analysis = JSON.parse(output);
      const latestSnapshot = await recordRef.get();
      if (latestSnapshot.data()?.aiAnalysisStatus === "cancelled") return;
      const classificationConfident = analysis.confidence >= 0.9 && !analysis.needsReview;
      const resultScreenConfident = analysis.documentType === "result_screen" && classificationConfident;
      const proposedMarks = Array.isArray(analysis.answerMarks)
        ? analysis.answerMarks.filter((mark) => mark.result !== "unknown" && Number(mark.markConfidence) >= 0.98)
        : [];
      await recordRef.set({
        subject: analysis.subject || "未分類",
        course: analysis.course || "教材不明",
        lesson: analysis.lesson || "",
        part: analysis.part || analysis.unit || "",
        testType: analysis.testType || "確認テスト",
        answeredCount: resultScreenConfident ? (analysis.answeredCount ?? "") : "",
        score: resultScreenConfident ? (analysis.correctRate ?? "") : "",
        aiAnalysis: analysis,
        strengthAnalysis: analysis.strengthAnalysis || "",
        weaknessAnalysis: analysis.weaknessAnalysis || "",
        nextLearningAction: analysis.nextLearningAction || "",
        proposedGradingMarks: proposedMarks,
        gradingMarks: [],
        gradingReviewStatus: proposedMarks.length ? "teacher_confirmation_required" : "not_available",
        aiAnalysisStatus: resultScreenConfident ? "completed" : "needs_review",
        aiAnalysisModel: visionModel.value(),
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
