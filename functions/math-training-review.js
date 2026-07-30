const QUESTIONS = [
  { id: "q1", topic: "多項式の展開", fields: ["answer"], modelAnswer: "8x³−36x²y＋54xy²−27y³" },
  { id: "q2", topic: "多項式の割り算", fields: ["quotient", "remainder"], modelAnswer: "商 2x²−x−1、余り −4x＋8" },
  { id: "q3", topic: "分数方程式", fields: ["answer"], modelAnswer: "x＝−3，3" },
  { id: "q4", topic: "連立3元1次方程式", fields: ["x", "y", "z"], modelAnswer: "x＝7/5、y＝4/5、z＝2" },
  { id: "q5", topic: "平方完成", fields: ["answer"], modelAnswer: "2(x−2)²−3" },
  { id: "q6", topic: "対数方程式", fields: ["answer"], modelAnswer: "x＝5" },
  { id: "q7", topic: "三角関数", fields: ["answer"], modelAnswer: "√3/2" },
  { id: "q8", topic: "複素数", fields: ["answer"], modelAnswer: "−i" },
  { id: "q9", topic: "微分法", fields: ["answer"], modelAnswer: "eˣ(x＋1)²" },
  { id: "q10", topic: "ベクトルの内積", fields: ["answer"], modelAnswer: "−8" }
];

function normalize(value) {
  return String(value || "")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/ˣ/g, "^x")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[＝=]/g, "")
    .replace(/[−–—ー]/g, "-")
    .replace(/[，、;]/g, ",")
    .replace(/[×·*]/g, "")
    .replace(/\s+/g, "");
}

function numericValue(value) {
  const text = normalize(value).replace(/^[xyz]=?/, "");
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  return Number.NaN;
}

const near = (left, right, tolerance = 0.000001) =>
  Number.isFinite(left) && Math.abs(left - right) <= tolerance;

function isNumberSet(value, expected) {
  const values = normalize(value).replace(/x/g, "").replace(/±3/g, "-3,3")
    .split(",").filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return values.length === expected.length && values.every((item, index) => near(item, expected[index]));
}

function expression(value, accepted) {
  const actual = normalize(value);
  return accepted.some((candidate) => actual === normalize(candidate));
}

export function gradeMathSubmission(answers = {}) {
  const a = (id, field = "answer") => answers?.[id]?.[field] || "";
  const checks = [
    expression(a("q1"), ["8x^3-36x^2y+54xy^2-27y^3"]),
    expression(a("q2", "quotient"), ["2x^2-x-1"]) && expression(a("q2", "remainder"), ["-4x+8", "8-4x"]),
    isNumberSet(a("q3"), [-3, 3]),
    near(numericValue(a("q4", "x")), 7 / 5) && near(numericValue(a("q4", "y")), 4 / 5) && near(numericValue(a("q4", "z")), 2),
    expression(a("q5"), ["2(x-2)^2-3"]),
    near(numericValue(a("q6")), 5),
    ["√3/2", "sqrt(3)/2", "sqrt3/2"].includes(normalize(a("q7"))) || near(numericValue(a("q7")), Math.sqrt(3) / 2, 0.001),
    expression(a("q8"), ["-i", "0-i"]),
    expression(a("q9"), ["e^x(x+1)^2", "(x+1)^2e^x", "(x^2+2x+1)e^x", "e^x(x^2+2x+1)"]),
    near(numericValue(a("q10")), -8)
  ];
  return QUESTIONS.map((question, index) => ({ id: question.id, correct: checks[index] }));
}

export function buildMathParentReview(submission = {}) {
  const answers = submission.answers || {};
  const results = gradeMathSubmission(answers);
  const byId = new Map(results.map((result) => [result.id, result]));
  return {
    submitted: true,
    submittedAt: String(submission.submitted_at || submission.submittedAt || ""),
    finishReason: String(submission.finish_reason || submission.finishReason || ""),
    total: QUESTIONS.length,
    correctCount: results.filter((result) => result.correct).length,
    items: QUESTIONS.map((question) => ({
      id: question.id,
      topic: question.topic,
      studentAnswer: question.fields.map((field) => answers?.[question.id]?.[field] || "未回答").join("、"),
      modelAnswer: question.modelAnswer,
      correct: Boolean(byId.get(question.id)?.correct)
    }))
  };
}

export function validTrainingDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
