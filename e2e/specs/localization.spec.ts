import { expect, test } from "../fixtures/test.js";
import {
  addCoreQuestion,
  createProject,
  openApp,
  openSettings,
} from "../helpers/project.js";

test("switching to zh-CN keeps the core authoring workflow usable", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Locale Smoke");

  await openSettings(page);
  await page.getByTestId("locale-zh").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("sidebar-title")).toHaveText("项目");
  await expect(page.getByTestId("bootstrap-summary")).toBeVisible();

  await addCoreQuestion(
    page,
    "代理如何规划？",
    "能讲清主循环",
  );
  await expect(page.getByText("代理如何规划？")).toBeVisible();

  await openSettings(page);
  await page.getByTestId("locale-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await expect(page.getByTestId("sidebar-title")).toHaveText("Projects");
  await expect(page.getByText("代理如何规划？")).toBeVisible();
});
