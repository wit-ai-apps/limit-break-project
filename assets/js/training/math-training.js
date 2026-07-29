const STORAGE_KEY = "limitBreakMathTrainingHighSchoolDay1V1";

const QUESTIONS = [
  {
    id: "q1",
    topic: "多項式の展開",
    prompt: `次の式を展開しなさい。<br>(2<span class="mi">x</span>−3<span class="mi">y</span>)<sup>3</sup>`,
    fields: [{ id: "answer", label: "答え" }],
    model: "8x³−36x²y＋54xy²−27y³",
    check: ({ answer }) => sameExpression(answer, [
      "8x^3-36x^2y+54xy^2-27y^3"
    ])
  },
  {
    id: "q2",
    topic: "多項式の割り算",
    prompt: `2<span class="mi">x</span><sup>4</sup>−3<span class="mi">x</span><sup>3</sup>＋4<span class="mi">x</span><sup>2</sup>−5<span class="mi">x</span>＋6 を
      <span class="mi">x</span><sup>2</sup>−<span class="mi">x</span>＋2 で割った商と余りを求めなさい。`,
    fields: [
      { id: "quotient", label: "商" },
      { id: "remainder", label: "余り" }
    ],
    model: "商 2x²−x−1、余り −4x＋8",
    check: ({ quotient, remainder }) =>
      sameExpression(quotient, ["2x^2-x-1"]) &&
      sameExpression(remainder, ["-4x+8", "8-4x"])
  },
  {
    id: "q3",
    topic: "分数方程式",
    prompt: `次の方程式を解きなさい（<span class="mi">x</span>≠±1）。<br>
      <span class="math-equation-row">
        <span class="math-frac"><span><span class="mi">x</span>＋1</span><span><span class="mi">x</span>−1</span></span>
        <span class="math-operator">＋</span>
        <span class="math-frac"><span><span class="mi">x</span>−1</span><span><span class="mi">x</span>＋1</span></span>
        <span class="math-operator">＝</span>
        <span class="math-frac"><span>5</span><span>2</span></span>
      </span>`,
    fields: [{ id: "answer", label: "x の値（複数はコンマ区切り）" }],
    model: "x＝−3，3",
    check: ({ answer }) => isNumberSet(answer, [-3, 3])
  },
  {
    id: "q4",
    topic: "連立3元1次方程式",
    prompt: `次の連立方程式を解きなさい。<br>
      <span class="math-system">
        <svg class="math-system-brace" viewBox="0 0 24 100" aria-hidden="true" focusable="false">
          <path d="M22 2 C10 2 13 18 13 29 C13 42 8 48 2 50 C8 52 13 58 13 71 C13 82 10 98 22 98"></path>
        </svg>
        <span>2<span class="mi">x</span>−<span class="mi">y</span>＋<span class="mi">z</span>＝4</span>
        <span><span class="mi">x</span>＋2<span class="mi">y</span>−<span class="mi">z</span>＝1</span>
        <span>3<span class="mi">x</span>＋<span class="mi">y</span>＋2<span class="mi">z</span>＝9</span>
      </span>`,
    fields: [
      { id: "x", label: "x" },
      { id: "y", label: "y" },
      { id: "z", label: "z" }
    ],
    model: "x＝7/5、y＝4/5、z＝2",
    check: ({ x, y, z }) =>
      near(numericValue(x), 7 / 5) &&
      near(numericValue(y), 4 / 5) &&
      near(numericValue(z), 2)
  },
  {
    id: "q5",
    topic: "平方完成",
    prompt: `2<span class="mi">x</span><sup>2</sup>−8<span class="mi">x</span>＋5 を平方完成しなさい。`,
    fields: [{ id: "answer", label: "答え" }],
    model: "2(x−2)²−3",
    check: ({ answer }) => sameExpression(answer, ["2(x-2)^2-3"])
  },
  {
    id: "q6",
    topic: "対数方程式",
    prompt: `次の方程式を解きなさい。<br>
      <span class="upright">log</span><sub>2</sub>(<span class="mi">x</span>−1)
      ＋<span class="upright">log</span><sub>2</sub>(<span class="mi">x</span>−3)＝3`,
    fields: [{ id: "answer", label: "x" }],
    model: "x＝5",
    check: ({ answer }) => near(numericValue(answer), 5)
  },
  {
    id: "q7",
    topic: "三角関数",
    prompt: `次の値を求めなさい。<br>
      <span class="upright">sin</span>75° <span class="upright">cos</span>15°
      −<span class="upright">cos</span>75° <span class="upright">sin</span>15°`,
    fields: [{ id: "answer", label: "答え" }],
    model: "√3/2",
    check: ({ answer }) => {
      const value = normalize(answer);
      return ["√3/2", "sqrt(3)/2", "sqrt3/2"].includes(value) ||
        near(numericValue(answer), Math.sqrt(3) / 2, 0.001);
    }
  },
  {
    id: "q8",
    topic: "複素数",
    prompt: `次の式を <span class="mi">a</span>＋<span class="mi">b</span><span class="mi">i</span> の形にしなさい。<br>
      <span class="math-frac"><span>2−<span class="mi">i</span></span><span>1＋2<span class="mi">i</span></span></span>`,
    fields: [{ id: "answer", label: "答え" }],
    model: "−i",
    check: ({ answer }) => sameExpression(answer, ["-i", "0-i"])
  },
  {
    id: "q9",
    topic: "微分法",
    prompt: `<span class="mi">y</span>＝(<span class="mi">x</span><sup>2</sup>＋1)<span class="mi">e</span><sup><span class="mi">x</span></sup>
      を <span class="mi">x</span> で微分しなさい。`,
    fields: [{ id: "answer", label: "dy/dx" }],
    model: "eˣ(x＋1)²",
    check: ({ answer }) => sameExpression(answer, [
      "e^x(x+1)^2",
      "(x+1)^2e^x",
      "(x^2+2x+1)e^x",
      "e^x(x^2+2x+1)"
    ])
  },
  {
    id: "q10",
    topic: "ベクトルの内積",
    prompt: `ベクトル <span class="mi">a</span>＝(2, −1, 3)、
      <span class="mi">b</span>＝(1, 4, −2) の内積
      <span class="mi">a</span>・<span class="mi">b</span> を求めなさい。`,
    fields: [{ id: "answer", label: "答え" }],
    model: "−8",
    check: ({ answer }) => near(numericValue(answer), -8)
  }
];

let initialized = false;

export function initMathTraining() {
  if (initialized) return;
  const form = document.querySelector("#mathTrainingForm");
  const list = document.querySelector("#mathTrainingList");
  if (!form || !list) return;
  initialized = true;

  const stored = loadState();
  renderQuestions(list, stored.answers || {});
  updateProgress();
  if (stored.submittedAt && Array.isArray(stored.results)) {
    showResults(stored.results, stored.submittedAt, stored.attempts || 1);
  }

  form.addEventListener("input", () => {
    const current = loadState();
    saveState({
      ...current,
      answers: collectAnswers(form),
      updatedAt: new Date().toISOString()
    });
    updateProgress();
    setStatus("回答をこの端末へ保存しました。");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = collectAnswers(form);
    const results = gradeMathTrainingAnswers(answers);
    const previous = loadState();
    const submittedAt = new Date().toISOString();
    const attempts = Number(previous.attempts || 0) + 1;
    saveState({ answers, results, submittedAt, updatedAt: submittedAt, attempts });
    showResults(results, submittedAt, attempts);
    setStatus("採点結果と提出履歴をこの端末へ保存しました。");
    document.querySelector("#mathTrainingResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.querySelector("#mathTrainingReset")?.addEventListener("click", () => {
    if (!window.confirm("この10題の回答と採点結果を消しますか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    clearQuestionResults();
    const resultPanel = document.querySelector("#mathTrainingResult");
    if (resultPanel) {
      resultPanel.hidden = true;
      resultPanel.innerHTML = "";
    }
    updateProgress();
    setStatus("回答を消しました。");
  });
}

export function gradeMathTrainingAnswers(answers = {}) {
  return QUESTIONS.map((question) => ({
    id: question.id,
    correct: question.check(answers[question.id] || {})
  }));
}

function renderQuestions(list, answers) {
  list.innerHTML = QUESTIONS.map((question, index) => {
    const fields = question.fields.map((field) => `
      <label>
        ${field.label}
        <input
          type="text"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          name="${question.id}.${field.id}"
          value="${escapeAttribute(answers?.[question.id]?.[field.id] || "")}"
          aria-label="問題${index + 1} ${field.label}"
        >
      </label>
    `).join("");
    return `
      <article class="math-question" id="math-${question.id}">
        <div class="math-question-heading">
          <span class="math-question-number">${index + 1}</span>
          <span class="math-question-topic">${question.topic}</span>
        </div>
        <div class="math-expression">${question.prompt}</div>
        <div class="math-answer-grid">${fields}</div>
        <p class="math-answer-feedback" data-feedback="${question.id}" hidden></p>
      </article>
    `;
  }).join("");
}

function collectAnswers(form) {
  const answers = {};
  QUESTIONS.forEach((question) => {
    answers[question.id] = {};
    question.fields.forEach((field) => {
      const input = form.elements.namedItem(`${question.id}.${field.id}`);
      answers[question.id][field.id] = input?.value || "";
    });
  });
  return answers;
}

function updateProgress() {
  const form = document.querySelector("#mathTrainingForm");
  if (!form) return;
  const answers = collectAnswers(form);
  const completed = QUESTIONS.filter((question) =>
    question.fields.every((field) => String(answers[question.id]?.[field.id] || "").trim())
  ).length;
  const badge = document.querySelector("#mathTrainingProgressBadge");
  if (badge) badge.textContent = `${completed} / ${QUESTIONS.length}`;
}

function showResults(results, submittedAt, attempts) {
  clearQuestionResults();
  results.forEach((result) => {
    const card = document.querySelector(`#math-${result.id}`);
    const feedback = document.querySelector(`[data-feedback="${result.id}"]`);
    const question = QUESTIONS.find((item) => item.id === result.id);
    card?.classList.add(result.correct ? "correct" : "incorrect");
    if (feedback && question) {
      feedback.hidden = false;
      feedback.textContent = result.correct
        ? `〇 正解　模範解答：${question.model}`
        : `要復習　模範解答：${question.model}`;
    }
  });

  const correctCount = results.filter((result) => result.correct).length;
  const panel = document.querySelector("#mathTrainingResult");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = `
    <h3>採点結果 ${correctCount} / ${QUESTIONS.length}</h3>
    <p>${formatDateTime(submittedAt)} に第${attempts}回の回答を提出しました。</p>
    <ol class="math-result-list">
      ${results.map((result, index) => `
        <li>問題${index + 1}：${result.correct ? "〇 正解" : `要復習（${QUESTIONS[index].model}）`}</li>
      `).join("")}
    </ol>
  `;
}

function clearQuestionResults() {
  document.querySelectorAll(".math-question").forEach((card) => {
    card.classList.remove("correct", "incorrect");
  });
  document.querySelectorAll("[data-feedback]").forEach((feedback) => {
    feedback.hidden = true;
    feedback.textContent = "";
  });
}

function sameExpression(value, accepted) {
  const normalized = normalizeExpression(value);
  return accepted.some((candidate) => normalized === normalizeExpression(candidate));
}

function normalizeExpression(value) {
  return normalize(value)
    .replaceAll("×", "")
    .replaceAll("·", "")
    .replaceAll("*", "")
    .replaceAll("＋", "+")
    .replaceAll("(", "(")
    .replaceAll(")", ")");
}

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
    .replace(/\s+/g, "");
}

function numericValue(value) {
  const text = normalize(value).replace(/^[xyz]=?/, "");
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  return Number.NaN;
}

function isNumberSet(value, expected) {
  const parts = normalize(value)
    .replace(/x/g, "")
    .replace(/±3/g, "-3,3")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const target = [...expected].sort((a, b) => a - b);
  return parts.length === target.length && parts.every((item, index) => near(item, target[index]));
}

function near(actual, expected, tolerance = 0.000001) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(message) {
  const status = document.querySelector("#mathTrainingSaveStatus");
  if (status) status.textContent = message;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tokyo"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
