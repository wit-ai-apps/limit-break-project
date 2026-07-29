const TOPICS = Object.freeze([
  { field: "overview", pattern: /学習状況|全体|様子|どんな感じ|最近どう/ },
  { field: "scores", pattern: /点数|成績|正答率|何点/ },
  { field: "weaknesses", pattern: /弱点|苦手|間違|誤答/ },
  { field: "completion", pattern: /提出|宿題|終わ|完了|やった/ },
  { field: "studyTime", pattern: /時間|何分|勉強量/ },
  { field: "schedule", pattern: /予定|計画|次に|明日/ },
  { field: "fatigue", pattern: /疲れ|体調|しんど|気持ち|やる気/ },
  { field: "yuiDialogue", pattern: /会話|相談|ユイ先生|何を話/ }
]);

export function detectGuardianQuestionField(question = "") {
  return TOPICS.find((topic) => topic.pattern.test(String(question)))?.field || "progress";
}

export function buildGuardianAnswer(question, fields = {}) {
  const field = detectGuardianQuestionField(question);
  if (field === "overview" || field === "progress") {
    const sentences = [];
    const used = [];
    const progress = fields.progress;
    if (progress && progress.level !== "none") {
      const value = progress.value || {};
      sentences.push(`現在の学習状況は「${value.status || "確認中"}」です。`);
      used.push("progress");
    }
    const completion = fields.completion;
    if (completion && completion.level !== "none") {
      const value = completion.value || {};
      sentences.push(`共有記録${Number(value.recorded || 0)}件のうち、完了は${Number(value.completed || 0)}件です。`);
      used.push("completion");
    }
    const scores = fields.scores;
    if (scores && scores.level !== "none" && scores.value?.average !== null
      && scores.value?.average !== undefined) {
      sentences.push(`採点済み結果の平均は${scores.value.average}点です。`);
      used.push("scores");
    }
    const studyTime = fields.studyTime;
    if (studyTime && studyTime.level !== "none" && Number(studyTime.value?.minutes || 0) > 0) {
      sentences.push(`記録されている学習時間は合計${Number(studyTime.value.minutes)}分です。`);
      used.push("studyTime");
    }
    const schedule = fields.schedule;
    if (schedule && schedule.level !== "none" && Array.isArray(schedule.value) && schedule.value.length) {
      sentences.push(`直近の予定は「${schedule.value.slice(0, 3).map((item) => item.title).join("、")}」です。`);
      used.push("schedule");
    }
    return {
      field: "overview",
      fieldsUsed: used,
      answer: sentences.length
        ? `${sentences.join("")}結果だけを問い詰めず、今日取り組めそうなことを一緒に確認してください。`
        : "現在共有されている学習情報はありません。生徒本人と相談して共有設定を確認してください。"
    };
  }
  const shared = fields[field];
  if (!shared || shared.level === "none" || field === "yuiDialogue") {
    return {
      field,
      fieldsUsed: [],
      answer: field === "yuiDialogue"
        ? "生徒本人とユイ先生との会話内容は非公開です。必要なことは、生徒本人が話せる範囲で直接聞いてください。"
        : "この項目は現在の共有範囲に含まれていないため、内容を回答できません。生徒本人と相談して共有設定を確認してください。"
    };
  }
  const value = shared.value || {};
  if (field === "scores") {
    return {
      field, fieldsUsed: [field],
      answer: value.average === null || value.average === undefined
        ? "共有できる採点結果はまだありません。提出後に改めて確認してください。"
        : `現在共有されている結果の平均は${value.average}点です。点数だけでなく、取り組みを具体的に認める声かけがおすすめです。`
    };
  }
  if (field === "completion") {
    return {
      field, fieldsUsed: [field],
      answer: `共有されている記録では、${Number(value.recorded || 0)}件中${Number(value.completed || 0)}件が完了しています。未完了を責めず、始める時間を一緒に決めてください。`
    };
  }
  if (field === "studyTime") {
    return {
      field, fieldsUsed: [field],
      answer: `共有されている学習時間は合計${Number(value.minutes || 0)}分です。記録外の学習もあるため、本人の話と合わせて確認してください。`
    };
  }
  if (field === "weaknesses") {
    const items = Array.isArray(value) ? value : [];
    return {
      field, fieldsUsed: [field],
      answer: items.length
        ? `現在共有されている確認項目は「${items.join("、")}」です。今日は一つに絞って復習するのがおすすめです。`
        : "共有できる弱点情報はまだ確定していません。要確認のAI採点は、人間が確認するまで弱点として扱いません。"
    };
  }
  if (field === "schedule") {
    const items = Array.isArray(value) ? value : [];
    return {
      field, fieldsUsed: [field],
      answer: items.length
        ? `直近の予定は「${items.map((item) => item.title).join("、")}」です。`
        : "共有されている直近の学習予定はありません。"
    };
  }
  if (field === "fatigue") {
    return {
      field, fieldsUsed: [field],
      answer: "疲労や気持ちは推測で断定しません。本人の自己申告を尊重し、休息が必要か直接確認してください。"
    };
  }
  return { field, fieldsUsed: [], answer: "質問内容を確認できませんでした。具体的な項目を尋ねてください。" };
}
