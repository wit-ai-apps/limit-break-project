import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import OpenAI from "openai";

initializeApp();

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
const visionModel = defineString("OPENROUTER_VISION_MODEL", { default: "openai/gpt-4o-mini" });

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
    detectedTextSummary: { type: "string" }
  },
  required: [
    "subject", "course", "lesson", "part", "unit", "testType",
    "answeredCount", "correctRate", "confidence", "needsReview",
    "reviewReason", "detectedTextSummary"
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
