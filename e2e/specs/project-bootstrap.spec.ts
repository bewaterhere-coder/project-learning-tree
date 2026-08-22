import { expect, test } from "../fixtures/test.js";
import { mockGitHubRepository } from "../helpers/github.js";
import { createProject, openApp, selectedProjectId } from "../helpers/project.js";
import { OPENSPEC_GITHUB_FIXTURE } from "../../tests/fixtures/github-api.js";

test("creating a GitHub project opens onto top-level Questions (no Project Root)", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Vite", {
    source: "vitejs/vite",
    mockGitHub: false,
  });

  await expect(page.getByTestId("project-empty")).toHaveCount(0);
  await expect(page.locator('[data-project-root="true"]')).toHaveCount(0);

  const nodes = page.locator("[data-node-id]");
  await expect(nodes.first()).toBeVisible();
  const nodeCount = await nodes.count();
  expect(nodeCount).toBeGreaterThan(0);
  expect(nodeCount).toBeLessThanOrEqual(5);

  await expect(page.getByTestId("project-title")).toHaveText("vite");
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
  await expect(page.getByTestId("bootstrap-recommended")).toBeVisible();

  const recommended = page.locator("[data-recommended='true']");
  await expect(recommended.first()).toBeVisible();
  expect(await recommended.count()).toBeLessThanOrEqual(2);

  await page.getByTestId("bootstrap-recommended").locator("button").first().click();
  const focused = page.locator("[data-focus='true'][data-node-id]");
  await expect(focused).toBeVisible();
  const nodeId = await focused.getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();
  await page.getByTestId(`node-more-${nodeId}`).click();
  await page.getByTestId(`node-open-inspector-${nodeId}`).click();
  await expect(page.getByTestId("node-inspector")).toBeVisible();
  // Details panel is knowledge deposition — no Start Learning ceremony
  await expect(page.getByTestId("inspector-dod-heading")).toBeVisible();
  await expect(page.getByTestId("inspector-summary-heading")).toBeVisible();
  await expect(page.getByTestId("action-activate")).toHaveCount(0);
  await expect(page.locator("[data-on-stack='true']")).toHaveCount(0);
});

test("URL-only create defaults the project name from the GitHub URL", async ({
  page,
}) => {
  await mockGitHubRepository(page, OPENSPEC_GITHUB_FIXTURE);
  await openApp(page);
  const createOpen = page.getByTestId("project-create-open");
  if (await createOpen.isVisible()) {
    await createOpen.click();
  } else {
    await page.getByTestId("workspace-empty-create").click();
  }
  await expect(page.getByTestId("project-name-input")).toHaveCount(0);
  await page
    .getByTestId("project-source-input")
    .fill("https://github.com/Fission-AI/OpenSpec");
  await page.getByTestId("project-create-submit").click();
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
  await expect(page.locator('[data-project-root="true"]')).toHaveCount(0);
  await expect(page.getByTestId("project-list")).toContainText("OpenSpec");
  await expect(page.locator("[data-node-id]").first()).toBeVisible();
});

test("project details renames the sidebar without resetting questions", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Vite", {
    source: "vitejs/vite",
    mockGitHub: false,
  });
  const projectId = await selectedProjectId(page);
  const nodeCountBefore = await page.locator("[data-node-id]").count();
  expect(nodeCountBefore).toBeGreaterThan(0);

  await page.getByTestId(`project-actions-${projectId}`).click();
  await page.getByTestId(`project-edit-${projectId}`).click();
  await expect(page.getByTestId("project-details-form")).toBeVisible();
  await page.getByTestId("project-edit-name-input").fill("Vite Study");
  await page.getByTestId("project-edit-submit").click();

  await expect(page.getByTestId(`project-item-${projectId}`)).toContainText(
    "Vite Study",
  );
  expect(await page.locator("[data-node-id]").count()).toBe(nodeCountBefore);

  await page.reload();
  await page.getByTestId("shell").waitFor();
  await expect(page.getByTestId(`project-item-${projectId}`)).toContainText(
    "Vite Study",
  );
  expect(await page.locator("[data-node-id]").count()).toBe(nodeCountBefore);
});
