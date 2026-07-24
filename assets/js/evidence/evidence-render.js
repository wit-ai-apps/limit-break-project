import { escapeHtml } from "../utils/helpers.js";
import {
  canRenderEvidenceRecord,
  canSubmitEvidence,
  canViewEvidenceScore
} from "./evidence-policy.js";

export function renderEvidenceLogs({
  logList,
  role,
  roleKey,
  records,
  expectedMissions = [],
  recordKey,
  openEvidencePreview,
  onRandomEvidenceSubmit,
  onCancelEvidenceAnalysis,
  onDeleteEvidenceRecord
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

  const evidenceRecords = sortEvidenceRecords(
    [...records].filter(canRenderEvidenceRecord),
    roleKey
  );

  const submittedMissionIds = new Set(evidenceRecords.map((record) => record.sourceMissionId || record.missionId));
  const missingMissions = expectedMissions.filter((mission) => !submittedMissionIds.has(mission.missionId));
  logList.insertAdjacentHTML("beforeend", `
    <div class="log-card">
      <strong>未提出・画像待ち</strong>
      ${missingMissions.length
        ? `<div class="missing-evidence-grid">${missingMissions.map((mission) => `
            <div class="missing-evidence-card">
              <strong>${escapeHtml(mission.subject || "未分類")} / ${escapeHtml(mission.lesson || mission.title || "")}</strong>
              <span>${escapeHtml(mission.course || "")} ${escapeHtml(mission.part || "")}</span>
              <small>提出画像なし</small>
            </div>`).join("")}</div>`
        : `<span>現在の予定分はすべて提出済みです。</span>`}
    </div>
  `);

  if (evidenceRecords.length) {
    const gallery = document.createElement("div");
    gallery.className = "log-card";
    gallery.innerHTML = `
      <strong>教科・講座・単元別 提出画像</strong>
      <div class="evidence-gallery">
        ${evidenceRecords.map((record) => `
          <article class="evidence-gallery-card">
            <button type="button" class="evidence-thumbnail-button" data-evidence-key="${recordKey(record)}">
              ${record.evidenceImageUrl
                ? `<img src="${escapeHtml(record.evidenceImageUrl)}" alt="${escapeHtml(record.evidenceImageName)}" loading="lazy">`
                : `<span class="evidence-thumbnail-placeholder">画像を開く</span>`}
            </button>
            <strong>${escapeHtml(record.subject || "未分類")} / ${escapeHtml(record.course || "教材不明")}</strong>
            <span>${escapeHtml(record.lesson || "")} ${escapeHtml(record.part || "")}</span>
            <span>${canViewEvidenceScore(role) ? `正答率 ${escapeHtml(record.score || "-")}%` : "採点結果あり"}</span>
            ${record.strengthAnalysis ? `<small><b>できた：</b>${escapeHtml(record.strengthAnalysis)}</small>` : ""}
            ${record.weaknessAnalysis ? `<small><b>弱点：</b>${escapeHtml(record.weaknessAnalysis)}</small>` : ""}
            ${record.nextLearningAction ? `<small><b>次：</b>${escapeHtml(record.nextLearningAction)}</small>` : ""}
            ${canCancelAnalysis(record) ? `<button type="button" class="warning evidence-cancel-button" data-cancel-evidence-key="${recordKey(record)}">解析を中止</button>` : ""}
            ${canSubmit && !record.firebaseDocumentId ? `<button type="button" class="warning evidence-delete-button" data-delete-evidence-key="${recordKey(record)}">端末内記録を削除</button>` : ""}
          </article>
        `).join("")}
      </div>
    `;
    gallery.querySelectorAll("[data-evidence-key]").forEach((button) => {
      button.addEventListener("click", () => openEvidencePreview(button.dataset.evidenceKey));
    });
    bindCancelButtons(gallery, onCancelEvidenceAnalysis);
    bindDeleteButtons(gallery, onDeleteEvidenceRecord);
    logList.appendChild(gallery);

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
              <th>AI解析</th>
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
                <td>
                  ${analysisStatusLabel(record)}
                  ${canCancelAnalysis(record) ? `<button type="button" class="warning evidence-cancel-button" data-cancel-evidence-key="${recordKey(record)}">中止</button>` : ""}
                  ${canSubmit && !record.firebaseDocumentId ? `<button type="button" class="warning evidence-delete-button" data-delete-evidence-key="${recordKey(record)}">削除</button>` : ""}
                </td>
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
    bindCancelButtons(tableCard, onCancelEvidenceAnalysis);
    bindDeleteButtons(tableCard, onDeleteEvidenceRecord);
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
    <strong>AI確認テスト画像提出</strong>
    <span>画像を選ぶだけで提出できます。AIが教科・教材・講座・単元・回答数・正答率を読み取り、保護者・先生の画面へ自動整理します。</span>
    <form id="randomEvidenceForm" class="login-form" novalidate>
      <div class="field">
        <label for="randomEvidenceImage">確認テスト画像</label>
        <input id="randomEvidenceImage" type="file" accept="image/png,image/jpeg,image/webp" multiple required>
        <span class="button-note">2ページ以上はまとめて選択できます。最大10枚、1枚10MB未満です。</span>
      </div>
      <button type="submit" id="randomEvidenceSubmitButton">画像を提出してAI解析する</button>
      <button type="button" id="randomEvidenceCancelButton" class="warning" hidden>アップロード・解析を中止</button>
      <p class="button-note" id="randomEvidenceStatus" role="status" aria-live="polite">提出後はAI解析待ちとして保存され、完了すると自動分類されます。</p>
    </form>
  `;
  card.querySelector("#randomEvidenceForm").addEventListener("submit", onRandomEvidenceSubmit);
  container.appendChild(card);
}

function sortBySavedAtDesc(a, b) {
  return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
}

function sortEvidenceRecords(records, roleKey) {
  if (roleKey === "student") return records.sort(sortBySavedAtDesc);
  return records.sort((a, b) =>
    String(a.subject || "未分類").localeCompare(String(b.subject || "未分類"), "ja") ||
    String(a.course || "").localeCompare(String(b.course || ""), "ja") ||
    sortBySavedAtDesc(a, b)
  );
}

function analysisStatusLabel(record) {
  const labels = {
    queued: "解析待ち",
    processing: "解析中",
    completed: "自動分類済み",
    needs_review: "要確認",
    error: "解析エラー",
    stalled: "解析停止",
    cancelled: "中止済み"
  };
  let status = record.aiAnalysisStatus || (record.firebaseSyncStatus === "synced" ? "queued" : "");
  if (status === "processing" && isAnalysisStalled(record)) status = "stalled";
  const confidence = Number(record.aiAnalysis?.confidence);
  const confidenceText = Number.isFinite(confidence) ? ` ${Math.round(confidence * 100)}%` : "";
  return escapeHtml(`${labels[status] || "未解析"}${confidenceText}`);
}

function canCancelAnalysis(record) {
  const status = record.aiAnalysisStatus
    || (String(record.autoGradingStatus || "").includes("processing") ? "processing" : "")
    || (record.firebaseSyncStatus === "syncing" ? "queued" : "");
  return ["queued", "processing", "stalled"].includes(status);
}

function bindCancelButtons(container, onCancelEvidenceAnalysis) {
  if (typeof onCancelEvidenceAnalysis !== "function") return;
  container.querySelectorAll("[data-cancel-evidence-key]").forEach((button) => {
    button.addEventListener("click", () => onCancelEvidenceAnalysis(button.dataset.cancelEvidenceKey, button));
  });
}

function bindDeleteButtons(container, onDeleteEvidenceRecord) {
  if (typeof onDeleteEvidenceRecord !== "function") return;
  container.querySelectorAll("[data-delete-evidence-key]").forEach((button) => {
    button.addEventListener("click", () => onDeleteEvidenceRecord(button.dataset.deleteEvidenceKey, button));
  });
}

function isAnalysisStalled(record) {
  const raw = record.aiAnalysisUpdatedAt;
  const date = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw || record.savedAt || 0);
  return Number.isFinite(date.getTime()) && Date.now() - date.getTime() > 10 * 60 * 1000;
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
