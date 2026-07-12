import { defineConfig } from "@playwright/test";

// E2E against the real app on the mocked Wails bridge (e2e.html). Port 5401 is
// e2e-only so runs never collide with a dev server or the browser preview.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5401",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev -- --port 5401 --strictPort",
    url: "http://localhost:5401/e2e.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
