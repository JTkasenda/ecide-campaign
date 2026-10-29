/** Notification brève en bas de page (même rendu que le site d'origine). Côté client uniquement. */
let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, type: "info" | "error" = "info"): void {
  if (typeof document === "undefined") return;
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  const color = type === "error" ? "bg-red-600" : "bg-ecideDarkBlue";
  toast.className = `toast ${color} text-white font-bold px-6 py-4 shadow-card text-center`;
  toast.textContent = message;
  requestAnimationFrame(() => toast!.classList.add("is-visible"));
  clearTimeout(timer);
  timer = setTimeout(() => toast!.classList.remove("is-visible"), 3500);
}
