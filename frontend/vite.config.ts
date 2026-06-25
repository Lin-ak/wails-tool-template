import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tailwind v4 is a first-class Vite plugin — no PostCSS config, no tailwind.config.js.
// Design tokens and plugins live in src/app.css (@theme / @plugin).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
