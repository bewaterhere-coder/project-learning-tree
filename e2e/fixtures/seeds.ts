import { applySelectedCommand, createWorkspace, createWorkspaceProject } from "../../src/workspace/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import type { LearningWorkspace } from "../../src/workspace/index.js";

/**
 * Test-only workspace builders. Never imported by production boot.
 * Built only through public Domain / Workspace operations.
 */
export function emptyWorkspace(): LearningWorkspace {
  return createWorkspace([]);
}

export function workspaceWithNamedProject(name: string): LearningWorkspace {
  return createWorkspaceProject(
    createWorkspace([]),
    { name },
    sequentialFixturePorts(2_500),
  );
}

export function workspaceWithCoreQuestion(
  name: string,
  question: string,
  goal: string,
): LearningWorkspace {
  const created = workspaceWithNamedProject(name);
  return applySelectedCommand(created, {
    type: "addCoreQuestion",
    question,
    goal,
  }, sequentialFixturePorts(2_600));
}
