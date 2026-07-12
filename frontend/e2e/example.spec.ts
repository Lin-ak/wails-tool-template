import { expect, test } from "@playwright/test";

// Drives the real app on the mocked bridge (e2e.html). Rewrite per feature; the
// point is the pattern — a Wails frontend, fully exercised in a browser.

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e.html");
});

test("theme toggle switches the root .dark class", async ({ page }) => {
  const html = page.locator("html");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test("safe-write loop: preview → confirm diff → apply → verified", async ({
  page,
}) => {
  await page.locator('input[name="host"]').fill("10.0.0.10");
  await page.locator('input[name="port"]').fill("443");
  await page.locator('input[name="secret"]').fill("s3cr3t");
  await page.getByRole("button", { name: "Preview changes" }).click();

  // Confirm dialog shows the whitelisted diff from the mocked preflight.
  // ConfirmDialog is a RAC Dialog with role="alertdialog".
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("30")).toBeVisible();
  await expect(dialog.getByText("60")).toBeVisible();

  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Applied and verified by read-back")).toBeVisible(
    { timeout: 10_000 },
  );
});

test("multi-step apply streams progress and finishes", async ({ page }) => {
  const panel = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Multi-step apply" });
  // confirm-first is on by default → dialog, then apply.
  await panel.getByRole("button", { name: "Apply", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  await expect(panel.getByText("Applied.", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
});
