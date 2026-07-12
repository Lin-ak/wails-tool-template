// Theme wiring. Tokens live in app.css (`:root` light, `.dark` overrides); this
// module decides whether `.dark` is on. Three modes — light / dark / system —
// persisted to localStorage; "system" follows the OS via matchMedia and keeps
// following it live. Call initTheme() once before the first render (main.tsx).

export type Theme = "light" | "dark" | "system";

const KEY = "theme";
const media = () => window.matchMedia?.("(prefers-color-scheme: dark)");

function systemPrefersDark(): boolean {
  return media()?.matches ?? false;
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function getTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  apply(theme);
}

// Apply the saved/system theme on boot and keep "system" in sync with the OS.
export function initTheme() {
  apply(getTheme());
  media()?.addEventListener("change", () => {
    if (getTheme() === "system") apply("system");
  });
}
