const YUI_DIALOGUE_KEY = "limitBreakYuiDailyDialogueV1";

export function buildYuiBriefing(context = {}, role = "student") {
  const name = context.name ? `${context.name}さん、` : "";
  const submitted = Number(context.submitted || 0);
  const total = Number(context.total || 0);
  const average = Number.isFinite(context.averageScore) ? context.averageScore : null;
  const dueMemory = Number(context.dueMemory || 0);
  const weakness = String(context.weakness || "").trim();
  const fatigue = Number(context.fatigue || 0);

  if (role === "parent") {
    return {
      message: `${name}今日は${submitted ? `${submitted}件を提出しています` : "まだ提出はありません"}。${
        average === null ? "結果は提出後に確認できます。" : `現在の平均は${average}点です。`
      }`,
      detail: fatigue >= 4
        ? "今日は負荷が高めです。点数を尋ねるより、取り組んだことを認めて休息を促してください。"
        : submitted ? "結果よりも、今日取り組んだ事実を具体的にほめる声かけがおすすめです。"
          : "学習を始めたかどうかだけを穏やかに確認してください。",
      question: "",
      choices: [],
      actions: context.hasEvidence ? [{ label: "最新の提出答案を見る", view: "evidence" }] : []
    };
  }

  if (role === "supporter") {
    return {
      message: `${name}今日は${submitted ? `${submitted}件の学習記録があります` : "まだ学習記録はありません"}。`,
      detail: submitted
        ? "細かな点数より、続けたことと最後まで提出したことを応援してください。"
        : "急かさず、「始められそうな時間はある？」と声をかけるのがおすすめです。",
      question: "",
      choices: [],
      actions: []
    };
  }

  if (["teacher", "lead_teacher", "admin"].includes(role)) {
    return {
      message: `本日の提出は${total ? `${submitted}/${total}件` : `${submitted}件`}。${
        average === null ? "正答率は未集計です。" : `平均は${average}点です。`
      }`,
      detail: weakness
        ? `継続して確認する項目は「${weakness}」です。暗記期限は${dueMemory}件あります。`
        : `暗記期限は${dueMemory}件です。未提出と回答時間を含めて次の出題を判断してください。`,
      question: "",
      choices: [],
      actions: [
        ...(context.hasEvidence ? [{ label: "最新の提出答案を見る", view: "evidence" }] : []),
        { label: "進度と弱点を見る", view: "progress" }
      ]
    };
  }

  if (!submitted && average === null) {
    return {
      message: `${name}おはよう。今日の学習を一緒に決めよう。`,
      detail: dueMemory
        ? `今日は暗記・定着復習が${dueMemory}件あります。最初の一歩を小さく決めれば大丈夫です。`
        : "今日は、使える時間に合わせて無理のない順番を作ります。",
      question: "今日は何分くらい学習できそう？",
      choices: [
        { label: "15分だけ", value: "time_15", response: "15分なら、復習を一つに絞ろう。まず暗記から始めます。", view: "memory" },
        { label: "30分", value: "time_30", response: "30分なら、毎日トレーニングを一つ終わらせよう。", view: "training" },
        { label: "60分以上", value: "time_60", response: "今日はトレーニングと復習を組み合わせよう。", view: "today" }
      ],
      actions: []
    };
  }

  if (fatigue >= 4) {
    return {
      message: `${name}昨日までよく続けています。今日は負荷を少し下げても大丈夫です。`,
      detail: "正確さを保つため、新しい内容を増やさず復習中心にする選択もできます。",
      question: "今日はどちらにする？",
      choices: [
        { label: "復習だけ", value: "review_only", response: "今日は復習だけにしよう。終わったらしっかり休もう。", view: "memory" },
        { label: "通常どおり", value: "normal", response: "無理を感じたら途中で止めて大丈夫。30分を上限に進めよう。", view: "training" }
      ],
      actions: []
    };
  }

  if (average !== null && average < 70) {
    return {
      message: `${name}前回は平均${average}点でした。${
        weakness ? `「${weakness}」を一つ直せば前進できます。` : "今日は誤答を一つずつ整理しよう。"
      }`,
      detail: dueMemory ? `復習期限が${dueMemory}件あります。新しい問題より先に確認するのがおすすめです。` : "難度は上げず、同じ構文・単元を別形式で確認します。",
      question: "今日はどこから始める？",
      choices: [
        { label: "間違いの復習", value: "weak_review", response: "前回の間違いから始めよう。答えを思い出してから確認します。", view: "memory" },
        { label: "今日の10題・10文", value: "daily_training", response: "今日は同じ難度で正確さを優先しよう。", view: "training" }
      ],
      actions: []
    };
  }

  return {
    message: `${name}前回は${average === null ? "最後まで学習できました" : `平均${average}点でした`}。続けていることが力になっています。`,
    detail: dueMemory
      ? `今日は定着復習が${dueMemory}件あります。正解した問題も、説明できるか確認しよう。`
      : "今日は正確さを保ちながら、同じ構文・単元の応用へ進めます。",
    question: "今日の目標を選んでください。",
    choices: [
      { label: "全問正解を狙う", value: "perfect", response: "速さより見直しを優先して、全問正解を狙おう。", view: "training" },
      { label: "苦手を一つ直す", value: "one_weakness", response: "今日は苦手を一つだけ確実に直そう。", view: dueMemory ? "memory" : "training" }
    ],
    actions: []
  };
}

export function renderYuiCoachCard({ messageElement, actionsElement, role, context, onNavigate }) {
  if (!messageElement || !actionsElement) return;
  const briefing = buildYuiBriefing(context, role);
  const saved = loadDailyDialogue();

  messageElement.innerHTML = `
    <span class="yui-message-main">${escapeHtml(briefing.message)}</span>
    <span class="yui-message-detail">${escapeHtml(briefing.detail)}</span>
  `;
  actionsElement.innerHTML = "";

  if (briefing.question && role === "student" && !saved?.choice) {
    const question = document.createElement("div");
    question.className = "yui-question";
    question.innerHTML = `<strong>${escapeHtml(briefing.question)}</strong>`;
    const choiceRow = document.createElement("div");
    choiceRow.className = "yui-choice-row";
    briefing.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        saveDailyDialogue({
          choice: choice.value,
          choiceLabel: choice.label,
          response: choice.response,
          answeredAt: new Date().toISOString()
        });
        renderYuiCoachCard({ messageElement, actionsElement, role, context, onNavigate });
        if (choice.view) onNavigate?.(choice.view);
      });
      choiceRow.appendChild(button);
    });
    question.appendChild(choiceRow);
    actionsElement.appendChild(question);
  }

  if (saved?.response && role === "student") {
    const response = document.createElement("p");
    response.className = "yui-response";
    response.textContent = `ユイ先生：${saved.response}`;
    actionsElement.appendChild(response);
  }

  if (role === "student") {
    const form = document.createElement("form");
    form.className = "yui-free-form";
    form.innerHTML = `
      <label>ユイ先生に伝える
        <input type="text" name="message" maxlength="160"
          placeholder="学校で習った単元、困っていること、今日使える時間など"
          value="${escapeAttribute(saved?.freeMessage || "")}">
      </label>
      <button type="submit" class="secondary">伝える</button>`;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const freeMessage = new FormData(form).get("message")?.toString().trim() || "";
      if (!freeMessage) return;
      saveDailyDialogue({
        ...loadDailyDialogue(),
        freeMessage,
        freeMessageAt: new Date().toISOString()
      });
      const status = document.createElement("p");
      status.className = "yui-response";
      status.textContent = "ユイ先生：教えてくれてありがとう。今日の学習判断に記録しました。";
      form.replaceWith(status);
    });
    actionsElement.appendChild(form);
  }

  briefing.actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = action.label;
    button.addEventListener("click", () => onNavigate?.(action.view));
    actionsElement.appendChild(button);
  });
}

export function dailyDialogueKey(date = new Date()) {
  const shifted = new Date(date.getTime() - (8 * 60 + 55) * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(shifted);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${YUI_DIALOGUE_KEY}:${value.year}-${value.month}-${value.day}`;
}

function loadDailyDialogue() {
  try { return JSON.parse(localStorage.getItem(dailyDialogueKey()) || "{}"); }
  catch { return {}; }
}

function saveDailyDialogue(value) {
  localStorage.setItem(dailyDialogueKey(), JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
