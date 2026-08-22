import type { Page } from "@playwright/test";
import { CONVERSATION_STORE_KEY } from "../../src/conversation/index.js";
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

export async function getConversationStore(page: Page): Promise<string | null> {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    CONVERSATION_STORE_KEY,
  );
}

export { CONVERSATION_STORE_KEY, WORKSPACE_PREFERENCES_KEY, WORKSPACE_SEMANTIC_KEY };
