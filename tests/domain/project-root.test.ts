import { describe, expect, it } from "vitest";
import {
  activateNode,
  closeNode,
  parkNode,
  setNodeSummary,
  updateProjectMetadata,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  requireProjectRootId,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

describe("project root hierarchy", () => {
  it("activates a Core Question under Project Root onto [R, Q1]", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const projectRootId = requireProjectRootId(started);
    const [q1, q2] = coreQuestionIds(started);
    if (!q1 || !q2) {
      throw new Error("missing core questions");
    }

    const snapshot = unwrap(activateNode(started, { nodeId: q1 }));

    expect(snapshot.pass.activeStack).toEqual([projectRootId, q1]);
    expect(snapshot.nodes[projectRootId]?.lifecycle).toBe("active");
    expect(snapshot.nodes[q1]?.lifecycle).toBe("active");
    expect(snapshot.nodes[q2]?.lifecycle).toBe("open");
    assertActiveBijection(snapshot);
  });

  it("switches Q1 → Q2 while keeping Project Root on the stack", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, projectRootId, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );
    const q2 = coreQuestionIds(onQ1)[1];
    if (!q2) {
      throw new Error("missing Q2");
    }

    const switched = unwrap(activateNode(onQ1, { nodeId: q2 }));

    expect(switched.pass.activeStack).toEqual([projectRootId, q2]);
    expect(switched.nodes[q1]?.lifecycle).toBe("open");
    expect(switched.nodes[q2]?.lifecycle).toBe("active");
    expect(switched.nodes[projectRootId]?.lifecycle).toBe("active");
    assertActiveBijection(switched);
  });

  it("parks Q1 as leaf leaving [R] active, and parks R when it is the leaf", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, projectRootId, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );

    const parkedQ1 = unwrap(parkNode(onQ1, { nodeId: q1 }));
    expect(parkedQ1.nodes[q1]?.lifecycle).toBe("parked");
    expect(parkedQ1.pass.activeStack).toEqual([projectRootId]);
    expect(parkedQ1.nodes[projectRootId]?.lifecycle).toBe("active");

    const parkedRoot = unwrap(parkNode(parkedQ1, { nodeId: projectRootId }));
    expect(parkedRoot.nodes[projectRootId]?.lifecycle).toBe("parked");
    expect(parkedRoot.pass.activeStack).toEqual([]);
    assertActiveBijection(parkedRoot);
  });

  it("closes prepared Q1 leaving [R], and rejects closing R while children are open", () => {
    const ports = sequentialPorts();
    const { snapshot: onQ1, projectRootId, rootId: q1 } = activateRoot(
      createProjectWithRoots(ports, ["Q1", "Q2"]),
    );

    const closedQ1 = closePrepared(onQ1, q1, ports);
    expect(closedQ1.nodes[q1]?.lifecycle).toBe("closed");
    expect(closedQ1.pass.activeStack).toEqual([projectRootId]);

    const withSummary = unwrap(
      setNodeSummary(closedQ1, {
        nodeId: projectRootId,
        summary: "Cannot close yet",
      }),
    );
    expectError(
      closeNode(withSummary, { nodeId: projectRootId }),
      "ProjectRootChildrenOpen",
    );
    expect(withSummary.nodes[projectRootId]?.lifecycle).toBe("active");
  });

  it("closes Project Root when every direct child is closed", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1"]);
    const projectRootId = requireProjectRootId(started);
    const q1 = coreQuestionIds(started)[0]!;

    let snapshot = unwrap(activateNode(started, { nodeId: q1 }));
    snapshot = closePrepared(snapshot, q1, ports);
    snapshot = unwrap(
      setNodeSummary(snapshot, {
        nodeId: projectRootId,
        summary: "Project oriented through Q1.",
      }),
    );
    snapshot = unwrap(closeNode(snapshot, { nodeId: projectRootId }));

    expect(snapshot.nodes[projectRootId]?.lifecycle).toBe("closed");
    expect(snapshot.pass.activeStack).toEqual([]);
    assertActiveBijection(snapshot);
  });

  it("renames via updateProjectMetadata and keeps root id plus children stable", () => {
    const ports = sequentialPorts();
    const started = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const projectRootId = requireProjectRootId(started);
    const childrenBefore = [...coreQuestionIds(started)];

    const renamed = unwrap(
      updateProjectMetadata(started, {
        name: "  Renamed Project  ",
        description: "  A short pitch  ",
        source: "https://example.com/repo",
      }),
    );

    expect(renamed.project.name).toBe("Renamed Project");
    expect(renamed.project.description).toBe("A short pitch");
    expect(renamed.project.source).toBe("https://example.com/repo");
    expect(renamed.pass.projectRootNodeId).toBe(projectRootId);
    expect(renamed.nodes[projectRootId]?.question).toBe("Renamed Project");
    expect(coreQuestionIds(renamed)).toEqual(childrenBefore);
    expect(renamed.pass.rootNodeIds).toEqual([projectRootId]);
    for (const childId of childrenBefore) {
      expect(renamed.nodes[childId]?.parentId).toBe(projectRootId);
      expect(renamed.nodes[childId]?.question).toBe(
        started.nodes[childId]?.question,
      );
    }
  });
});
