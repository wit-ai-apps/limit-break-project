export function renderAppNavigation({
  container,
  views,
  activeView,
  onSelect,
  onOpenDevDrawer
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

  const devButton = document.createElement("button");
  devButton.type = "button";
  devButton.className = "nav-button";
  devButton.textContent = "更新内容";
  devButton.setAttribute("aria-controls", "devDrawer");
  devButton.addEventListener("click", onOpenDevDrawer);
  container.appendChild(devButton);
}

export const navigationModule = {
  name: "navigation",
  phase: "active"
};
