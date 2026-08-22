import { expect, test } from "../fixtures/test.js";
import { mockGitHubRepository } from "../helpers/github.js";
import { createProject, openApp } from "../helpers/project.js";

test("creating a GitHub project generates a bounded, project-specific first layer", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Vite", { source: "vitejs/vite" });

  await expect(page.getByTestId("project-empty")).toHaveCount(0);
  const nodes = page.locator("[data-node-id]");
  await expect(nodes.first()).toBeVisible();
  expect(await nodes.count()).toBeGreaterThan(0);
  expect(await nodes.count()).toBeLessThanOrEqual(5);
  await expect(page.getByText(/Vite/).first()).toBeVisible();
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
