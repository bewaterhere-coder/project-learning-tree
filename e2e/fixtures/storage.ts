import type { LearningWorkspace } from "../../src/workspace/index.js";
import {
  serializeSemanticWorkspace,
  serializeWorkspacePreferences,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

const ORIGIN = "http://127.0.0.1:4173";

export interface StorageSeed {
  cookies: [];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

/**
 * Empty origin storage. Production boot then follows:
 * missing semantic store → createWorkspace([]) → Product Empty Workspace.
 */
export function emptyStorageState(): StorageSeed {
  return { cookies: [], origins: [] };
}

/**
 * Apply a workspace once at context creation via Playwright storageState.
 * Does not re-run on page.reload(), so UI mutations persist like production.
 */
export function storageStateForWorkspace(
  workspace: LearningWorkspace,
  options: { includePreferences?: boolean; origin?: string } = {},
): StorageSeed {
  const origin = options.origin ?? ORIGIN;
  const localStorage = [
    {
      name: WORKSPACE_SEMANTIC_KEY,
      value: JSON.stringify(serializeSemanticWorkspace(workspace)),
    },
  ];
  if (options.includePreferences) {
    localStorage.push({
      name: WORKSPACE_PREFERENCES_KEY,
      value: JSON.stringify(serializeWorkspacePreferences(workspace)),
    });
  }
  return {
    cookies: [],
    origins: [{ origin, localStorage }],
  };
}
