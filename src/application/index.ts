export { dispatchCommand, type UiCommand } from "./commands.js";
export {
  isClosePrerequisiteError,
  isGlobalDomainError,
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
  selectCloseReadiness,
  type CloseReadiness,
  type CloseRequirement,
} from "./selectors/close-readiness.js";
export {
  selectInspectorViewModel,
  type InspectorViewModel,
} from "./selectors/inspector-view-model.js";
export {
  selectProjectSummary,
  type ProjectSummary,
} from "./selectors/project-summary.js";
export {
  selectTreeViewModel,
  type TreeEdgeView,
  type TreeNodeView,
  type TreeViewModel,
} from "./selectors/tree-view-model.js";
export { createSession, type TreeSession } from "./session.js";
export type {
  Criterion,
  DomainError,
  DomainSnapshot,
  Evidence,
  LearningDepth,
  NodeId,
  NodeLifecycle,
  ProjectId,
} from "../domain/index.js";
