import { describe, expect, it } from "vitest";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { VITE_GITHUB_FIXTURE } from "../fixtures/github-api.js";
import { createFixtureRepositoryEvidenceProvider } from "../fixtures/repository-evidence.js";
import {
  applyNodeDragStop,
  applySelectedCommand,
  archiveProject,
  createMemoryPreferenceStorage,
  createWorkspace,
  createWorkspaceProject,
  deleteArchivedProject,
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
  it("round-trips bootstrap records with the generated first layer", async () => {
    const created = await createWorkspaceProject(
      createWorkspace([]),
      {
        name: "Vite",
        source: "vitejs/vite",
      },
      {
        ports: sequentialFixturePorts(1_000),
        provider: createFixtureRepositoryEvidenceProvider(VITE_GITHUB_FIXTURE),
      },
    );
    const payload = serializeSemanticWorkspace(created);
    const parsed = parseSemanticWorkspace(JSON.parse(JSON.stringify(payload)));
    expect(parsed?.projects[0]?.snapshot.pass.rootNodeIds.length).toBeGreaterThan(0);
    expect(parsed?.projects[0]?.bootstrap).toEqual(created.projects[0]?.bootstrap);
    expect(parsed?.projects[0]?.bootstrap?.evidenceStatus).toBe("verified");
    expect(parsed?.projects[0]?.bootstrap?.canonicalContractId).toBe(
      "coco-project-learning-contract",
    );
    expect(parsed?.projects[0]?.bootstrap?.frameworkId).toBe("learning-tree-coco-adapter");
  });

  it("hydrates old v1 bootstrap records that lack adapter identity and evidenceStatus", async () => {
    const created = await createWorkspaceProject(
      createWorkspace([]),
      { name: "Legacy" },
      sequentialFixturePorts(1_100),
    );
    const project = created.projects[0];
    if (!project) {
      throw new Error("expected project");
    }
    const payload = serializeSemanticWorkspace(created);
    const raw = JSON.parse(JSON.stringify(payload)) as {
      projects: Array<{ bootstrap?: Record<string, unknown> }>;
    };
    raw.projects[0]!.bootstrap = {
      frameworkId: "coco-project-learning",
      frameworkVersion: "v1",
      positioning: project.bootstrap?.positioning,
      learningValue: project.bootstrap?.learningValue,
      systemModel: project.bootstrap?.systemModel,
      recommendedFocusNodeIds: project.bootstrap?.recommendedFocusNodeIds,
      generatedQuestionCount: project.bootstrap?.generatedQuestionCount,
      extraFutureField: "keep-the-project",
    };
    const parsed = parseSemanticWorkspace(raw);
    expect(parsed?.projects[0]?.projectId).toBe(project.projectId);
    expect(parsed?.projects[0]?.bootstrap?.frameworkId).toBe("coco-project-learning");
    expect(parsed?.projects[0]?.bootstrap?.canonicalContractId).toBe(
      "coco-project-learning-contract",
    );
    expect(parsed?.projects[0]?.bootstrap?.evidenceStatus).toBe("fallback");
    expect(parsed?.projects[0]?.bootstrap).not.toHaveProperty("extraFutureField");
  });

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
    expect(parsed?.projects[0]?.bootstrap).toEqual(archived.projects[0]?.bootstrap);
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

  it("writes the semantic store on create, archive, restore, select, and Domain success", async () => {
    const storage = trackingStorage();
    let workspace = createWorkspace([]);
    workspace = await createWorkspaceProject(
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
    const second = await createWorkspaceProject(
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

  it("persists permanent delete and does not resurrect the project on reload", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = trackingStorage();
    const archived = archiveProject(workspace, projectB.snapshot.project.id);
    const deleted = deleteArchivedProject(archived, projectB.snapshot.project.id);
    expect(deleted.deleted).toBe(true);
    if (deleted.deleted !== true) {
      throw new Error("expected deletion");
    }
    saveSemanticWorkspace(storage, deleted.workspace);
    const reloaded = hydrateSemanticWorkspace(storage);
    expect(reloaded.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
    ]);
    expect(
      reloaded.projects.some(
        (project) => project.projectId === projectB.snapshot.project.id,
      ),
    ).toBe(false);
    expect(reloaded.projects[0]?.snapshot).toEqual(archived.projects[0]?.snapshot);
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
    expect(hydrated.shell.themeRecipeId).toBe("rose-pine");
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
