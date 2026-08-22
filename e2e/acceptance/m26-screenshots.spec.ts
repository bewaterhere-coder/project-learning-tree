import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { test } from "../fixtures/test.js";
import {
  addCoreQuestion,
  createProject,
  openApp,
  openSettings,
} from "../helpers/project.js";

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/milestones/m2.6-screenshots",
);
const runShots = process.env.E2E_ACCEPTANCE_SHOTS === "1";

async function panFlow(page: Page, dx: number): Promise<void> {
  const pane = page.locator(".react-flow__pane");
  await pane.waitFor();
  const box = await pane.boundingBox();
  if (!box) {
    return;
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 12 });
  await page.mouse.up();
}

async function dismissIfVisible(page: Page, testId: string): Promise<void> {
  const locator = page.getByTestId(testId);
  if (await locator.isVisible()) {
    await locator.click();
  }
}

test.describe("M2.6 screenshot acceptance", () => {
  test.skip(!runShots, "Set E2E_ACCEPTANCE_SHOTS=1 to generate acceptance screenshots");

  test("01 empty workspace light", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("workspace-empty").waitFor();
    await page.screenshot({
      path: path.join(outDir, "01-empty-workspace-light.png"),
      fullPage: false,
    });
  });

  test("02 project roots light", async ({ page }) => {
    await openApp(page);
    await createProject(page, "Visual Roots");
    await addCoreQuestion(page, "How does a tree grow?", "Explain root growth");
    if (await page.getByTestId("add-core-question").isVisible()) {
      await page.getByTestId("add-core-question").click();
    }
    await page.getByTestId("core-question-input").fill("What is a node?");
    await page.getByTestId("core-goal-input").fill("Name the parts of a node");
    await page.getByTestId("core-question-submit").click();
    await dismissIfVisible(page, "inspector-close");
    await dismissIfVisible(page, "core-question-cancel");
    await page.screenshot({
      path: path.join(outDir, "02-project-roots-light.png"),
      fullPage: false,
    });
  });

  test.describe("demo tree", () => {
    test.use({ workspaceSeed: createDemoWorkspaceFixture().workspace });

    test("03 active stack", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q1}"]`).click();
      await dismissIfVisible(page, "inspector-close");
      await page.screenshot({
        path: path.join(outDir, "03-active-stack-light.png"),
        fullPage: false,
      });
    });

    test("04 focused node details", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q2}"]`).click();
      await page.getByTestId("inspector-question").waitFor();
      await panFlow(page, -280);
      await page.screenshot({
        path: path.join(outDir, "04-focused-details-light.png"),
        fullPage: false,
      });
    });

    test("05 blocked node", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q1}"]`).click();
      await page.getByTestId("inspector-blocked").waitFor();
      await page.screenshot({
        path: path.join(outDir, "05-blocked-node-light.png"),
        fullPage: false,
      });
    });

    test("06 parked and closed", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q12}"]`).click();
      await dismissIfVisible(page, "inspector-close");
      await page.screenshot({
        path: path.join(outDir, "06-parked-closed-light.png"),
        fullPage: false,
      });
    });

    test("07 dark", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q2}"]`).click();
      await openSettings(page);
      await page.getByTestId("theme-dark").click();
      await page.keyboard.press("Escape");
      await panFlow(page, -280);
      await page.getByTestId("shell").waitFor();
      await page.screenshot({
        path: path.join(outDir, "07-dark.png"),
        fullPage: false,
      });
    });

    test("08 zh-CN", async ({ page }) => {
      await openApp(page);
      const { projectA } = createDemoWorkspaceFixture();
      await page.locator(`[data-node-id="${projectA.ids.q2}"]`).click();
      await openSettings(page);
      await page.getByTestId("locale-zh").click();
      await page.keyboard.press("Escape");
      await panFlow(page, -280);
      await page.locator("html[lang='zh-CN']").waitFor();
      await page.screenshot({
        path: path.join(outDir, "08-zh-CN.png"),
        fullPage: false,
      });
    });
  });
});
