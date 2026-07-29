const STORAGE_KEY_BASE = "limitBreakEnglishTrainingDemoV1";
const TIME_LIMIT_MS = 30 * 60 * 1000;
const DAILY_RESET_OFFSET_MS = (8 * 60 + 55) * 60 * 1000;
import { recordEnglishTrainingResults } from "../learning/memory.js?v=4.19.7";

const sentence = (value) => String(value || "").toLowerCase()
  .replace(/[.,!?'"’]/g, "").replace(/\s+/g, " ").trim();

export const ENGLISH_QUESTIONS = [
  ["e1", "構造理解", "次の文の文型を答えなさい。", "The leaves turned red in autumn.", "SVC",
    "SVC（The leaves＝S、turned＝V、red＝C）", "基本文型",
    (v) => sentence(v).replace(/\s/g, "") === "svc"],
  ["e2", "時制・穴埋め", "goを適切な形にしなさい。", "She (　　　) to the library yesterday.", "went",
    "went", "過去時制", (v) => sentence(v) === "went"],
  ["e3", "語順", "語句を並べ替えて英文を完成させなさい。", "a useful example / us / showed / the teacher",
    "The teacher showed us a useful example.", "The teacher showed us a useful example.", "第4文型",
    (v) => sentence(v) === "the teacher showed us a useful example"],
  ["e4", "部分英作文", "「その問題を解くために」に当たる部分を書きなさい。",
    "He used a diagram（その問題を解くために）.", "to solve the problem", "to solve the problem", "不定詞①",
    (v) => sentence(v) === "to solve the problem"],
  ["e5", "助動詞", "次の日本文を英語にしなさい。", "あなたは約束を守るべきです。",
    "You should keep your promise.", "You should keep your promise.", "助動詞",
    (v) => sentence(v) === "you should keep your promise"],
  ["e6", "時制の再現", "次の日本文を英語にしなさい。",
    "私が駅に着いたとき、列車はすでに出発していました。",
    "When I arrived at the station, the train had already left.",
    "When I arrived at the station, the train had already left.", "過去完了",
    (v) => sentence(v) === "when i arrived at the station the train had already left"],
  ["e7", "関係詞", "次の日本文を英語にしなさい。",
    "これは私が文法を理解する助けになった本です。",
    "This is the book that helped me understand grammar.",
    "This is the book that helped me understand grammar.", "関係詞①",
    (v) => sentence(v) === "this is the book that helped me understand grammar"],
  ["e8", "比較表現", "次の日本文を英語にしなさい。", "健康ほど大切なものはありません。",
    "Nothing is more important than good health.",
    "Nothing is more important than good health.", "比較③",
    (v) => sentence(v) === "nothing is more important than good health"],
  ["e9", "仮定法", "次の日本文を英語にしなさい。",
    "もっと時間があれば、私はこの本を読むのに。",
    "If I had more time, I would read this book.",
    "If I had more time, I would read this book.", "仮定法①",
    (v) => sentence(v) === "if i had more time i would read this book"],
  ["e10", "構文説明", "Itとto以下の働きを日本語で説明しなさい。",
    "It is important to review every day.",
    "Itは形式主語、to review every dayが真主語。",
    "Itは形式主語で、to review every dayが内容を表す真主語です。", "itを用いる表現",
    (v) => String(v || "").includes("形式主語") &&
      (String(v).includes("真主語") || String(v).includes("to review"))]
].map(([id, phase, prompt, text, answer, model, video, check]) =>
  ({ id, phase, prompt, text, answer, model, video, check }));

let initialized = false;
let timerId = null;
let formElement = null;

export function initEnglishTraining() {
  if (initialized) return;
  const form = document.querySelector("#englishTrainingForm");
  const list = document.querySelector("#englishTrainingList");
  if (!form || !list) return;
  initialized = true;
  formElement = form;
  initSubjectTabs();

  const stored = loadState();
  renderQuestions(list, stored.answers || {});
  updateProgress();
  if (stored.submittedAt && stored.results) {
    showResults(stored.results, stored.submittedAt);
    lockTraining();
  }

  form.addEventListener("input", () => {
    if (isFinished(loadState())) return;
    saveState({ ...loadState(), answers: collectAnswers(), updatedAt: new Date().toISOString() });
    updateProgress();
    setStatus("回答をこの端末へ保存しました。");
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isFinished(loadState())) finishTraining("submitted");
  });
  document.querySelector("#englishTrainingReset")?.addEventListener("click", () => {
    if (isFinished(loadState()) ||
        !window.confirm("入力内容だけを消しますか？ 残り時間は戻りません。")) return;
    form.reset();
    saveState({ ...loadState(), answers: {} });
    updateProgress();
    setStatus("入力内容を消しました。残り時間はそのまま進みます。");
  });
  new MutationObserver(startTimerWhenEligible).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-auth", "data-role", "data-view", "data-training-subject"]
  });
  startTimerWhenEligible();
}

function initSubjectTabs() {
  if (!document.body.dataset.trainingSubject) document.body.dataset.trainingSubject = "math";
  document.querySelectorAll("[data-training-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      const subject = button.dataset.trainingSubject;
      document.body.dataset.trainingSubject = subject;
      document.querySelectorAll("[data-training-subject]").forEach((item) =>
        item.classList.toggle("active", item.dataset.trainingSubject === subject));
      document.querySelectorAll("[data-training-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.trainingPanel !== subject;
      });
    });
  });
}

export function gradeEnglishTrainingAnswers(answers = {}) {
  return ENGLISH_QUESTIONS.map((question) => ({
    id: question.id,
    correct: question.check(answers[question.id] || "")
  }));
}

export function englishDailyStorageKey(date = new Date()) {
  const shifted = new Date(date.getTime() - DAILY_RESET_OFFSET_MS);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(shifted);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${STORAGE_KEY_BASE}:${value.year}-${value.month}-${value.day}`;
}

export function englishRemainingTimeMs(startedAt, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  return Number.isFinite(start) ? Math.max(0, TIME_LIMIT_MS - (now - start)) : 0;
}

function renderQuestions(list, answers) {
  list.innerHTML = ENGLISH_QUESTIONS.map((q, index) => `
    <article class="math-question" id="english-${q.id}">
      <div class="math-question-heading">
        <span class="math-question-number">${index + 1}</span>
        <span class="math-question-topic">${escapeHtml(q.phase)}</span>
      </div>
      <div class="english-prompt">${escapeHtml(q.prompt)}
        <span class="english-sentence">${escapeHtml(q.text)}</span>
      </div>
      <a class="english-video-link" href="https://learn.studysapuri.jp/" target="_blank" rel="noopener">
        関連映像：ベーシック英語「${escapeHtml(q.video)}」
      </a>
      <div class="math-answer-grid"><label>回答
        <input type="text" name="${q.id}" value="${escapeAttribute(answers[q.id] || "")}"
          autocomplete="off" spellcheck="false">
      </label></div>
      <p class="math-answer-feedback" data-english-feedback="${q.id}" hidden></p>
    </article>`).join("");
}

function startTimerWhenEligible() {
  if (!isEligible()) return stopTimer();
  let state = loadState();
  if (isFinished(state)) return lockTraining();
  if (!state.startedAt) {
    state = { ...state, startedAt: new Date().toISOString(), answers: state.answers || {} };
    saveState(state);
    setStatus("30分計測を開始しました。");
  }
  updateTimer();
  if (timerId === null) timerId = window.setInterval(updateTimer, 1000);
}

function updateTimer() {
  const state = loadState();
  if (!state.startedAt || isFinished(state)) return stopTimer();
  const remaining = englishRemainingTimeMs(state.startedAt);
  const badge = document.querySelector("#englishTrainingTimerBadge");
  if (badge) {
    badge.textContent = formatTime(remaining);
    badge.classList.toggle("urgent", remaining <= 5 * 60 * 1000);
  }
  if (remaining <= 0) finishTraining("time_limit");
}

function finishTraining(reason) {
  const answers = collectAnswers();
  const results = gradeEnglishTrainingAnswers(answers);
  const submittedAt = new Date().toISOString();
  saveState({ ...loadState(), answers, results, submittedAt, finishReason: reason });
  recordEnglishTrainingResults(ENGLISH_QUESTIONS, results, answers, new Date(submittedAt));
  showResults(results, submittedAt);
  lockTraining();
  setStatus(reason === "time_limit" ? "30分終了のため自動提出しました。" :
    "提出しました。翌朝8:55まで変更できません。");
}

function showResults(results, submittedAt) {
  results.forEach((result) => {
    const card = document.querySelector(`#english-${result.id}`);
    const feedback = document.querySelector(`[data-english-feedback="${result.id}"]`);
    const q = ENGLISH_QUESTIONS.find((item) => item.id === result.id);
    card?.classList.add(result.correct ? "correct" : "incorrect");
    if (feedback && q) {
      feedback.hidden = false;
      feedback.textContent = result.correct ? "正解" : `要復習｜完成文：${q.model}`;
    }
  });
  const correct = results.filter((item) => item.correct).length;
  const panel = document.querySelector("#englishTrainingResult");
  if (panel) {
    panel.hidden = false;
    panel.innerHTML = `<h3>${correct} / 10 文</h3><p>${
      correct === 10 ? "全問正解です。完成英文を見ずに音読してください。" :
        "誤答文は構造確認→完成文の音読→別形式で復習します。"
    }</p><p class="button-note">提出 ${new Date(submittedAt).toLocaleString("ja-JP")}</p>`;
  }
}

function collectAnswers() {
  return Object.fromEntries(ENGLISH_QUESTIONS.map((q) =>
    [q.id, formElement?.elements.namedItem(q.id)?.value || ""]));
}

function updateProgress() {
  const count = Object.values(collectAnswers()).filter((v) => String(v).trim()).length;
  const badge = document.querySelector("#englishTrainingProgressBadge");
  if (badge) badge.textContent = `${count} / 10`;
}

function lockTraining() {
  stopTimer();
  formElement?.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
  document.querySelector(".english-training")?.classList.add("time-finished");
  document.querySelector("#englishTrainingTimerBadge")?.classList.add("finished");
}

function isEligible() {
  return document.body.dataset.auth === "in" && document.body.dataset.role === "student" &&
    document.body.dataset.view === "training" &&
    document.body.dataset.trainingSubject === "english";
}

function isFinished(state) { return Boolean(state?.submittedAt); }
function loadState() {
  try { return JSON.parse(localStorage.getItem(englishDailyStorageKey()) || "{}"); }
  catch { return {}; }
}
function saveState(state) { localStorage.setItem(englishDailyStorageKey(), JSON.stringify(state)); }
function stopTimer() {
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
}
function setStatus(message) {
  const status = document.querySelector("#englishTrainingSaveStatus");
  if (status) status.textContent = message;
}
function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttribute(value) { return escapeHtml(value).replace(/'/g, "&#39;"); }
