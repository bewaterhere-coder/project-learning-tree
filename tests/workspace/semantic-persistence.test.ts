import { describe, expect, it } from "vitest";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applyNodeDragStop,
  applySelectedCommand,
  archiveProject,
  createMemoryPreferenceStorage,
  createWorkspace,
  createWorkspaceProject,
  hydrateSemanticWorkspace,
  hydrateWorkspacePreferences,
  parseSemanticWorkspace,
  restoreProject,
  saveSemanticWorkspace,
  saveWorkspacePreferences,
  selectProject,
  serializeSemanticWorkspace,
  serializeWorkspacePreferences,
  setSelectedViewport,
  updateSelectedLayout,
  updateShell,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_PREFERENCES_KEY_V1,
  WORKSPACE_SEMANTIC_KEY,
  WORKSPACE_THEME_HINT_KEY,
  writeThemeHint,
  reconcileThemeHint,
} from "../../src/workspace/index.js";

function trackingStorage(initial: Record<string, string> = {}) {
  const inner = createMemoryPreferenceStorage(initial);
  const writes: string[] = [];
  return {
    getItem: (key: string) => inner.getItem(key),
    setItem: (key: string, value: string) => {
      writes.push(key);
      inner.setItem(key, value);
    },
    writes,
    inner,
  };
}

describe("semantic persistence", () => {
  it("round-trips snapshots, archive flags, and selection without layout", () => {
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    const payload = JSON.stringify(serializeSemanticWorkspace(archived));
    expect(payload).not.toContain("nodePositions");
    expect(payload).not.toContain("inspectorWidth");
    expect(payload).not.toContain("sidebarWidth");
    expect(payload).not.toContain("colorScheme");
    expect(payload).not.toContain("locale");
    expect(payload).not.toContain("archivedPaneHeight");
    expect(payload).not.toContain("archivedPaneOpen");
    const parsed = parseSemanticWorkspace(JSON.parse(payload));
    expect(parsed?.projects[1]?.archived).toBe(true);
    expect(parsed?.projects[1]?.snapshot.project.id).toBe(
      projectB.snapshot.project.id,
    );
    expect(parsed?.selectedProjectId).toBe(workspace.selectedProjectId);
  });

  it("falls back to an empty workspace when the store is missing or corrupt", () => {
    expect(hydrateSemanticWorkspace(createMemoryPreferenceStorage()).projects).toEqual(
      [],
    );
    const corrupt = createMemoryPreferenceStorage({
      [WORKSPACE_SEMANTIC_KEY]: "{nope",
    });
    expect(hydrateSemanticWorkspace(corrupt).selectedProjectId).toBeNull();
    const invalid = createMemoryPreferenceStorage({
      [WORKSPACE_SEMANTIC_KEY]: JSON.stringify({ version: 99, projects: [] }),
    });
    expect(hydrateSemanticWorkspace(invalid).projects).toEqual([]);
  });

  it("writes the semantic store on create, archive, restore, select, and Domain success", () => {
    const storage = trackingStorage();
    let workspace = createWorkspace([]);
    workspace = createWorkspaceProject(
      workspace,
      { name: "One" },
      sequentialFixturePorts(700),
    );
    saveSemanticWorkspace(storage, workspace);
    const created = workspace;
    workspace = archiveProject(workspace, created.projects[0]!.projectId);
    saveSemanticWorkspace(storage, workspace);
    workspace = restoreProject(workspace, created.projects[0]!.projectId);
    saveSemanticWorkspace(storage, workspace);
    const second = createWorkspaceProject(
      workspace,
      { name: "Two" },
      sequentialFixturePorts(800),
    );
    saveSemanticWorkspace(storage, second);
    const switched = selectProject(second, created.projects[0]!.projectId);
    saveSemanticWorkspace(storage, switched);
    const focused = applySelectedCommand(switched, {
      type: "addCoreQuestion",
      question: "Q",
      goal: "G",
    }, sequentialFixturePorts(900));
    saveSemanticWorkspace(storage, focused);
    expect(storage.writes.every((key) => key === WORKSPACE_SEMANTIC_KEY)).toBe(true);
    expect(storage.writes.length).toBe(6);
  });

  it("does not require a semantic write for layout-only mutations", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = trackingStorage();
    saveSemanticWorkspace(storage, workspace);
    storage.writes.length = 0;
    applyNodeDragStop(workspace, { [projectA.ids.q1]: { x: 1, y: 2 } });
    setSelectedViewport(workspace, { x: 3, y: 4, zoom: 1.1 });
    updateSelectedLayout(workspace, { inspectorWidth: 360 });
    updateShell(workspace, { locale: "zh-CN", colorScheme: "dark" });
    expect(storage.writes).toEqual([]);
  });
});

describe("preference migration and theme hint", () => {
  it("keeps DomainSnapshot out of preferences", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const payload = JSON.stringify(serializeWorkspacePreferences(workspace));
    expect(payload).not.toContain("\"snapshot\"");
    expect(payload).not.toContain("rootNodeIds");
    expect(payload).not.toContain("childIds");
    expect(payload).not.toContain("blockingChildIds");
  });

  it("migrates v1 layout and defaults colorScheme to system", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_PREFERENCES_KEY_V1]: JSON.stringify({
        version: 1,
        shell: {
          projectSidebarOpen: false,
          projectSidebarWidth: 300,
          locale: "zh-CN",
        },
        projects: {
          [projectA.snapshot.project.id]: {
            nodePositions: { [projectA.ids.q1]: { x: 9, y: 8 } },
            viewport: { x: 1, y: 2, zoom: 1.1 },
            inspectorOpen: true,
            inspectorWidth: 360,
          },
        },
      }),
    });
    const hydrated = hydrateWorkspacePreferences(workspace, storage);
    expect(hydrated.shell.locale).toBe("zh-CN");
    expect(hydrated.shell.colorScheme).toBe("system");
    expect(hydrated.shell.projectSidebarWidth).toBe(300);
    expect(hydrated.shell.archivedPaneOpen).toBe(false);
    expect(hydrated.shell.archivedPaneHeight).toBe(168);
    expect(hydrated.projects[0]?.layout.nodePositions[projectA.ids.q1]).toEqual({
      x: 9,
      y: 8,
    });
  });

  it("lets preferences win over a stale theme hint", () => {
    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_THEME_HINT_KEY]: "dark",
    });
    expect(reconcileThemeHint(storage, "light", false)).toBe("light");
    expect(storage.getItem(WORKSPACE_THEME_HINT_KEY)).toBe("light");
    writeThemeHint(storage, "system", true);
    expect(storage.getItem(WORKSPACE_THEME_HINT_KEY)).toBe("dark");
    writeThemeHint(storage, "system", false);
    expect(storage.getItem(WORKSPACE_THEME_HINT_KEY)).toBe("light");
  });

  it("saves current preferences to the v2 key", () => {
    const { workspace } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    saveWorkspacePreferences(storage, workspace);
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toContain("\"colorScheme\"");
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toContain("\"archivedPaneHeight\"");
  });

  it("rejects preference-only pane fields in the semantic store", () => {
    expect(
      parseSemanticWorkspace({
        version: 1,
        selectedProjectId: null,
        projects: [],
        archivedPaneHeight: 200,
      }),
    ).toBeUndefined();
    expect(
      parseSemanticWorkspace({
        version: 1,
        selectedProjectId: null,
        projects: [],
        archivedPaneOpen: true,
      }),
    ).toBeUndefined();
  });
});
