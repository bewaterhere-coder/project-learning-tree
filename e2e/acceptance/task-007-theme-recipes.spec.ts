import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import type { ThemeRecipeId } from "../../src/workspace/index.js";
import { test, expect } from "../fixtures/test.js";
import { openApp, openSettings } from "../helpers/project.js";

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/milestones/task-007-theme-recipes",
);
const runShots = process.env.E2E_ACCEPTANCE_SHOTS === "1";

const RECIPES: readonly ThemeRecipeId[] = [
  "rose-pine",
  "catppuccin",
  "everforest",
  "nord",
];
const SCHEMES = ["light", "dark"] as const;

async function prepareRepresentativeScene(page: Page): Promise<void> {
  const { projectA } = createDemoWorkspaceFixture();
  await page.locator(`[data-node-id="${projectA.ids.q2}"]`).waitFor();
  await page.locator(`[data-node-id="${projectA.ids.q2}"]`).click();
  const inspector = page.getByTestId("inspector-question");
  if (await inspector.isVisible().catch(() => false)) {
    const close = page.getByTestId("inspector-close");
    if (await close.isVisible().catch(() => false)) {
      await close.click();
    }
  }
}

async function applyRecipeAndScheme(
  page: Page,
  recipeId: ThemeRecipeId,
  scheme: "light" | "dark",
): Promise<void> {
  await openSettings(page);
  await page.getByTestId(`theme-${scheme}`).click();
  await page.getByTestId(`theme-recipe-${recipeId}`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-recipe",
    recipeId,
  );
  await page.getByTestId("shell").waitFor();
}

test.describe("TASK-007 theme recipe acceptance screenshots", () => {
  test.skip(!runShots, "Set E2E_ACCEPTANCE_SHOTS=1 to generate acceptance screenshots");

  test.describe("same demo tree scene", () => {
    test.use({ workspaceSeed: createDemoWorkspaceFixture().workspace });

    test("writes all eight recipe × scheme screenshots", async ({ page }) => {
      mkdirSync(outDir, { recursive: true });
      await openApp(page);
      await prepareRepresentativeScene(page);

      const written: string[] = [];
      for (const scheme of SCHEMES) {
        for (const recipeId of RECIPES) {
          await applyRecipeAndScheme(page, recipeId, scheme);
          const filename = `${scheme}-${recipeId}.png`;
          const target = path.join(outDir, filename);
          await page.screenshot({ path: target, fullPage: false });
          written.push(filename);
        }
      }

      expect(written).toEqual([
        "light-rose-pine.png",
        "light-catppuccin.png",
        "light-everforest.png",
        "light-nord.png",
        "dark-rose-pine.png",
        "dark-catppuccin.png",
        "dark-everforest.png",
        "dark-nord.png",
      ]);
    });
  });
});
