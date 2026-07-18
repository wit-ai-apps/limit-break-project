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
