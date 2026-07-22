export function renderDevDrawerPanel({
  versionBadge,
  devVersionBadge,
  devVersionList,
  appVersion,
  releaseNotes,
  escapeHtml
}) {
  if (versionBadge) versionBadge.textContent = appVersion;
  if (devVersionBadge) devVersionBadge.textContent = appVersion;
  renderDevDrawerVersions({ devVersionList, releaseNotes, escapeHtml });
}

export function renderDevDrawerVersions({ devVersionList, releaseNotes, escapeHtml }) {
  if (!devVersionList) return;

  const notes = Array.isArray(releaseNotes) ? releaseNotes : [];

  devVersionList.innerHTML = notes.map((note) => `
    <section class="dev-version-item">
      <strong>${escapeHtml(note.version)} / ${escapeHtml(note.date)} / ${escapeHtml(note.title)}</strong>
      <ul>
        ${(note.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `).join("");
}

export function openDevDrawerPanel({ drawer, backdrop }) {
  if (!drawer || !backdrop) return;

  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  });
}

export function closeDevDrawerPanel({ drawer, backdrop }) {
  if (!drawer || !backdrop) return;

  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!drawer.classList.contains("open")) {
      drawer.hidden = true;
      backdrop.hidden = true;
    }
  }, 230);
}
