import { expect, test } from "../fixtures/test.js";
import { createProject, openApp, selectedProjectId } from "../helpers/project.js";

test("creates, reloads, archives, and restores a project", async ({ page }) => {
  await openApp(page);
  const projectName = await createProject(page, "E2E Lifecycle");

  const projectId = await selectedProjectId(page);
  await expect(page.getByTestId(`project-item-${projectId}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
  await expect(page.locator("[data-node-id]").first()).toBeVisible();
  await expect(page.getByTestId("project-title")).toHaveText(projectName);

  await page.reload();
  await page.getByTestId("shell").waitFor();
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
  await expect(page.locator("[data-node-id]").first()).toBeVisible();
  await expect(page.getByTestId(`project-item-${projectId}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.locator('[data-testid^="project-item-"]')).toHaveCount(1);

  await page.getByTestId(`project-actions-${projectId}`).click();
  await page.getByTestId(`project-archive-${projectId}`).click();
  await expect(page.getByTestId("workspace-empty")).toBeVisible();
  await expect(page.locator('[data-testid^="project-item-"]')).toHaveCount(0);

  await page.getByTestId("archived-toggle").click();
  await expect(page.getByTestId("archived-list")).toContainText(projectName);
  await page.getByTestId(`archived-actions-${projectId}`).click();
  await page.getByTestId(`project-restore-${projectId}`).click();

  await expect(page.getByTestId(`project-item-${projectId}`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
});

test("cancels and confirms permanent delete of an archived project", async ({ page }) => {
  await openApp(page);
  const projectName = await createProject(page, "E2E Delete Me");
  const projectId = await selectedProjectId(page);

  await page.getByTestId(`project-actions-${projectId}`).click();
  await expect(page.getByTestId(`project-delete-${projectId}`)).toHaveCount(0);
  await page.getByTestId(`project-archive-${projectId}`).click();
  await expect(page.getByTestId("workspace-empty")).toBeVisible();

  await page.getByTestId("archived-toggle").click();
  await page.getByTestId(`archived-actions-${projectId}`).click();
  await page.getByTestId(`project-delete-${projectId}`).click();
  await expect(page.getByTestId("delete-confirm-dialog")).toContainText(projectName);
  await page.getByTestId("delete-confirm-cancel").click();
  await expect(page.getByTestId("delete-confirm-dialog")).toHaveCount(0);
  await expect(page.getByTestId("archived-list")).toContainText(projectName);

  await page.getByTestId(`archived-actions-${projectId}`).click();
  await page.getByTestId(`project-delete-${projectId}`).click();
  await page.getByTestId("delete-confirm-submit").click();
  await expect(page.getByTestId("workspace-empty")).toBeVisible();
  await expect(page.getByTestId("archived-toggle")).toHaveCount(0);

  await page.reload();
  await page.getByTestId("shell").waitFor();
  await expect(page.getByTestId("workspace-empty")).toBeVisible();
  await expect(page.getByTestId("archived-toggle")).toHaveCount(0);
  await expect(page.locator('[data-testid^="project-item-"]')).toHaveCount(0);
});
