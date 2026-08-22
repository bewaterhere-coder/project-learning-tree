import { expect, test } from "../fixtures/test.js";
import { createProject, openApp, openSettings } from "../helpers/project.js";

test("switching to zh-CN keeps node child authoring usable", async ({ page }) => {
  await openApp(page);
  await createProject(page, "Locale Smoke");

  await openSettings(page);
  await page.getByTestId("locale-zh").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("sidebar-title")).toHaveText("项目");
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();

  const nodeId = await page.locator("[data-node-id]").first().getAttribute("data-node-id");
  expect(nodeId).toBeTruthy();
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
