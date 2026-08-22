import { test as base, expect, type ConsoleMessage } from "@playwright/test";
import { isAllowedConsoleError } from "../helpers/console.js";
import { emptyStorageState, storageStateForWorkspace, type StorageSeed } from "./storage.js";
import type { LearningWorkspace } from "../../src/workspace/index.js";

interface AcceptanceFixtures {
  workspaceSeed: LearningWorkspace | "empty";
}

/**
 * Standard acceptance test. Fresh context per test, console/pageerror
 * invariant, reduced motion, and optional one-shot storageState seeding.
 */
export const test = base.extend<AcceptanceFixtures>({
  workspaceSeed: ["empty", { option: true }],

  storageState: async ({ workspaceSeed }, use) => {
    const state: StorageSeed =
      workspaceSeed === "empty"
        ? emptyStorageState()
        : storageStateForWorkspace(workspaceSeed);
    await use(state);
  },

  page: async ({ page }, use) => {
    const unexpected: string[] = [];

    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== "error") {
        return;
      }
      const text = message.text();
      if (isAllowedConsoleError(text)) {
        return;
      }
      unexpected.push(`console.error: ${text}`);
    };
    const onPageError = (error: Error) => {
      unexpected.push(`pageerror: ${error.message}`);
    };
    const onCrash = () => {
      unexpected.push("page crashed");
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("crash", onCrash);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await use(page);

    expect(unexpected, unexpected.join("\n")).toEqual([]);
  },
});

export { expect };
