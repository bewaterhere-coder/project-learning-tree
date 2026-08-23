import { describe, expect, it } from "vitest";
import { selectProjectLearningProgress } from "../../src/application/index.js";
import { closeNode, reopenNode } from "../../src/domain/index.js";
import {
  closePrepared,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  requireProjectRootId,
  sequentialPorts,
  unwrap,
} from "../domain/helpers.js";

describe("project learning progress", () => {
  it("excludes Project Root from completed/total and updates when questions close/reopen", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["Q1", "Q2"]);
    const rootId = requireProjectRootId(snapshot);
    const [q1, q2] = coreQuestionIds(snapshot);
    if (!q1 || !q2) {
      throw new Error("missing questions");
    }

    let progress = selectProjectLearningProgress(snapshot);
    expect(progress).toEqual({
      completed: 0,
      total: 2,
      ratio: 0,
      percent: 0,
    });
    expect(progress.total).toBe(Object.keys(snapshot.nodes).length - 1);

    snapshot = closePrepared(snapshot, q1, ports);
    progress = selectProjectLearningProgress(snapshot);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.percent).toBe(50);
    expect(snapshot.nodes[rootId]?.lifecycle).toBe("open");

    snapshot = closePrepared(snapshot, q2, ports);
    progress = selectProjectLearningProgress(snapshot);
    expect(progress).toEqual({
      completed: 2,
      total: 2,
      ratio: 1,
      percent: 100,
    });

    expectError(closeNode(snapshot, { nodeId: rootId }), "NotALearningQuestion");

    snapshot = unwrap(
      reopenNode(snapshot, { nodeId: q1, reason: "revisit" }, ports),
    );
    progress = selectProjectLearningProgress(snapshot);
    expect(progress.completed).toBe(1);
    expect(progress.percent).toBe(50);
  });
});
