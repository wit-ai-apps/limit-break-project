const STORAGE_KEY_BASE = "limitBreakMathTrainingHighSchoolDay1V2";
const TIME_LIMIT_MS = 30 * 60 * 1000;
const DAILY_RESET_OFFSET_MS = (8 * 60 + 55) * 60 * 1000;

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
let timerId = null;
let activeForm = null;
let activeInput = null;
let submissionHandler = null;
let parentReviewLoader = null;
let parentReviewLoadedFor = "";
let pendingSubmission = null;
let submissionSyncing = false;

export function initMathTraining(options = {}) {
  if (initialized) return;
  const form = document.querySelector("#mathTrainingForm");
  const list = document.querySelector("#mathTrainingList");
  if (!form || !list) return;
  initialized = true;
  activeForm = form;
  submissionHandler = typeof options.onSubmit === "function" ? options.onSubmit : null;
  parentReviewLoader = typeof options.loadParentReview === "function" ? options.loadParentReview : null;

  const stored = loadState();
  renderQuestions(list, stored.answers || {});
  initMathKeypad(form);
  initParentReview();
  updateProgress();
  if (stored.submittedAt && Array.isArray(stored.results)) {
    showResults(stored.results, stored.submittedAt, stored.attempts || 1);
    lockTraining(stored.finishReason || "submitted");
    pendingSubmission = {
      dateKey: trainingDateKey(),
      answers: stored.answers || {},
      finishReason: stored.finishReason || "submitted",
      startedAt: stored.startedAt || "",
      submittedAt: stored.submittedAt
    };
  }

  form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement) {
      updateAnswerPreview(event.target);
      if (event.target === activeInput) updateMathPreview(event.target.value);
    }
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
    if (isTrainingFinished(loadState())) return;
    const answers = collectAnswers(form);
    finishTraining(answers, "submitted");
  });

  document.querySelector("#mathTrainingReset")?.addEventListener("click", () => {
    if (isTrainingFinished(loadState())) return;
    if (!window.confirm("入力内容だけを消しますか？ 残り時間は戻りません。")) return;
    form.reset();
    form.querySelectorAll("input").forEach(updateAnswerPreview);
    const current = loadState();
    saveState({
      ...current,
      answers: {},
      updatedAt: new Date().toISOString()
    });
    clearQuestionResults();
    const resultPanel = document.querySelector("#mathTrainingResult");
    if (resultPanel) {
      resultPanel.hidden = true;
      resultPanel.innerHTML = "";
    }
    updateProgress();
    setStatus("入力内容を消しました。残り時間はそのまま進みます。");
  });

  const observer = new MutationObserver(() => {
    startTimerWhenEligible();
    updateRoleSpecificDisplay();
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-auth", "data-role", "data-view", "data-training-subject"]
  });
  startTimerWhenEligible();
  updateRoleSpecificDisplay();
}

export function gradeMathTrainingAnswers(answers = {}) {
  return QUESTIONS.map((question) => ({
    id: question.id,
    correct: question.check(answers[question.id] || {})
  }));
}

function renderQuestions(list, answers) {
  list.innerHTML = QUESTIONS.map((question, index) => {
    const fields = question.fields.map((field) => {
      const name = `${question.id}.${field.id}`;
      const value = answers?.[question.id]?.[field.id] || "";
      return `
      <label>
        ${field.label}
        <input
          type="text"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          name="${name}"
          value="${escapeAttribute(value)}"
          aria-label="問題${index + 1} ${field.label}"
        >
        <span class="math-answer-preview-label">教科書表記</span>
        <span class="math-answer-live-preview" data-math-preview-for="${name}">${mathPreviewMarkup(value) || "入力するとここに数式表示されます"}</span>
      </label>
    `;
    }).join("");
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

function initMathKeypad(form) {
  const keypad = document.querySelector("#mathKeypad");
  if (!keypad) return;
  form.addEventListener("focusin", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.disabled) return;
    activeInput = event.target;
    keypad.hidden = false;
    document.querySelector("#mathKeypadTarget").textContent = event.target.getAttribute("aria-label") || "回答入力";
    updateMathPreview(activeInput.value);
  });
  keypad.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.id === "mathKeypadClose") return;
    if (!activeInput || activeInput.disabled) return;
    const action = button.dataset.mathAction;
    if (action === "clear") {
      setInputValue(activeInput, "");
    } else if (action === "backspace") {
      replaceInputSelection(activeInput, "", true);
    } else if (action === "fraction") {
      insertFraction(activeInput);
    } else if (button.dataset.mathKey) {
      replaceInputSelection(activeInput, button.dataset.mathKey);
    }
    activeInput.focus({ preventScroll: true });
  });
  document.querySelector("#mathKeypadClose")?.addEventListener("click", () => {
    keypad.hidden = true;
  });
}

function replaceInputSelection(input, text, backspace = false) {
  const start = Number.isFinite(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : start;
  let from = start;
  if (backspace && start === end && start > 0) from = start - 1;
  const next = `${input.value.slice(0, from)}${text}${input.value.slice(end)}`;
  setInputValue(input, next, from + text.length);
}

function insertFraction(input) {
  const start = Number.isFinite(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : start;
  const selected = input.value.slice(start, end);
  const token = selected ? `(${selected})/()` : `()/()`;
  setInputValue(
    input,
    `${input.value.slice(0, start)}${token}${input.value.slice(end)}`,
    start + (selected ? token.length - 1 : 1)
  );
}

function setInputValue(input, value, cursor = value.length) {
  input.value = value;
  input.setSelectionRange(cursor, cursor);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  updateMathPreview(value);
}

function updateMathPreview(value) {
  const preview = document.querySelector("#mathKeypadPreview");
  if (preview) preview.innerHTML = mathPreviewMarkup(value) || "入力確認";
}

export function mathPreviewMarkup(value) {
  let markup = escapeHtml(String(value || ""));
  const held = [];
  const hold = (html) => {
    const token = `\uE000${held.length}\uE001`;
    held.push(html);
    return token;
  };
  markup = markup
    .replace(/\^([0-9a-zA-Z]+)/g, (_, exponent) =>
      hold(`<sup>${wrapMathVariables(exponent)}</sup>`))
    .replace(/([−-]?(?:\([^()]*\)|[A-Za-z0-9√π]+))\/((?:\([^()]*\)|[A-Za-z0-9√π]+))/g,
      (_, numerator, denominator) => hold(
        `<span class="math-input-frac"><span>${wrapMathVariables(numerator)}</span><span>${wrapMathVariables(denominator)}</span></span>`
      ));
  markup = markup.replace(/&(amp|lt|gt|quot|#039);/g, (entity) => hold(entity));
  markup = wrapMathVariables(markup);
  markup = markup.replace(/\uE000(\d+)\uE001/g, (_, index) => held[Number(index)] || "");
  return markup;
}

function wrapMathVariables(value) {
  return String(value || "").replace(/([A-Za-z])/g, '<span class="math-variable">$1</span>');
}

function updateAnswerPreview(input) {
  const name = input?.name || "";
  document.querySelectorAll("[data-math-preview-for]").forEach((preview) => {
    if (preview.dataset.mathPreviewFor !== name) return;
    preview.innerHTML = mathPreviewMarkup(input.value) || "入力するとここに数式表示されます";
  });
}

function initParentReview() {
  document.querySelector("#mathParentReviewReload")?.addEventListener("click", () => {
    parentReviewLoadedFor = "";
    updateRoleSpecificDisplay();
  });
}

function updateRoleSpecificDisplay() {
  const role = document.body.dataset.role || "";
  const panel = document.querySelector("#mathParentReview");
  if (panel) panel.hidden = role !== "parent";
  if (role === "parent" && document.body.dataset.view === "training") loadParentReview();
  if (role === "student" && document.body.dataset.auth === "in") syncPendingSubmission();
}

async function loadParentReview() {
  if (!parentReviewLoader) return;
  const dateKey = trainingDateKey();
  if (parentReviewLoadedFor === dateKey) return;
  parentReviewLoadedFor = dateKey;
  const status = document.querySelector("#mathParentReviewStatus");
  if (status) status.textContent = "提出回答を読み込んでいます...";
  try {
    const review = await parentReviewLoader({ dateKey });
    renderParentReview(review);
  } catch (error) {
    parentReviewLoadedFor = "";
    if (status) status.textContent = `回答を読み込めませんでした。${error?.message || error}`;
  }
}

function renderParentReview(review) {
  const status = document.querySelector("#mathParentReviewStatus");
  const list = document.querySelector("#mathParentReviewList");
  if (!list) return;
  if (!review?.submitted) {
    if (status) status.textContent = "この学習日の提出回答はまだありません。";
    list.innerHTML = "";
    return;
  }
  if (status) {
    status.textContent = `${formatDateTime(review.submittedAt)} 提出・${review.correctCount ?? 0}/${review.total ?? QUESTIONS.length}問正解`;
  }
  list.innerHTML = `
    <table class="math-parent-review-table">
      <thead><tr><th>問題</th><th>生徒の回答</th><th>模範解答</th><th>判定</th></tr></thead>
      <tbody>
        ${(review.items || []).map((item, index) => `
          <tr>
            <td>問題${index + 1}<br>${escapeHtml(item.topic || "")}</td>
            <td class="math-parent-review-answer">${mathPreviewMarkup(item.studentAnswer || "未回答")}</td>
            <td class="math-parent-review-answer">${mathPreviewMarkup(item.modelAnswer || "")}</td>
            <td>${item.correct ? "〇 正解" : "要復習"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
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

function startTimerWhenEligible() {
  const eligible =
    document.body.dataset.auth === "in" &&
    document.body.dataset.role === "student" &&
    document.body.dataset.view === "training" &&
    (!document.body.dataset.trainingSubject || document.body.dataset.trainingSubject === "math");
  if (!eligible) {
    stopTimer();
    return;
  }

  let state = loadState();
  if (!state.startedAt) {
    const startedAt = new Date().toISOString();
    state = {
      ...state,
      startedAt,
      answers: state.answers || {},
      updatedAt: startedAt
    };
    saveState(state);
    setStatus("30分計測を開始しました。更新しても残り時間は戻りません。");
  }

  updateTimer();
  if (!isTrainingFinished(loadState()) && timerId === null) {
    timerId = window.setInterval(updateTimer, 1000);
  }
}

function updateTimer() {
  const state = loadState();
  if (!state.startedAt) return;
  const remaining = remainingTimeMs(state.startedAt);
  const badge = document.querySelector("#mathTrainingTimerBadge");
  if (badge) {
    badge.textContent = formatRemainingTime(remaining);
    badge.classList.toggle("urgent", remaining > 0 && remaining <= 5 * 60 * 1000);
    badge.classList.toggle("finished", remaining <= 0 || isTrainingFinished(state));
  }

  if (isTrainingFinished(state)) {
    lockTraining(state.finishReason || "submitted");
    stopTimer();
    return;
  }

  if (remaining <= 0) {
    finishTraining(collectAnswers(activeForm), "time_limit");
  }
}

function finishTraining(answers, finishReason) {
  const previous = loadState();
  if (isTrainingFinished(previous)) return;
  const results = gradeMathTrainingAnswers(answers);
  const submittedAt = new Date().toISOString();
  const attempts = 1;
  const submission = {
    ...previous,
    answers,
    results,
    submittedAt,
    finishedAt: submittedAt,
    finishReason,
    updatedAt: submittedAt,
    attempts
  };
  saveState(submission);
  if (submissionHandler) {
    pendingSubmission = {
      dateKey: trainingDateKey(),
      answers,
      finishReason,
      startedAt: submission.startedAt || "",
      submittedAt
    };
    syncPendingSubmission();
  }
  showResults(results, submittedAt, attempts);
  lockTraining(finishReason);
  stopTimer();
  setStatus(
    finishReason === "time_limit"
      ? "30分が終了したため自動提出しました。回答の変更はできません。"
      : "提出しました。本日の回答は確定され、変更できません。"
  );
  document.querySelector("#mathTrainingResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function syncPendingSubmission() {
  if (!submissionHandler || !pendingSubmission || submissionSyncing) return;
  submissionSyncing = true;
  Promise.resolve(submissionHandler(pendingSubmission)).then(() => {
    pendingSubmission = null;
    setStatus("提出しました。回答は保護者モードにも保存されました。");
  }).catch((error) => {
    console.warn("Math training submission sync failed:", error);
    setStatus("端末には提出済みです。保護者モードへの同期は次回接続時に再確認してください。");
  }).finally(() => {
    submissionSyncing = false;
  });
}

function lockTraining(reason) {
  const form = activeForm || document.querySelector("#mathTrainingForm");
  if (!form) return;
  form.querySelectorAll("input").forEach((input) => {
    input.disabled = true;
  });
  const submit = document.querySelector("#mathTrainingSubmit");
  const reset = document.querySelector("#mathTrainingReset");
  if (submit) {
    submit.disabled = true;
    submit.textContent = reason === "time_limit" ? "時間終了・自動提出済み" : "提出済み";
  }
  if (reset) reset.disabled = true;
  document.querySelector(".math-training")?.classList.add("time-finished");
  const badge = document.querySelector("#mathTrainingTimerBadge");
  if (badge && reason !== "submitted") badge.textContent = "00:00";
  badge?.classList.add("finished");
}

function stopTimer() {
  if (timerId === null) return;
  window.clearInterval(timerId);
  timerId = null;
}

function isTrainingFinished(state) {
  return Boolean(state?.finishedAt || state?.submittedAt);
}

export function remainingTimeMs(startedAt, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, TIME_LIMIT_MS - (now - start));
}

export function dailyStorageKey(date = new Date()) {
  // 「学習日」は日本時間の午前8:55に切り替える。
  // 8:55を日界として扱うため、時刻を8時間55分戻してからJSTの日付を求める。
  const trainingDate = new Date(date.getTime() - DAILY_RESET_OFFSET_MS);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(trainingDate);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${STORAGE_KEY_BASE}:${value.year}-${value.month}-${value.day}`;
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showResults(results, submittedAt, attempts) {
  const parentMode = document.body.dataset.role === "parent";
  clearQuestionResults();
  results.forEach((result) => {
    const card = document.querySelector(`#math-${result.id}`);
    const feedback = document.querySelector(`[data-feedback="${result.id}"]`);
    const question = QUESTIONS.find((item) => item.id === result.id);
    card?.classList.add(result.correct ? "correct" : "incorrect");
    if (feedback && question) {
      feedback.hidden = false;
      feedback.textContent = result.correct
        ? `〇 正解${parentMode ? `　模範解答：${question.model}` : ""}`
        : `要復習${parentMode ? `　模範解答：${question.model}` : ""}`;
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
        <li>問題${index + 1}：${result.correct ? "〇 正解" : "要復習"}${parentMode ? `（模範解答：${QUESTIONS[index].model}）` : ""}</li>
      `).join("")}
    </ol>
  `;
}

function trainingDateKey() {
  return dailyStorageKey().split(":").at(-1);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const parsed = JSON.parse(localStorage.getItem(dailyStorageKey()) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(dailyStorageKey(), JSON.stringify(state));
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
