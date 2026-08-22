import { expect, test } from "../fixtures/test.js";
import { createProject, openApp } from "../helpers/project.js";

const runVisual = Boolean(process.env.CI) || process.env.E2E_VISUAL === "1";

test.describe("visual surfaces", () => {
  test.skip(!runVisual, "Linux-canonical snapshots; set E2E_VISUAL=1 to run locally");

  test("Product Empty Workspace", async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId("workspace-empty")).toBeVisible();
    await expect(page.getByTestId("shell")).toHaveScreenshot("empty-workspace.png");
  });

  test("product shell after project creation, before the tree canvas", async ({
    page,
  }) => {
    await openApp(page);
    await createProject(page, "Visual Shell");
    await expect(page.getByTestId("project-empty")).toBeVisible();
    await expect(page.locator("[data-node-id]")).toHaveCount(0);
    await expect(page.getByTestId("shell")).toHaveScreenshot("project-empty-shell.png");
  });
});
