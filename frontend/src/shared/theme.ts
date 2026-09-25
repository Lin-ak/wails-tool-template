// Theme wiring. Tokens live in app.css (`:root` light, `.dark` overrides); this
// module turns `.dark` on while the OS is in dark mode and keeps following it
// live. There is deliberately no in-app override: Apple's HIG says apps follow
// the system appearance setting. Call initTheme() once before the first render
// (main.tsx).

const media = () => window.matchMedia?.("(prefers-color-scheme: dark)");

function apply() {
  document.documentElement.classList.toggle("dark", media()?.matches ?? false);
}

// Apply the OS appearance on boot and keep following it.
export function initTheme() {
  apply();
  media()?.addEventListener("change", apply);
}
