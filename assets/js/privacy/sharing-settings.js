export const SHARING_ITEMS = Object.freeze([
  ["progress", "学習進度"],
  ["studyTime", "学習時間"],
  ["completion", "提出・完了状況"],
  ["scores", "点数・正答率"],
  ["weaknesses", "弱点・誤答傾向"],
  ["schedule", "学習予定"],
  ["evidence", "提出答案の画像"],
  ["fatigue", "疲労の目安"]
]);

export const SHARING_LEVEL_LABELS = Object.freeze({
  none: "公開しない",
  summary: "要約だけ",
  detail: "詳細まで"
});

export function sharingSettingsMarkup(preferences = {}, ownerLabel = "本人") {
  const rows = SHARING_ITEMS.map(([key, label]) => `
    <label class="sharing-setting-row">
      <span>${escapeHtml(label)}</span>
      <select name="${key}" aria-label="${escapeHtml(label)}の共有範囲">
        ${Object.entries(SHARING_LEVEL_LABELS).map(([value, text]) =>
          `<option value="${value}"${preferences[key] === value ? " selected" : ""}>${text}</option>`
        ).join("")}
      </select>
    </label>`).join("");
  return `
    <strong>外部サポーターへの情報共有</strong>
    <span>${escapeHtml(ownerLabel)}の希望と保護者の設定を照合し、狭い方を適用します。ユイ先生との会話・個人メモは共有できません。</span>
    <form class="sharing-settings-form" id="sharingSettingsForm">
      ${rows}
      <button type="submit">共有範囲を保存</button>
      <small class="sharing-settings-status" aria-live="polite"></small>
    </form>`;
}

export function sharingPreferencesFromForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(SHARING_ITEMS.map(([key]) => [key, String(data.get(key) || "none")]));
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
