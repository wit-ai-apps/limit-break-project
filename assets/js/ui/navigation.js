export function renderAppNavigation({
  container,
  views,
  activeView,
  onSelect
}) {
  if (!container) return;
  container.innerHTML = "";

  views.forEach((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `nav-button${view.id === activeView ? " active" : ""}`;
    button.textContent = view.label;
    button.addEventListener("click", () => onSelect(view.id));
    container.appendChild(button);
  });

  requestAnimationFrame(() => {
    const activeButton = container.querySelector(".nav-button.active");
    if (!activeButton || container.scrollWidth <= container.clientWidth) return;
    container.scrollTo({
      left: Math.max(0, activeButton.offsetLeft - (container.clientWidth - activeButton.offsetWidth) / 2),
      behavior: "auto"
    });
  });
}

export const navigationModule = {
  name: "navigation",
  phase: "active"
};
