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

export async function workspaceWithNamedProject(name: string): Promise<LearningWorkspace> {
  return createWorkspaceProject(
    createWorkspace([]),
    { name },
    sequentialFixturePorts(2_500),
  );
}

export async function workspaceWithCoreQuestion(
  name: string,
  question: string,
  goal: string,
): Promise<LearningWorkspace> {
  const created = await workspaceWithNamedProject(name);
  return applySelectedCommand(created, {
    type: "addCoreQuestion",
    question,
    goal,
  }, sequentialFixturePorts(2_600));
}
