export { dispatchCommand, type UiCommand } from "./commands.js";
export {
  bootstrapLearningProject,
  isEmptyFirstLayer,
  resolveProjectName,
  isValidGitHubProjectSource,
  CANONICAL_CONTRACT_ID,
  CANONICAL_CONTRACT_VERSION,
  LEARNING_TREE_ADAPTER_ID,
  LEARNING_TREE_ADAPTER_VERSION,
  type BootstrapProjectResult,
  type EvidenceInput,
  type EvidenceStatus,
  type ProjectLearningBootstrapRecord,
} from "./bootstrap.js";
export {
  migrateSnapshotHierarchy,
  type HierarchyMigrationResult,
} from "./hierarchy-migration.js";
export { isEvidenceStatus } from "../framework/index.js";
export type {
  RepositoryEvidenceProvider,
  RepositoryEvidenceSource,
  RepositoryRef,
} from "./repository-evidence.js";
export {
  isAuthoringCommand,
  isClosePrerequisiteError,
  isGlobalDomainError,
  isProjectCreateCommand,
  isProjectMetadataCommand,
  presentDomainError,
  type DomainErrorPresentation,
} from "./errors.js";
export {
  activateLabelFor,
  selectActionAvailability,
  type ActionAvailability,
  type ActivateLabel,
} from "./selectors/action-availability.js";
export {
  selectAuthoringAvailability,
  validateChildDraft,
  type AuthoringAvailability,
  type ChildDraftValidation,
} from "./selectors/child-authoring.js";
export {
  selectCoreQuestionAuthoring,
  validateCoreQuestionDraft,
  type CoreQuestionAuthoring,
} from "./selectors/core-question-authoring.js";
export {
  selectCloseReadiness,
  type CloseReadiness,
  type CloseRequirement,
} from "./selectors/close-readiness.js";
export {
  selectInspectorViewModel,
  type InspectorChildView,
  type InspectorViewModel,
} from "./selectors/inspector-view-model.js";
export {
  selectProjectSummary,
  type ProjectSummary,
} from "./selectors/project-summary.js";
export {
  selectBoundConversationIdentity,
  selectFocusDiffersFromChat,
  type BoundConversationIdentity,
  type ChatBindingInput,
} from "./selectors/chat-binding.js";
export {
  contextExcludesSiblingConversations,
  selectContextInspectorView,
  selectLearningContext,
  type ContextInspectorView,
  type ContextMessage,
  type LearningContext,
  type LearningContextNode,
  type LearningContextTarget,
} from "./selectors/learning-context.js";
export {
  selectTreeViewModel,
  type TreeEdgeView,
  type TreeNodeView,
  type TreeViewModel,
} from "./selectors/tree-view-model.js";
export { createSession, type TreeSession } from "./session.js";
export type {
  Criterion,
  CriterionId,
  DomainError,
  DomainSnapshot,
  Evidence,
  LearningDepth,
  NodeId,
  NodeLifecycle,
  Ports,
  ProjectId,
} from "../domain/index.js";
