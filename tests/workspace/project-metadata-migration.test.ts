import { describe, expect, it } from "vitest";
import {
  migratedProjectRootId,
  PROJECT_ROOT_ORIENTATION_GOAL,
  type DomainSnapshot,
} from "../../src/domain/index.js";
import {
  createMemoryPreferenceStorage,
  createWorkspace,
  defaultProjectLayout,
  hydrateWorkspacePreferences,
  loadSemanticWorkspaceWithMigration,
  saveWorkspacePreferences,
  SEMANTIC_VERSION,
  updateSelectedLayout,
  updateWorkspaceProjectMetadata,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";

function legacyRootedStoredWorkspace(): {
  version: typeof SEMANTIC_VERSION;
  selectedProjectId: string;
  projects: Array<{
    projectId: string;
    archived: boolean;
    snapshot: DomainSnapshot;
  }>;
} {
  const projectId = "proj-legacy";
  const passId = "pass-legacy";
  const rootId = migratedProjectRootId(projectId);
  return {
    version: SEMANTIC_VERSION,
    selectedProjectId: projectId,
    projects: [
      {
        projectId,
        archived: false,
        snapshot: {
          project: {
            id: projectId,
            name: "Stored Legacy",
            passIds: [passId],
          },
          pass: {
            id: passId,
            projectId,
            status: "in_progress",
            rootNodeIds: [rootId],
            projectRootNodeId: rootId,
            activeStack: [rootId, "legacy-q1"],
            currentFocusNodeId: rootId,
            frontier: [],
          },
          nodes: {
            [rootId]: {
              id: rootId,
              question: "Stored Legacy",
              goal: PROJECT_ROOT_ORIENTATION_GOAL,
              lifecycle: "active",
              targetDepth: "L1",
              definitionOfDone: [],
              evidence: [],
              childIds: ["legacy-q1", "legacy-q2"],
              blockingChildIds: [],
              conversationThreadId: `${rootId}:thread`,
              reopenHistory: [],
            },
            "legacy-q1": {
              id: "legacy-q1",
              parentId: rootId,
              question: "Q1",
              goal: "Understand Q1",
              lifecycle: "active",
              targetDepth: "L1",
              definitionOfDone: [],
              evidence: [],
              childIds: [],
              blockingChildIds: [],
              conversationThreadId: "legacy-q1:thread",
              reopenHistory: [],
            },
            "legacy-q2": {
              id: "legacy-q2",
              parentId: rootId,
              question: "Q2",
              goal: "Understand Q2",
              lifecycle: "open",
              targetDepth: "L1",
              definitionOfDone: [],
              evidence: [],
              childIds: [],
              blockingChildIds: [],
              conversationThreadId: "legacy-q2:thread",
              reopenHistory: [],
            },
          },
        },
      },
    ],
  };
}

describe("workspace metadata and hierarchy migration", () => {
  it("updates project metadata on the selected snapshot without syncing a Root node question", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const layoutBefore = workspace.projects[0]?.layout;
    const rootNodeIdsBefore = [...projectA.snapshot.pass.rootNodeIds];
    const q1 = projectA.ids.q1;
    const q1QuestionBefore = projectA.snapshot.nodes[q1]?.question;

    const next = updateWorkspaceProjectMetadata(
      workspace,
      projectA.snapshot.project.id,
      {
        name: "Renamed Demo",
        description: "Edited pitch",
        source: projectA.snapshot.project.source,
      },
    );

    expect(next.projects[0]?.snapshot.project.name).toBe("Renamed Demo");
    expect(next.projects[0]?.snapshot.project.description).toBe("Edited pitch");
    expect(next.projects[0]?.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(next.projects[0]?.snapshot.pass.rootNodeIds).toEqual(rootNodeIdsBefore);
    expect(next.projects[0]?.snapshot.nodes[q1]?.question).toBe(q1QuestionBefore);
    expect(next.projects[0]?.layout).toEqual(layoutBefore);
    expect(next.lastError).toBeUndefined();
  });

  it("flattens legacy rooted semantic storage and clears nodePositions on reload", () => {
    const legacy = legacyRootedStoredWorkspace();
    const projectId = legacy.projects[0]!.projectId;
    const legacyRootId = migratedProjectRootId(projectId);

    const storage = createMemoryPreferenceStorage({
      [WORKSPACE_SEMANTIC_KEY]: JSON.stringify(legacy),
    });

    let workspace = createWorkspace([]);
    const legacySnapshot = legacy.projects[0]!.snapshot;
    workspace = {
      ...workspace,
      projects: [
        {
          projectId,
          archived: false,
          snapshot: legacySnapshot,
          layout: {
            ...defaultProjectLayout(legacySnapshot),
            nodePositions: {
              [legacyRootId]: { x: 1, y: 2 },
              "legacy-q1": { x: 10, y: 20 },
              "legacy-q2": { x: 30, y: 40 },
            },
          },
        },
      ],
      selectedProjectId: projectId,
    };
    saveWorkspacePreferences(storage, workspace);
    expect(
      JSON.parse(storage.getItem(WORKSPACE_PREFERENCES_KEY)!)
        .projects[projectId].nodePositions["legacy-q1"],
    ).toEqual({ x: 10, y: 20 });

    const load1 = loadSemanticWorkspaceWithMigration(storage);
    expect(load1.migratedProjectIds).toEqual([projectId]);
    const migrated = load1.workspace.projects[0]?.snapshot;
    expect(migrated?.pass.projectRootNodeId).toBeUndefined();
    expect(migrated?.pass.rootNodeIds).toEqual(["legacy-q1", "legacy-q2"]);
    expect(migrated?.nodes[legacyRootId]).toBeUndefined();
    expect(migrated?.nodes["legacy-q1"]?.parentId).toBeUndefined();
    expect(migrated?.nodes["legacy-q2"]?.parentId).toBeUndefined();
    expect(migrated?.pass.activeStack).toEqual(["legacy-q1"]);
    expect(migrated?.pass.currentFocusNodeId).toBe("legacy-q1");

    const rewritten = JSON.parse(storage.getItem(WORKSPACE_SEMANTIC_KEY)!);
    expect(rewritten.projects[0].snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(rewritten.projects[0].snapshot.pass.rootNodeIds).toEqual([
      "legacy-q1",
      "legacy-q2",
    ]);
    expect(JSON.stringify(rewritten)).not.toContain("nodePositions");

    const reconciled = hydrateWorkspacePreferences(load1.workspace, storage, {
      clearPositionsForProjectIds: load1.migratedProjectIds,
    });
    expect(reconciled.projects[0]?.layout.nodePositions).toEqual({});

    const load2 = loadSemanticWorkspaceWithMigration(storage);
    expect(load2.migratedProjectIds).toEqual([]);
    expect(load2.workspace.projects[0]?.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(load2.workspace.projects[0]?.snapshot.pass.rootNodeIds).toEqual([
      "legacy-q1",
      "legacy-q2",
    ]);
  });

  it("does not clear nodePositions on metadata-only edits", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const withPositions = updateSelectedLayout(workspace, {
      nodePositions: {
        [projectA.ids.q1]: { x: 12, y: 34 },
      },
    });
    const renamed = updateWorkspaceProjectMetadata(
      withPositions,
      projectA.snapshot.project.id,
      { name: "Still positioned" },
    );
    expect(renamed.projects[0]?.layout.nodePositions[projectA.ids.q1]).toEqual({
      x: 12,
      y: 34,
    });
  });
});
