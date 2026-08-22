import { describe, expect, it } from "vitest";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  DEFAULT_THEME_RECIPE_ID,
  hydrateWorkspacePreferences,
  parseStoredPreferences,
  serializeWorkspacePreferences,
  updateShell,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_PREFERENCES_KEY_V1,
} from "../../src/workspace/index.js";

describe("theme recipe preference persistence", () => {
  it("serializes themeRecipeId with layout preferences", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const next = updateShell(workspace, { themeRecipeId: "nord" });
    const stored = serializeWorkspacePreferences(next);
    expect(stored.shell.themeRecipeId).toBe("nord");
  });

  it("defaults missing themeRecipeId on legacy v2 payloads", () => {
    const parsed = parseStoredPreferences({
      version: 2,
      shell: {
        projectSidebarOpen: true,
        projectSidebarWidth: 260,
        archivedPaneOpen: false,
        archivedPaneHeight: 168,
        locale: "en-US",
        colorScheme: "light",
      },
      projects: {},
    });
    expect(parsed?.shell.themeRecipeId).toBe(DEFAULT_THEME_RECIPE_ID);
  });

  it("falls back unknown themeRecipeId to the evaluation default", () => {
    const parsed = parseStoredPreferences({
      version: 2,
      shell: {
        projectSidebarOpen: true,
        projectSidebarWidth: 260,
        archivedPaneOpen: false,
        archivedPaneHeight: 168,
        locale: "en-US",
        colorScheme: "dark",
        themeRecipeId: "solarized",
      },
      projects: {},
    });
    expect(parsed?.shell.themeRecipeId).toBe("rose-pine");
    expect(parsed?.shell.colorScheme).toBe("dark");
  });

  it("defaults themeRecipeId when migrating v1 layout", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_PREFERENCES_KEY_V1]: JSON.stringify({
        version: 1,
        shell: {
          projectSidebarOpen: true,
          projectSidebarWidth: 260,
          locale: "zh-CN",
        },
        projects: {},
      }),
    });
    const hydrated = hydrateWorkspacePreferences(workspace, storage);
    expect(hydrated.shell.themeRecipeId).toBe(DEFAULT_THEME_RECIPE_ID);
    expect(hydrated.shell.locale).toBe("zh-CN");
  });

  it("restores a valid themeRecipeId from storage", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_PREFERENCES_KEY]: JSON.stringify({
        version: 2,
        shell: {
          ...workspace.shell,
          themeRecipeId: "everforest",
        },
        projects: {},
      }),
    });
    const hydrated = hydrateWorkspacePreferences(workspace, storage);
    expect(hydrated.shell.themeRecipeId).toBe("everforest");
  });
});
