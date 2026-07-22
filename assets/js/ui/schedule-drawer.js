import { countdownLabel, dateDaysUntil, todayJapanKey } from "../utils/countdown.js";
import { escapeHtml } from "../utils/helpers.js";

export function renderCountdownCards(countdownGrid, targets) {
  if (!countdownGrid) return;

  const sorted = [...targets]
    .filter((target) => target?.countdown_target)
    .sort((a, b) => dateDaysUntil(a.countdown_target) - dateDaysUntil(b.countdown_target))
    .slice(0, 3);

  countdownGrid.innerHTML = "";
  sorted.forEach((exam) => {
    const days = dateDaysUntil(exam.countdown_target);
    const card = document.createElement("section");
    card.className = "countdown-card glass";
    card.innerHTML = `
      <h2>${escapeHtml(countdownLabel(exam))}</h2>
      <strong>あと${days}日</strong>
      <span>${escapeHtml(exam.date_start || "")}${exam.source === "custom" ? " / 短期目標" : ""}</span>
    `;
    countdownGrid.appendChild(card);
  });
}

export function renderScheduleDrawerPanel({ countdownsElement, calendarElement, targets }) {
  if (!countdownsElement || !calendarElement) return;

  const sortedTargets = [...targets]
    .filter((target) => target?.countdown_target)
    .sort((a, b) => dateDaysUntil(a.countdown_target) - dateDaysUntil(b.countdown_target));

  countdownsElement.innerHTML = sortedTargets.slice(0, 6).map((exam) => {
    const days = dateDaysUntil(exam.countdown_target);
    return `
      <div class="schedule-countdown-item">
        <span>${escapeHtml(countdownLabel(exam))}</span>
        <strong>あと${days}日</strong>
      </div>
    `;
  }).join("");

  renderScheduleCalendar(calendarElement, sortedTargets);
}

export function openScheduleDrawerPanel({ drawer, backdrop, opener, onBeforeOpen }) {
  if (!drawer || !backdrop) return;
  onBeforeOpen?.();
  drawer.hidden = false;
  backdrop.hidden = false;
  opener?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  });
}

export function closeScheduleDrawerPanel({ drawer, backdrop, opener }) {
  if (!drawer || !backdrop) return;
  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  opener?.setAttribute("aria-expanded", "false");
  drawer.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!drawer.classList.contains("open")) {
      drawer.hidden = true;
      backdrop.hidden = true;
    }
  }, 230);
}

function renderScheduleCalendar(calendarElement, targets) {
  const today = todayJapanKey();
  const [year, month] = today.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const targetMap = new Map();

  targets.forEach((target) => {
    if (!target.countdown_target) return;
    const names = targetMap.get(target.countdown_target) || [];
    names.push(countdownLabel(target).replace("まで", ""));
    targetMap.set(target.countdown_target, names);
  });

  const headings = ["日", "月", "火", "水", "木", "金", "土"].map(
    (day) => `<div class="calendar-day is-heading">${day}</div>`
  );
  const blanks = Array.from({ length: firstDay.getDay() }, () => `<div class="calendar-day is-empty"></div>`);
  const days = Array.from({ length: lastDay.getDate() }, (_, index) => {
    const day = index + 1;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const labels = targetMap.get(key) || [];
    const classes = [
      "calendar-day",
      key === today ? "is-today" : "",
      labels.length ? "has-target" : ""
    ].filter(Boolean).join(" ");
    const labelHtml = labels.slice(0, 1).map((label) => `<small>${escapeHtml(label)}</small>`).join("");
    return `<div class="${classes}">${day}${labelHtml}</div>`;
  });

  calendarElement.innerHTML = [...headings, ...blanks, ...days].join("");
}
