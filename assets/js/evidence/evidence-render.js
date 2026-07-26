import { escapeHtml } from "../utils/helpers.js";
import {
  canRenderEvidenceRecord,
  canSubmitEvidence,
  canViewEvidenceScore
} from "./evidence-policy.js";

let evidenceDraftFiles = [];
let evidenceDraftObjectUrls = [];
let evidenceSortMode = "newest";
let evidenceStatusFilter = "all";

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
  onDeleteEvidenceRecord,
  onAppendEvidenceFiles
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

  let evidenceRecords = sortEvidenceRecords(
    [...records].filter(canRenderEvidenceRecord),
    roleKey,
    evidenceSortMode
  );
  if (evidenceStatusFilter !== "all") {
    evidenceRecords = evidenceRecords.filter((record) => normalizedAnalysisStatus(record) === evidenceStatusFilter);
  }

  const rerender = () => renderEvidenceLogs({
    logList,
    role,
    roleKey,
    records,
    expectedMissions,
    recordKey,
    openEvidencePreview,
    onRandomEvidenceSubmit,
    onCancelEvidenceAnalysis,
    onDeleteEvidenceRecord,
    onAppendEvidenceFiles
  });
  logList.insertAdjacentHTML("beforeend", `
    <div class="log-card evidence-organizer">
      <strong>提出画像を整理</strong>
      <div class="evidence-organizer-controls">
        <label>並べ替え
          <select id="evidenceSortMode">
            <option value="newest" ${evidenceSortMode === "newest" ? "selected" : ""}>新しい順</option>
            <option value="oldest" ${evidenceSortMode === "oldest" ? "selected" : ""}>古い順</option>
            <option value="subject" ${evidenceSortMode === "subject" ? "selected" : ""}>教科・教材順</option>
            <option value="status" ${evidenceSortMode === "status" ? "selected" : ""}>解析状態順</option>
          </select>
        </label>
        <label>表示
          <select id="evidenceStatusFilter">
            <option value="all" ${evidenceStatusFilter === "all" ? "selected" : ""}>すべて</option>
            <option value="queued" ${evidenceStatusFilter === "queued" ? "selected" : ""}>待機中</option>
            <option value="processing" ${evidenceStatusFilter === "processing" ? "selected" : ""}>解析中</option>
            <option value="needs_review" ${evidenceStatusFilter === "needs_review" ? "selected" : ""}>要確認</option>
            <option value="completed" ${evidenceStatusFilter === "completed" ? "selected" : ""}>完了</option>
            <option value="error" ${evidenceStatusFilter === "error" ? "selected" : ""}>エラー</option>
          </select>
        </label>
      </div>
    </div>
  `);
  logList.querySelector("#evidenceSortMode")?.addEventListener("change", (event) => {
    evidenceSortMode = event.target.value;
    rerender();
  });
  logList.querySelector("#evidenceStatusFilter")?.addEventListener("change", (event) => {
    evidenceStatusFilter = event.target.value;
    rerender();
  });

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
    const folders = groupEvidenceRecords(evidenceRecords);
    const folderCard = document.createElement("div");
    folderCard.className = "log-card";
    folderCard.innerHTML = `
      <strong>テスト別フォルダ</strong>
      <span>同じ提出で選んだ複数ページを、1つのテストとしてまとめています。</span>
      <div class="evidence-folder-grid">
        ${folders.map((folder) => `
          <article class="evidence-folder-card">
            <div class="evidence-folder-head">
              <span class="evidence-folder-icon" aria-hidden="true"></span>
              <div>
                <strong>${escapeHtml(folder.subject)} / ${escapeHtml(folder.course)}</strong>
                <small>${escapeHtml(folder.title)} / ${folder.records.length}ページ</small>
              </div>
              ${statusIndicator(folder.status)}
            </div>
            <div class="evidence-folder-pages">
              ${folder.records.map((record) => `
                <button type="button" data-evidence-key="${recordKey(record)}">
                  <span>${Number(record.pageNumber || 1)}/${Math.max(folder.records.length, Number(record.pageCount || 1))}</span>
                  ${escapeHtml(record.evidenceImageName || "画像")}
                </button>
              `).join("")}
            </div>
            ${roleKey === "student" ? `
              <label class="secondary evidence-append-button">
                不足ページを追加
                <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple
                  data-append-group="${escapeHtml(folder.id)}" class="visually-hidden">
              </label>
            ` : ""}
          </article>
        `).join("")}
      </div>
    `;
    folderCard.querySelectorAll("[data-evidence-key]").forEach((button) => {
      button.addEventListener("click", () => openEvidencePreview(button.dataset.evidenceKey));
    });
    folderCard.querySelectorAll("[data-append-group]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.files?.length) onAppendEvidenceFiles?.(input.dataset.appendGroup, [...input.files]);
        input.value = "";
      });
    });
    logList.appendChild(folderCard);

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
            ${statusIndicator(normalizedAnalysisStatus(record))}
            ${record.strengthAnalysis ? `<small><b>できた：</b>${escapeHtml(record.strengthAnalysis)}</small>` : ""}
            ${record.weaknessAnalysis ? `<small><b>弱点：</b>${escapeHtml(record.weaknessAnalysis)}</small>` : ""}
            ${record.nextLearningAction ? `<small><b>次：</b>${escapeHtml(record.nextLearningAction)}</small>` : ""}
            ${Number(record.learningIssueCount) > 0 ? `<small><b>弱点DB：</b>${escapeHtml(record.learningIssueCount)}件を分野・単元別に保存</small>` : ""}
            ${canCancelAnalysis(record) ? `<button type="button" class="warning evidence-cancel-button" data-cancel-evidence-key="${recordKey(record)}">解析を中止</button>` : ""}
            ${canSubmit && isFailedEvidenceRecord(record) ? `<button type="button" class="warning evidence-delete-button" data-delete-evidence-key="${recordKey(record)}">失敗記録を削除</button>` : ""}
            ${roleKey === "student" && !isFailedEvidenceRecord(record) ? `<button type="button" class="warning evidence-delete-button" data-delete-evidence-key="${recordKey(record)}">この画像を削除</button>` : ""}
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
                  ${canSubmit && isFailedEvidenceRecord(record) ? `<button type="button" class="warning evidence-delete-button" data-delete-evidence-key="${recordKey(record)}">削除</button>` : ""}
                </td>
                <td>${record.firebaseSyncStatus === "synced" ? "Firebase" : "端末内"}</td>
                <td>
                  <button type="button" class="evidence-open-button" data-evidence-key="${recordKey(record)}">${escapeHtml(record.evidenceImageName)}</button>
                </td>
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
  evidenceDraftObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  evidenceDraftObjectUrls = [];
  const card = document.createElement("div");
  card.className = "log-card random-evidence-card";
  card.innerHTML = `
    <strong>AI確認テスト画像提出</strong>
    <span>写真・カメラ・Driveから選んだ画像を、提出前に並べて確認できます。</span>
    <form id="randomEvidenceForm" class="login-form" novalidate>
      <input id="randomEvidenceImage" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple required>
      <input id="randomEvidencePhotoInput" class="visually-hidden" type="file" accept="image/*" multiple>
      <input id="randomEvidenceCameraInput" class="visually-hidden" type="file" accept="image/*" capture="environment">
      <input id="randomEvidenceDocumentInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple>
      <div class="evidence-source-actions" aria-label="画像の追加方法">
        <button type="button" class="evidence-source-button" data-open-source="photo"><span aria-hidden="true">▧</span>写真から</button>
        <button type="button" class="evidence-source-button" data-open-source="camera"><span aria-hidden="true">◎</span>カメラ</button>
        <button type="button" class="evidence-source-button" data-open-source="document"><span aria-hidden="true">＋</span>PDF・Drive</button>
      </div>
      <section class="evidence-composer" aria-labelledby="evidenceComposerTitle">
        <div class="evidence-composer-head">
          <strong id="evidenceComposerTitle">提出する画像</strong>
          <span id="evidenceDraftSummary">0件 / 0MB</span>
        </div>
        <div id="evidenceDraftTray" class="evidence-draft-tray"></div>
        <p id="evidenceDraftEmpty" class="evidence-draft-empty">上のボタンから画像またはPDFを追加してください。</p>
      </section>
      <span class="button-note">最大10件、1ファイル10MB未満。選択後も追加・削除・順番変更ができます。</span>
      <button type="submit" id="randomEvidenceSubmitButton" disabled>画像を選んでください</button>
      <button type="button" id="randomEvidenceCancelButton" class="warning" hidden>アップロード・解析を中止</button>
      <p class="button-note" id="randomEvidenceStatus" role="status" aria-live="polite">提出後はAI解析待ちとして保存され、完了すると自動分類されます。</p>
      <dialog id="evidenceDraftPreviewDialog" class="evidence-draft-preview-dialog">
        <div class="evidence-draft-preview-panel">
          <div class="evidence-composer-head">
            <strong id="evidenceDraftPreviewTitle">画像確認</strong>
            <button type="button" class="secondary" data-close-draft-preview>戻る</button>
          </div>
          <img id="evidenceDraftPreviewImage" alt="提出前の画像確認">
          <iframe id="evidenceDraftPreviewPdf" title="提出前のPDF確認" hidden></iframe>
          <span>戻ると、選択済み画像の一覧へ戻ります。</span>
        </div>
      </dialog>
    </form>
  `;
  const form = card.querySelector("#randomEvidenceForm");
  const masterInput = form.querySelector("#randomEvidenceImage");
  const photoInput = form.querySelector("#randomEvidencePhotoInput");
  const cameraInput = form.querySelector("#randomEvidenceCameraInput");
  const documentInput = form.querySelector("#randomEvidenceDocumentInput");
  const tray = form.querySelector("#evidenceDraftTray");
  const empty = form.querySelector("#evidenceDraftEmpty");
  const summary = form.querySelector("#evidenceDraftSummary");
  const submitButton = form.querySelector("#randomEvidenceSubmitButton");
  const previewDialog = form.querySelector("#evidenceDraftPreviewDialog");
  const previewImage = form.querySelector("#evidenceDraftPreviewImage");
  const previewPdf = form.querySelector("#evidenceDraftPreviewPdf");
  const previewTitle = form.querySelector("#evidenceDraftPreviewTitle");

  const syncMasterInput = () => {
    const transfer = new DataTransfer();
    evidenceDraftFiles.forEach((file) => transfer.items.add(file));
    masterInput.files = transfer.files;
  };

  const renderDraftTray = () => {
    evidenceDraftObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    evidenceDraftObjectUrls = [];
    const totalBytes = evidenceDraftFiles.reduce((sum, file) => sum + file.size, 0);
    summary.textContent = `${evidenceDraftFiles.length}件 / ${(totalBytes / 1024 / 1024).toFixed(1)}MB`;
    empty.hidden = evidenceDraftFiles.length > 0;
    submitButton.disabled = evidenceDraftFiles.length === 0;
    submitButton.textContent = evidenceDraftFiles.length
      ? `${evidenceDraftFiles.length}件を提出してAI解析する`
      : "画像を選んでください";
    tray.innerHTML = evidenceDraftFiles.map((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      evidenceDraftObjectUrls.push(objectUrl);
      const preview = file.type === "application/pdf"
        ? `<span class="evidence-draft-pdf">PDF</span>`
        : `<img src="${objectUrl}" alt="${escapeHtml(file.name)}">`;
      return `
        <article class="evidence-draft-card" data-draft-index="${index}">
          <button type="button" class="evidence-draft-preview-button" data-preview-draft="${index}">
            ${preview}
            <span class="evidence-draft-number">${index + 1}</span>
          </button>
          <strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong>
          <div class="evidence-draft-actions">
            <button type="button" class="secondary" data-move-draft="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""} aria-label="前へ">←</button>
            <button type="button" class="secondary" data-move-draft="${index}" data-direction="1" ${index === evidenceDraftFiles.length - 1 ? "disabled" : ""} aria-label="後ろへ">→</button>
            <button type="button" class="warning" data-remove-draft="${index}">削除</button>
          </div>
        </article>
      `;
    }).join("");
    syncMasterInput();
    tray.querySelectorAll("[data-remove-draft]").forEach((button) => {
      button.addEventListener("click", () => {
        evidenceDraftFiles.splice(Number(button.dataset.removeDraft), 1);
        renderDraftTray();
      });
    });
    tray.querySelectorAll("[data-move-draft]").forEach((button) => {
      button.addEventListener("click", () => {
        const from = Number(button.dataset.moveDraft);
        const to = from + Number(button.dataset.direction);
        if (to < 0 || to >= evidenceDraftFiles.length) return;
        [evidenceDraftFiles[from], evidenceDraftFiles[to]] = [evidenceDraftFiles[to], evidenceDraftFiles[from]];
        renderDraftTray();
      });
    });
    tray.querySelectorAll("[data-preview-draft]").forEach((button) => {
      button.addEventListener("click", () => {
        const file = evidenceDraftFiles[Number(button.dataset.previewDraft)];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        evidenceDraftObjectUrls.push(objectUrl);
        previewTitle.textContent = file.name;
        const isPdf = file.type === "application/pdf";
        previewImage.hidden = isPdf;
        previewPdf.hidden = !isPdf;
        if (isPdf) previewPdf.src = objectUrl;
        else previewImage.src = objectUrl;
        previewDialog.showModal();
      });
    });
  };

  const addSelectedFiles = (fileList) => {
    const incoming = [...fileList];
    const existing = new Set(evidenceDraftFiles.map(fileIdentity));
    for (const file of incoming) {
      if (evidenceDraftFiles.length >= 10) break;
      if (!existing.has(fileIdentity(file))) {
        evidenceDraftFiles.push(file);
        existing.add(fileIdentity(file));
      }
    }
    renderDraftTray();
  };

  form.querySelectorAll("[data-open-source]").forEach((button) => {
    button.addEventListener("click", () => {
      ({ photo: photoInput, camera: cameraInput, document: documentInput })[button.dataset.openSource]?.click();
    });
  });
  [photoInput, cameraInput, documentInput].forEach((input) => {
    input.addEventListener("change", () => {
      addSelectedFiles(input.files);
      input.value = "";
    });
  });
  masterInput.addEventListener("change", () => {
    evidenceDraftFiles = [...masterInput.files];
    renderDraftTray();
  });
  form.querySelector("[data-close-draft-preview]").addEventListener("click", () => previewDialog.close());
  previewDialog.addEventListener("close", () => {
    previewImage.removeAttribute("src");
    previewPdf.removeAttribute("src");
  });
  form.addEventListener("reset", () => {
    evidenceDraftFiles = [];
    queueMicrotask(renderDraftTray);
  });
  form.addEventListener("submit", (event) => {
    onRandomEvidenceSubmit(event);
    if (!event.defaultPrevented) return;
  });
  renderDraftTray();
  container.appendChild(card);
}

function fileIdentity(file) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function sortBySavedAtDesc(a, b) {
  return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
}

function sortEvidenceRecords(records, roleKey, mode = "newest") {
  if (mode === "oldest") return records.sort((a, b) => -sortBySavedAtDesc(a, b));
  if (mode === "status") return records.sort((a, b) =>
    normalizedAnalysisStatus(a).localeCompare(normalizedAnalysisStatus(b)) || sortBySavedAtDesc(a, b)
  );
  if (mode === "newest") return records.sort(sortBySavedAtDesc);
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

function groupEvidenceRecords(records) {
  const groups = new Map();
  records.forEach((record) => {
    const id = record.submissionGroupId || `single_${recordKeyFallback(record)}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(record);
  });
  return [...groups.entries()].map(([id, groupRecords]) => {
    groupRecords.sort((a, b) => Number(a.pageNumber || 1) - Number(b.pageNumber || 1));
    const first = groupRecords[0];
    const statuses = groupRecords.map(normalizedAnalysisStatus);
    const status = statuses.includes("error") ? "error"
      : statuses.includes("processing") ? "processing"
        : statuses.includes("queued") ? "queued"
          : statuses.includes("needs_review") ? "needs_review"
            : "completed";
    return {
      id,
      records: groupRecords,
      subject: first.subject || "未分類",
      course: first.course || "教材不明",
      title: first.lesson || first.testType || formatSavedAt(first.submittedAt || first.savedAt),
      status
    };
  });
}

function recordKeyFallback(record) {
  return `${record.date || ""}_${record.missionId || ""}_${record.savedAt || ""}`;
}

function normalizedAnalysisStatus(record) {
  const status = record.aiAnalysisStatus || (record.firebaseSyncStatus === "synced" ? "queued" : "error");
  if (status === "processing" && isAnalysisStalled(record)) return "stalled";
  return status;
}

function statusIndicator(status) {
  const active = ["queued", "processing"].includes(status);
  const labels = {
    queued: "AI待機中",
    processing: "AI解析中",
    completed: "完了",
    needs_review: "要確認",
    error: "エラー",
    stalled: "停止中",
    cancelled: "中止済み"
  };
  return `<span class="evidence-status-pill ${escapeHtml(status)}${active ? " active" : ""}">
    <i aria-hidden="true"></i>${escapeHtml(labels[status] || "未解析")}
  </span>`;
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

function isFailedEvidenceRecord(record) {
  return record.firebaseSyncStatus === "error"
    || (!record.evidenceStoragePath && record.aiAnalysisStatus !== "completed");
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
