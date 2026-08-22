import { expect, test } from "../fixtures/test.js";
import { mockGitHubRepository } from "../helpers/github.js";
import { createProject, openApp, selectedProjectId } from "../helpers/project.js";
import { OPENSPEC_GITHUB_FIXTURE } from "../../tests/fixtures/github-api.js";

test("creating a GitHub project generates a hierarchical first layer under a Project Root", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Vite", { source: "vitejs/vite" });

  await expect(page.getByTestId("project-empty")).toHaveCount(0);
  const root = page.locator('[data-project-root="true"]');
  await expect(root).toHaveCount(1);
  await expect(root.first()).toContainText("Vite");

  const nodes = page.locator("[data-node-id]");
  await expect(nodes.first()).toBeVisible();
  const nodeCount = await nodes.count();
  // Project Root + up to 5 Core Questions
  expect(nodeCount).toBeGreaterThan(1);
  expect(nodeCount).toBeLessThanOrEqual(6);

  const edges = page.locator(".react-flow__edge");
  expect(await edges.count()).toBeGreaterThan(0);

  const rootBox = await root.first().boundingBox();
  const child = page.locator('[data-node-id]:not([data-project-root="true"])').first();
  const childBox = await child.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(childBox).not.toBeNull();
  if (rootBox && childBox) {
    expect(childBox.y).toBeGreaterThan(rootBox.y);
  }

  await expect(page.getByTestId("bootstrap-summary")).toContainText("Vite");
  await expect(page.getByTestId("bootstrap-recommended")).toBeVisible();
  await page.getByTestId("bootstrap-summary").locator("summary").click();
  await expect(page.getByTestId("bootstrap-evidence-status")).toContainText(
    "GitHub metadata, README, and repository root",
  );
  await expect(page.getByText(/plugin pipeline|dev server/i).first()).toBeVisible();

  const recommended = page.locator("[data-recommended='true']");
  await expect(recommended.first()).toBeVisible();
  expect(await recommended.count()).toBeLessThanOrEqual(2);

  await page.getByTestId("bootstrap-recommended").locator("button").first().click();
  await expect(page.getByTestId("node-inspector")).toBeVisible();
  await expect(page.getByTestId("inspector-lifecycle")).toHaveText("To start");
  await expect(page.locator("[data-on-stack='true']")).toHaveCount(0);
});

test("source-only create defaults the project name from the GitHub URL", async ({
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
  await page
    .getByTestId("project-source-input")
    .fill("https://github.com/Fission-AI/OpenSpec");
  await page.getByTestId("project-create-submit").click();
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();
  await expect(page.locator('[data-project-root="true"]')).toContainText("OpenSpec");
  await expect(page.getByTestId("project-list")).toContainText("OpenSpec");
});

test("edit project renames sidebar and Project Root without resetting children", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Vite", { source: "vitejs/vite" });
  const projectId = await selectedProjectId(page);
  const childCountBefore = await page
    .locator('[data-node-id]:not([data-project-root="true"])')
    .count();
  expect(childCountBefore).toBeGreaterThan(0);

  await page.getByTestId(`project-actions-${projectId}`).click();
  await page.getByTestId(`project-edit-${projectId}`).click();
  await page.getByTestId("project-edit-name-input").fill("Vite Study");
  await page.getByTestId("project-edit-submit").click();

  await expect(page.getByTestId(`project-item-${projectId}`)).toContainText(
    "Vite Study",
  );
  await expect(page.locator('[data-project-root="true"]')).toContainText(
    "Vite Study",
  );
  expect(
    await page.locator('[data-node-id]:not([data-project-root="true"])').count(),
  ).toBe(childCountBefore);

  await page.reload();
  await page.getByTestId("shell").waitFor();
  await expect(page.getByTestId(`project-item-${projectId}`)).toContainText(
    "Vite Study",
  );
  await expect(page.locator('[data-project-root="true"]')).toContainText(
    "Vite Study",
  );
  expect(
    await page.locator('[data-node-id]:not([data-project-root="true"])').count(),
  ).toBe(childCountBefore);
  expect(await page.locator(".react-flow__edge").count()).toBeGreaterThan(0);
});
