import { describe, expect, it } from "vitest";
import {
  migratedProjectRootId,
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

function legacyFlatStoredWorkspace(): {
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
            rootNodeIds: ["flat-a", "flat-b"],
            activeStack: [],
            frontier: [],
          },
          nodes: {
            "flat-a": {
              id: "flat-a",
              question: "A",
              goal: "A",
              lifecycle: "open",
              targetDepth: "L1",
              definitionOfDone: [],
              evidence: [],
              childIds: [],
              blockingChildIds: [],
              conversationThreadId: "flat-a:thread",
              reopenHistory: [],
            },
            "flat-b": {
              id: "flat-b",
              question: "B",
              goal: "B",
              lifecycle: "open",
              targetDepth: "L1",
              definitionOfDone: [],
              evidence: [],
              childIds: [],
              blockingChildIds: [],
              conversationThreadId: "flat-b:thread",
              reopenHistory: [],
            },
          },
        },
      },
    ],
  };
}

describe("workspace metadata and hierarchy migration", () => {
  it("updates project metadata on the selected snapshot without touching layout", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const layoutBefore = workspace.projects[0]?.layout;
    const rootId = projectA.snapshot.pass.projectRootNodeId!;
    const childIdsBefore = [
      ...(projectA.snapshot.nodes[rootId]?.childIds ?? []),
    ];

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
    expect(next.projects[0]?.snapshot.nodes[rootId]?.question).toBe(
      "Renamed Demo",
    );
    expect(next.projects[0]?.snapshot.pass.projectRootNodeId).toBe(rootId);
    expect(next.projects[0]?.snapshot.nodes[rootId]?.childIds).toEqual(
      childIdsBefore,
    );
    expect(next.projects[0]?.layout).toEqual(layoutBefore);
    expect(next.lastError).toBeUndefined();
  });

  it("migrates legacy flat semantic storage and clears nodePositions on reload", () => {
    const legacy = legacyFlatStoredWorkspace();
    const projectId = legacy.projects[0]!.projectId;
    const expectedRootId = migratedProjectRootId(projectId);

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
              "flat-a": { x: 10, y: 20 },
              "flat-b": { x: 30, y: 40 },
            },
          },
        },
      ],
      selectedProjectId: projectId,
    };
    saveWorkspacePreferences(storage, workspace);
    expect(
      JSON.parse(storage.getItem(WORKSPACE_PREFERENCES_KEY)!)
        .projects[projectId].nodePositions["flat-a"],
    ).toEqual({ x: 10, y: 20 });

    const load1 = loadSemanticWorkspaceWithMigration(storage);
    expect(load1.migratedProjectIds).toEqual([projectId]);
    const migrated = load1.workspace.projects[0]?.snapshot;
    expect(migrated?.pass.projectRootNodeId).toBe(expectedRootId);
    expect(migrated?.pass.rootNodeIds).toEqual([expectedRootId]);
    expect(migrated?.nodes[expectedRootId]?.childIds).toEqual([
      "flat-a",
      "flat-b",
    ]);
    expect(migrated?.nodes["flat-a"]?.parentId).toBe(expectedRootId);

    const rewritten = JSON.parse(storage.getItem(WORKSPACE_SEMANTIC_KEY)!);
    expect(rewritten.projects[0].snapshot.pass.projectRootNodeId).toBe(
      expectedRootId,
    );
    expect(JSON.stringify(rewritten)).not.toContain("nodePositions");

    const reconciled = hydrateWorkspacePreferences(load1.workspace, storage, {
      clearPositionsForProjectIds: load1.migratedProjectIds,
    });
    expect(reconciled.projects[0]?.layout.nodePositions).toEqual({});

    const load2 = loadSemanticWorkspaceWithMigration(storage);
    expect(load2.migratedProjectIds).toEqual([]);
    expect(load2.workspace.projects[0]?.snapshot.pass.projectRootNodeId).toBe(
      expectedRootId,
    );
    expect(
      load2.workspace.projects[0]?.snapshot.nodes[expectedRootId]?.childIds,
    ).toEqual(["flat-a", "flat-b"]);
  });

  it("does not clear nodePositions on metadata-only edits", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const withPositions = updateSelectedLayout(
      workspace,
      {
        nodePositions: {
          [projectA.ids.q1]: { x: 12, y: 34 },
        },
      },
    );
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
