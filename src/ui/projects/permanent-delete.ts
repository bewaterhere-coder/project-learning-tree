import type { ConversationStore } from "../../conversation/index.js";
import {
  deleteArchivedProject,
  type LearningWorkspace,
  type ProjectId,
} from "../../workspace/index.js";

export type PermanentDeleteCommit = (
  next: LearningWorkspace,
  semantic: boolean,
) => void;

export type PermanentDeleteResult =
  | { deleted: false }
  | { deleted: true; projectId: ProjectId };

/**
 * Fail-closed permanent delete orchestration.
 * Semantic write and conversation prune run only when the workspace layer
 * positively reports that an archived project was removed.
 */
export async function permanentlyDeleteArchivedProject(args: {
  workspace: LearningWorkspace;
  projectId: ProjectId;
  commit: PermanentDeleteCommit;
  conversationStore?: Pick<ConversationStore, "deleteForProject">;
}): Promise<PermanentDeleteResult> {
  const result = deleteArchivedProject(args.workspace, args.projectId);
  if (result.deleted !== true) {
    return { deleted: false };
  }
  args.commit(result.workspace, true);
  if (args.conversationStore) {
    await args.conversationStore.deleteForProject(result.projectId);
  }
  return { deleted: true, projectId: result.projectId };
}
