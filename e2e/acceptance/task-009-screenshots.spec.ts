import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { test, expect } from "../fixtures/test.js";
import { openApp, openSettings } from "../helpers/project.js";

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/milestones/task-009-canvas-simplification",
);
const runShots = process.env.E2E_ACCEPTANCE_SHOTS === "1";

async function closeInspectorIfOpen(page: Page): Promise<void> {
  const close = page.getByTestId("inspector-close");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

async function closeChatIfOpen(page: Page): Promise<void> {
  const close = page.getByTestId("chat-close");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

test.describe("TASK-009 canvas simplification acceptance screenshots", () => {
  test.skip(!runShots, "Set E2E_ACCEPTANCE_SHOTS=1 to generate acceptance screenshots");

  test.describe("demo tree scenes", () => {
    test.use({ workspaceSeed: createDemoWorkspaceFixture().workspace });

    test("captures canvas, selection, inspector, chat, and theme states", async ({
      page,
    }) => {
      mkdirSync(outDir, { recursive: true });
      const { projectA } = createDemoWorkspaceFixture();
      await openApp(page);

      await closeInspectorIfOpen(page);
      await closeChatIfOpen(page);
      const q1 = page.locator(`[data-node-id="${projectA.ids.q1}"]`);
      await expect(q1).toBeVisible();
      await expect(page.locator('[data-project-root="true"]')).toHaveCount(1);

      await page.screenshot({
        path: path.join(outDir, "01-canvas-no-selection.png"),
        fullPage: false,
      });

      await q1.click();
      await expect(q1).toHaveAttribute("data-focus", "true");
      await page.getByTestId(`node-more-${projectA.ids.q1}`).hover();
      await page.screenshot({
        path: path.join(outDir, "02-selected-node-contextual-actions.png"),
        fullPage: false,
      });

      await page.getByTestId(`node-more-${projectA.ids.q1}`).click();
      await page.getByTestId(`node-open-inspector-${projectA.ids.q1}`).click();
      await expect(page.getByTestId("node-inspector")).toBeVisible();
      await expect(page.getByTestId("inspector-dod-heading")).toBeVisible();
      await expect(page.getByTestId("inspector-summary-heading")).toBeVisible();
      await page.screenshot({
        path: path.join(outDir, "03-compact-inspector.png"),
        fullPage: false,
      });

      await page.getByTestId(`node-chat-${projectA.ids.q1}`).click();
      await expect(page.getByTestId("chat-panel")).toBeVisible();
      await expect(page.getByTestId("node-inspector")).toHaveCount(0);
      await page.screenshot({
        path: path.join(outDir, "04-chat-bound-to-question.png"),
        fullPage: false,
      });

      await closeChatIfOpen(page);
      await expect(
        page.getByTestId(`node-progress-${projectA.ids.q1}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`node-child-count-${projectA.ids.q2}`),
      ).toBeVisible();
      await q1.click();
      await page.screenshot({
        path: path.join(outDir, "05-node-child-count-progress.png"),
        fullPage: false,
      });

      await openSettings(page);
      await page.getByTestId("theme-light").click();
      await page.getByTestId("theme-recipe-rose-pine").click();
      await page.keyboard.press("Escape");
      await page.screenshot({
        path: path.join(outDir, "06-theme-rose-pine-light.png"),
        fullPage: false,
      });

      await openSettings(page);
      await page.getByTestId("theme-dark").click();
      await page.getByTestId("theme-recipe-nord").click();
      await page.keyboard.press("Escape");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.screenshot({
        path: path.join(outDir, "07-theme-nord-dark.png"),
        fullPage: false,
      });
    });
  });
});
