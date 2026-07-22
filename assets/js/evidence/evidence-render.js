import { formatDateTimeInput } from "../utils/countdown.js";
import { escapeHtml } from "../utils/helpers.js";
import {
  canRenderEvidenceRecord,
  canSubmitEvidence,
  canViewEvidenceScore
} from "./evidence-policy.js";

export function renderEvidenceLogs({
  logList,
  role,
  records,
  recordKey,
  openEvidencePreview,
  onRandomEvidenceSubmit
}) {
  logList.innerHTML = "";
  const canSubmit = canSubmitEvidence(role);
  const evidenceGuide = canSubmit
    ? "予定にない確認テストも、ここから教科・教材・講座を選んで画像提出できます。提出後は保護者・サポーター・講師の確認画面に並びます。"
    : "生徒が提出した確認テスト画像をここで確認します。画像名を押すと拡大表示できます。表示されない場合は、生徒側でFirebase同期済みの提出になっているか確認してください。";

  logList.insertAdjacentHTML("beforeend", `
    <div class="log-card">
      <strong>${canSubmit ? "確認テスト画像の提出" : "提出画像の確認"}</strong>
      <span>${evidenceGuide}</span>
    </div>
  `);

  renderRandomEvidenceUploader(logList, role, onRandomEvidenceSubmit);

  if (!records.length) {
    logList.insertAdjacentHTML("beforeend", `<div class="empty">まだ提出画像・記録がありません。</div>`);
    return;
  }

  const evidenceRecords = [...records]
    .filter(canRenderEvidenceRecord)
    .sort(sortBySavedAtDesc);

  if (evidenceRecords.length) {
    const tableCard = document.createElement("div");
    tableCard.className = "log-card";
    tableCard.innerHTML = `
      <strong>確認テスト提出画像一覧</strong>
      <span>提出済みのスクショを一覧で確認できます。画像ボタンを押すと拡大表示します。</span>
      <div class="evidence-table-wrap" style="margin-top: 10px;">
        <table class="evidence-table">
          <thead>
            <tr>
              <th>提出日時</th>
              <th>教科</th>
              <th>教材</th>
              <th>講座 / 単元</th>
              <th>テスト</th>
              <th>回答数</th>
              <th>正答率</th>
              <th>保存先</th>
              <th>画像</th>
            </tr>
          </thead>
          <tbody>
            ${evidenceRecords.map((record) => `
              <tr>
                <td>${formatSavedAt(record.submittedAt || record.savedAt)}</td>
                <td>${escapeHtml(record.subject || "-")}</td>
                <td>${escapeHtml(record.course || "-")}</td>
                <td>${escapeHtml(record.lesson || "")} ${escapeHtml(record.part || "")}</td>
                <td>${escapeHtml(record.testType || "-")}</td>
                <td>${canViewEvidenceScore(role) ? escapeHtml(record.answeredCount || "-") : "提出あり"}</td>
                <td>${canViewEvidenceScore(role) ? `${escapeHtml(record.score || "-")}%` : "提出あり"}</td>
                <td>${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}</td>
                <td><button type="button" class="evidence-open-button" data-evidence-key="${recordKey(record)}">${escapeHtml(record.evidenceImageName)}</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    tableCard.querySelectorAll("[data-evidence-key]").forEach((button) => {
      button.addEventListener("click", () => openEvidencePreview(button.dataset.evidenceKey));
    });
    logList.appendChild(tableCard);
  } else {
    logList.insertAdjacentHTML("beforeend", `<div class="empty">提出画像はまだありません。生徒が確認テスト結果を提出すると、ここに日時・教科・教材ごとに表示されます。</div>`);
  }

  [...records].sort(sortBySavedAtDesc).slice(0, 10).forEach((record) => {
    const card = document.createElement("div");
    card.className = "log-card";
    const scoreLine = canViewEvidenceScore(role)
      ? `回答数 ${record.answeredCount || "-"} / 正答率 ${record.score || "-"}% / 理解度 ${record.understanding || "-"}`
      : role.showScore === "summary"
        ? "確認テスト: 記録あり"
        : "努力記録: 完了";
    const fatigueLine = role.showFatigue === true ? `疲労度 ${record.fatigue || "-"}` : "";
    const mentalLine = role.showMentalState === true && record.mentalState ? `<div>メンタル状態: ${escapeHtml(record.mentalState)}</div>` : "";
    const mistakeLine = role.showMistake && record.mistakeReason ? `<div>間違い理由: ${escapeHtml(record.mistakeReason)}</div>` : "";
    const privateLine = role.showPrivateNote && record.privateNote ? `<div>内省メモ: ${escapeHtml(record.privateNote)}</div>` : "";
    const evidenceLine = record.evidenceImageName
      ? `<div>結果スクショ: <button type="button" class="evidence-open-button" data-evidence-key="${recordKey(record)}">${escapeHtml(record.evidenceImageName)}</button> / OCR読取: 正式版で実装</div>`
      : `<div>結果スクショ: 未提出 / 後日へ繰り越し</div>`;
    card.innerHTML = `
      <strong>${escapeHtml(record.date)} / ${escapeHtml(record.missionTitle)}</strong>
      <span>${escapeHtml(record.testType)} / ${scoreLine}${fatigueLine ? " / " + escapeHtml(fatigueLine) : ""}</span>
      ${evidenceLine}
      ${mentalLine}
      ${mistakeLine}
      ${privateLine}
    `;
    card.querySelectorAll("[data-evidence-key]").forEach((button) => {
      button.addEventListener("click", () => openEvidencePreview(button.dataset.evidenceKey));
    });
    logList.appendChild(card);
  });
}

function renderRandomEvidenceUploader(container, role, onRandomEvidenceSubmit) {
  if (!canSubmitEvidence(role)) return;
  const card = document.createElement("div");
  card.className = "log-card random-evidence-card";
  card.innerHTML = `
    <strong>ランダム確認テスト提出</strong>
    <span>時間短縮のため、指定された教科・講座の確認テスト画像を提出します。できている単元は飛ばす判定に使い、分析機能は次の段階で追加します。</span>
    <form id="randomEvidenceForm" class="login-form" novalidate>
      <div class="form-grid">
        <div class="field">
          <label for="randomSubmittedAt">提出日時</label>
          <input id="randomSubmittedAt" type="datetime-local" value="${formatDateTimeInput()}">
        </div>
        <div class="field">
          <label for="randomSubject">教科</label>
          <select id="randomSubject" required>
            <option value="">選択してください</option>
            <option>数学</option>
            <option>英語</option>
            <option>物理</option>
            <option>化学</option>
            <option>古文</option>
            <option>国語</option>
            <option>世界史</option>
            <option>情報</option>
            <option>その他</option>
          </select>
        </div>
        <div class="field">
          <label for="randomCourse">教材名</label>
          <input id="randomCourse" type="text" placeholder="例: ベーシックレベル数学I">
        </div>
        <div class="field">
          <label for="randomLesson">講座 / Chapter</label>
          <input id="randomLesson" type="text" placeholder="例: 第3講 PART2">
        </div>
        <div class="field">
          <label for="randomUnit">単元名</label>
          <input id="randomUnit" type="text" placeholder="例: 三角形の外心・内心">
        </div>
        <div class="field">
          <label for="randomTestType">テスト種別</label>
          <input id="randomTestType" type="text" value="ランダム確認テスト">
        </div>
        <div class="field">
          <label for="randomAnsweredCount">回答数（任意）</label>
          <input id="randomAnsweredCount" type="number" min="0" placeholder="例: 10">
        </div>
        <div class="field">
          <label for="randomCorrectRate">正答率（任意）</label>
          <input id="randomCorrectRate" type="number" min="0" max="100" placeholder="例: 80">
        </div>
      </div>
      <div class="field">
        <label for="randomEvidenceImage">確認テスト画像</label>
        <input id="randomEvidenceImage" type="file" accept="image/*" required>
        <span class="button-note">結果画面、答案、自己採点済み画像などをアップしてください。</span>
      </div>
      <div class="field">
        <label for="randomNote">メモ（任意）</label>
        <textarea id="randomNote" placeholder="例: ここは飛ばせそう / 公式だけ再確認が必要"></textarea>
      </div>
      <button type="submit" id="randomEvidenceSubmitButton">画像を提出して記録する</button>
      <p class="button-note" id="randomEvidenceStatus" role="status" aria-live="polite">提出後、下の一覧に日時・教科・教材・画像が整理されます。</p>
    </form>
  `;
  card.querySelector("#randomEvidenceForm").addEventListener("submit", onRandomEvidenceSubmit);
  container.appendChild(card);
}

function sortBySavedAtDesc(a, b) {
  return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
}

function formatSavedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
