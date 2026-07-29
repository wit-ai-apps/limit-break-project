export const MEMORY_QUEUE_KEY = "limitBreakAdaptiveMemoryQueueV1";
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

export function loadMemoryQueue(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(MEMORY_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemoryQueue(items, storage = globalThis.localStorage) {
  storage?.setItem(MEMORY_QUEUE_KEY, JSON.stringify(items));
}

export function recordEnglishTrainingResults(questions, results, answers = {}, now = new Date(),
  storage = globalThis.localStorage) {
  const queue = loadMemoryQueue(storage);
  const resultMap = new Map(results.map((result) => [result.id, result]));
  const today = dateKeyJst(now);

  questions.forEach((question) => {
    const result = resultMap.get(question.id);
    if (!result) return;
    const id = `english:${question.id}`;
    const existing = queue.find((item) => item.id === id);
    const historyEntry = {
      at: now.toISOString(),
      correct: Boolean(result.correct),
      answer: String(answers[question.id] || "")
    };

    if (!existing && result.correct) return;
    if (!existing) {
      queue.push({
        id,
        subject: "英語",
        type: "英文構文",
        front: `${question.prompt}\n${question.text}`,
        back: question.model,
        tags: [question.phase, question.video],
        source: "毎日10文",
        stage: 0,
        nextReview: today,
        correctCount: 0,
        incorrectCount: 1,
        history: [historyEntry],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
      return;
    }

    existing.history = [...(existing.history || []), historyEntry].slice(-30);
    existing.updatedAt = now.toISOString();
    if (result.correct) {
      existing.correctCount = (existing.correctCount || 0) + 1;
      existing.stage = Math.min((existing.stage || 0) + 1, REVIEW_INTERVALS.length);
      existing.nextReview = addDaysJst(today, intervalForStage(existing.stage));
    } else {
      existing.incorrectCount = (existing.incorrectCount || 0) + 1;
      existing.stage = Math.max(0, (existing.stage || 0) - 1);
      existing.nextReview = today;
    }
  });

  saveMemoryQueue(queue, storage);
  return queue;
}

export function applyMemoryRating(item, rating, now = new Date()) {
  const today = dateKeyJst(now);
  const next = { ...item, updatedAt: now.toISOString() };
  next.reviewCount = (next.reviewCount || 0) + 1;
  next.history = [...(next.history || []), {
    at: now.toISOString(),
    rating,
    source: "暗記"
  }].slice(-30);

  if (rating === "○") {
    next.correctCount = (next.correctCount || 0) + 1;
    next.stage = Math.min((next.stage || 0) + 1, REVIEW_INTERVALS.length);
    next.nextReview = addDaysJst(today, intervalForStage(next.stage));
  } else if (rating === "△") {
    next.stage = Math.max(0, next.stage || 0);
    next.nextReview = addDaysJst(today, 1);
  } else {
    next.incorrectCount = (next.incorrectCount || 0) + 1;
    next.stage = 0;
    next.nextReview = addDaysJst(today, 1);
  }
  return next;
}

export function memorySummary(queue, now = new Date()) {
  const today = dateKeyJst(now);
  const due = queue.filter((item) => !item.archived && item.nextReview <= today);
  const mastered = queue.filter((item) => (item.stage || 0) >= REVIEW_INTERVALS.length);
  const accuracyBase = queue.reduce((sum, item) =>
    sum + (item.correctCount || 0) + (item.incorrectCount || 0), 0);
  const correct = queue.reduce((sum, item) => sum + (item.correctCount || 0), 0);
  return {
    due,
    total: queue.filter((item) => !item.archived).length,
    mastered: mastered.length,
    accuracy: accuracyBase ? Math.round(correct / accuracyBase * 100) : 0
  };
}

export function renderAdaptiveMemory(summaryElement, listElement, options = {}) {
  if (!summaryElement || !listElement) return;
  const queue = loadMemoryQueue();
  const summary = memorySummary(queue);
  summaryElement.innerHTML = [
    ["今日の復習", `${summary.due.length}件`],
    ["登録済み", `${summary.total}件`],
    ["定着", `${summary.mastered}件`],
    ["正答率", `${summary.accuracy}%`]
  ].map(([label, value]) =>
    `<div class="load-card"><strong>${value}</strong><span>${label}</span></div>`).join("");

  listElement.innerHTML = "";
  if (!summary.due.length) {
    listElement.innerHTML = `
      <article class="memory-card memory-empty">
        <strong>今日の復習はありません</strong>
        <span>「毎日10文」を提出すると、誤答した構文が自動でここへ登録されます。</span>
        <div class="mission-note">復習日は1日後・3日後・7日後・14日後・30日後の順で調整されます。</div>
      </article>`;
    return;
  }

  summary.due.slice(0, 10).forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "memory-card adaptive-memory-card";
    card.dataset.memoryId = item.id;
    card.innerHTML = `
      <div class="math-question-heading">
        <span class="math-question-number">${index + 1}</span>
        <span class="math-question-topic">${escapeHtml(item.subject)} / ${escapeHtml(item.tags?.join("・") || item.type)}</span>
      </div>
      <strong class="memory-front">${escapeHtml(item.front).replace(/\n/g, "<br>")}</strong>
      <span>${escapeHtml(item.source)} / 復習段階 ${item.stage || 0}</span>
      <label class="memory-answer-label">回答
        <input type="text" data-memory-answer autocomplete="off" spellcheck="false">
      </label>
      <button type="button" data-memory-check>答え合わせ</button>
      <div class="memory-reveal" data-memory-reveal hidden>
        <div class="mission-note"><strong>完成文・模範解答</strong><br>${escapeHtml(item.back)}</div>
        <p class="memory-match" data-memory-match></p>
        <div class="memory-actions" aria-label="暗記判定">
          <button type="button" data-memory-rating="○">○ 覚えた</button>
          <button type="button" data-memory-rating="△" class="secondary">△ あいまい</button>
          <button type="button" data-memory-rating="×" class="warning">× 覚えていない</button>
        </div>
      </div>`;

    card.querySelector("[data-memory-check]")?.addEventListener("click", (event) => {
      const answer = card.querySelector("[data-memory-answer]")?.value || "";
      const reveal = card.querySelector("[data-memory-reveal]");
      const match = card.querySelector("[data-memory-match]");
      if (reveal) reveal.hidden = false;
      if (match) match.textContent = normalized(answer) === normalized(item.back)
        ? "入力した回答は模範解答と一致しました。"
        : "模範解答と見比べ、理解度を○・△・×で判定してください。";
      event.currentTarget.disabled = true;
    });

    card.querySelectorAll("[data-memory-rating]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = loadMemoryQueue();
        const updated = current.map((entry) =>
          entry.id === item.id ? applyMemoryRating(entry, button.dataset.memoryRating) : entry);
        saveMemoryQueue(updated);
        options.onChange?.(updated);
        renderAdaptiveMemory(summaryElement, listElement, options);
      });
    });
    listElement.appendChild(card);
  });
}

function intervalForStage(stage) {
  if (stage <= 0) return 1;
  return REVIEW_INTERVALS[Math.min(stage - 1, REVIEW_INTERVALS.length - 1)];
}

export function dateKeyJst(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDaysJst(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 3));
  return dateKeyJst(date);
}

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[.,!?'"’]/g, "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
