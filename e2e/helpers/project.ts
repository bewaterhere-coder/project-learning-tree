import { expect, type Page } from "@playwright/test";

export async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("shell").waitFor();
}

export async function createProject(page: Page, name: string): Promise<void> {
  const createOpen = page.getByTestId("project-create-open");
  if (await createOpen.isVisible()) {
    await createOpen.click();
  } else {
    await page.getByTestId("workspace-empty-create").click();
  }
  await page.getByTestId("project-name-input").fill(name);
  await page.getByTestId("project-create-submit").click();
  await expect(page.getByTestId("project-empty")).toBeVisible();
}

export async function selectedProjectId(page: Page): Promise<string> {
  const testId = await page
    .locator('[data-testid^="project-item-"][data-selected="true"]')
    .getAttribute("data-testid");
  if (testId === null) {
    throw new Error("No selected project row");
  }
  return testId.slice("project-item-".length);
}

export async function addCoreQuestion(
  page: Page,
  question: string,
  goal: string,
): Promise<void> {
  await page.getByTestId("project-empty-add-core").click();
  await page.getByTestId("core-question-input").fill(question);
  await page.getByTestId("core-goal-input").fill(goal);
  await page.getByTestId("core-question-submit").click();
  await expect(page.locator("[data-node-id]").first()).toBeVisible();
}

export async function openSettings(page: Page): Promise<void> {
  const menu = page.getByTestId("settings-menu");
  if (await menu.isVisible()) {
    return;
  }
  await page.getByTestId("settings-open").click();
  await expect(menu).toBeVisible();
}
