import { expect, test } from "../fixtures/test.js";
import { createProject, openApp, openSettings } from "../helpers/project.js";

test("switching to zh-CN keeps node child authoring usable", async ({ page }) => {
  await openApp(page);
  await createProject(page, "Locale Smoke");

  await openSettings(page);
  await page.getByTestId("locale-zh").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("sidebar-title")).toHaveText("项目");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await expect(page.locator("[data-project-root=\"true\"]").first()).toBeVisible();

  const node = page.locator("[data-node-id]:not([data-project-root='true'])").first();
  await expect(node).toBeVisible();
  const nodeId = await node.getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();
  await node.click();
  await page.getByTestId(`node-add-child-${nodeId}`).click();
  await page.getByTestId("authoring-question").fill("代理如何规划？");
  await page.getByTestId("authoring-goal").fill("能讲清主循环");
  await page.getByTestId("authoring-submit").click();
  await expect(
    page.locator(".node-question", { hasText: "代理如何规划？" }),
  ).toBeVisible();

  await openSettings(page);
  await page.getByTestId("locale-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.getByTestId("sidebar-title")).toHaveText("Projects");
  await expect(
    page.locator(".node-question", { hasText: "代理如何规划？" }),
  ).toBeVisible();
});
