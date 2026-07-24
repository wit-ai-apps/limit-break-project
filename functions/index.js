import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import OpenAI from "openai";
import { buildAdaptivePlan, dateKeyJst, DEFAULT_DEADLINE } from "./adaptive-scheduler.js";

initializeApp();

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
const visionModel = defineString("OPENROUTER_VISION_MODEL", { default: "openai/gpt-4o-mini" });
const adaptiveDeadline = defineString("ADAPTIVE_PLAN_DEADLINE", { default: DEFAULT_DEADLINE });

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
          correctAnswer: { type: "string" }
        },
        required: ["label", "result", "x", "y", "detectedAnswer", "correctAnswer"]
      }
    }
  },
  required: [
    "subject", "course", "lesson", "part", "unit", "testType",
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
    if (!path || !String(object.contentType || "").startsWith("image/")) return;

    const missionId = object.metadata?.mission_id;
    if (!missionId) return;

    const db = getFirestore();
    const recordId = safeRecordId(path.date, missionId);
    const recordRef = db.doc(`students/${path.studentId}/evidence_records/${recordId}`);
    await recordRef.set({
      aiAnalysisStatus: "processing",
      aiAnalysisUpdatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    try {
      const [buffer] = await getStorage().bucket(object.bucket).file(object.name).download();
      const dataUrl = `data:${object.contentType};base64,${buffer.toString("base64")}`;
      const openrouter = new OpenAI({
        apiKey: openRouterApiKey.value(),
        baseURL: "https://openrouter.ai/api/v1",
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
                ,"答案の場合は各記入答案を数学的に照合し、できた点、弱点、次の学習を短く返してください。"
                ,"answerMarksには各答案の中心位置を画像左上基準の百分率x,yで返し、正解はcorrect、不正解はincorrect、判定不能はunknownにしてください。"
              ].join("\n")
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
          ]
        }],
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
      const confident = analysis.confidence >= 0.75 && !analysis.needsReview;
      await recordRef.set({
        subject: analysis.subject || "未分類",
        course: analysis.course || "教材不明",
        lesson: analysis.lesson || "",
        part: analysis.part || analysis.unit || "",
        testType: analysis.testType || "確認テスト",
        answeredCount: analysis.answeredCount ?? "",
        score: analysis.correctRate ?? "",
        aiAnalysis: analysis,
        strengthAnalysis: analysis.strengthAnalysis || "",
        weaknessAnalysis: analysis.weaknessAnalysis || "",
        nextLearningAction: analysis.nextLearningAction || "",
        gradingMarks: Array.isArray(analysis.answerMarks) ? analysis.answerMarks : [],
        aiAnalysisStatus: confident ? "completed" : "needs_review",
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
