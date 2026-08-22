import type { Page } from "@playwright/test";
import {
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

export async function getSemanticStore(page: Page): Promise<string | null> {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKSPACE_SEMANTIC_KEY,
  );
}

export async function getPreferenceStore(page: Page): Promise<string | null> {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKSPACE_PREFERENCES_KEY,
  );
}

export { WORKSPACE_PREFERENCES_KEY, WORKSPACE_SEMANTIC_KEY };
