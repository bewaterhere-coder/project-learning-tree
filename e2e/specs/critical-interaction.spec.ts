import { expect, test } from "../fixtures/test.js";
import { createProject, openApp } from "../helpers/project.js";

test("clicking a tree node focuses it without auto-opening Chat", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Inspector Smoke");

  const node = page.locator("[data-node-id]").first();
  await expect(node).toBeVisible();
  await node.click();

  await expect(node).toHaveAttribute("data-focus", "true");
  await expect(page.getByTestId("chat-panel")).toHaveCount(0);
});

test("More menu opens Inspector for the focused question", async ({ page }) => {
  await openApp(page);
  await createProject(page, "Details Smoke");

  const node = page.locator("[data-node-id]").first();
  await expect(node).toBeVisible();
  const question = (await node.locator(".node-question").innerText()).trim();
  const nodeId = await node.getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();

  await node.click();
  await page.getByTestId(`node-more-${nodeId}`).click();
  await page.getByTestId(`node-open-inspector-${nodeId}`).click();

  await expect(page.getByTestId("node-inspector")).toBeVisible();
  await expect(page.getByTestId("inspector-question")).toHaveText(question);
});
