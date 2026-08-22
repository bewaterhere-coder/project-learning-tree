export type ProjectId = string;
export type PassId = string;
export type NodeId = string;
export type CriterionId = string;
export type EvidenceId = string;
export type FrontierItemId = string;
export type ReopenEventId = string;
export type ConversationThreadId = string;
export type IsoTimestamp = string;

export type NodeLifecycle = "open" | "active" | "closed" | "parked";
export type LearningDepth = "L1" | "L2" | "L3";
export type PassStatus = "in_progress" | "completed";
export type CriterionStatus = "unsatisfied" | "satisfied";

export interface LearningProject {
  id: ProjectId;
  name: string;
  source?: string;
  description?: string;
  passIds: PassId[];
}

export interface LearningPass {
  id: PassId;
  projectId: ProjectId;
  status: PassStatus;
  rootNodeIds: NodeId[];
  /** Sole structural Project Root when set; must be ∈ rootNodeIds. */
  projectRootNodeId?: NodeId;
  activeStack: NodeId[];
  currentFocusNodeId?: NodeId;
  frontier: FrontierItem[];
}

export interface LearningNode {
  id: NodeId;
  parentId?: NodeId;
  question: string;
  goal: string;
  lifecycle: NodeLifecycle;
  targetDepth: LearningDepth;
  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;
  childIds: NodeId[];
  blockingChildIds: NodeId[];
  conversationThreadId: ConversationThreadId;
  reopenHistory: ReopenEvent[];
}

export interface Criterion {
  id: CriterionId;
  description: string;
  required: boolean;
  status: CriterionStatus;
  evidenceIds: EvidenceId[];
  evidenceRequired: boolean;
  notes?: string;
}

export interface Evidence {
  id: EvidenceId;
  type: string;
  reference: string;
  note?: string;
}

export interface FrontierItem {
  id: FrontierItemId;
  question: string;
  sourceNodeId: NodeId;
  reason?: string;
  createdAt: IsoTimestamp;
}

export interface ReopenEvent {
  id: ReopenEventId;
  reason: string;
  reopenedAt: IsoTimestamp;
}

export interface DomainSnapshot {
  project: LearningProject;
  pass: LearningPass;
  nodes: Record<NodeId, LearningNode>;
}

export type DomainEvent =
  | { type: "ProjectCreated"; projectId: ProjectId; passId: PassId }
  | { type: "ProjectRootEnsured"; nodeId: NodeId }
  | { type: "ProjectMetadataUpdated"; projectId: ProjectId }
  | { type: "CoreQuestionAdded"; nodeId: NodeId }
  | { type: "NodeFocused"; nodeId: NodeId }
  | { type: "NodeActivated"; nodeId: NodeId }
  | { type: "BlockingChildCreated"; parentId: NodeId; childId: NodeId }
  | { type: "ChildCreated"; parentId: NodeId; childId: NodeId }
  | { type: "ChildMarkedBlocking"; parentId: NodeId; childId: NodeId }
  | { type: "ChildUnmarkedBlocking"; parentId: NodeId; childId: NodeId }
  | { type: "BlockingChildActivated"; parentId: NodeId; childId: NodeId }
  | { type: "CandidateMovedToFrontier"; frontierItemId: FrontierItemId }
  | { type: "FrontierItemPromoted"; frontierItemId: FrontierItemId; nodeId: NodeId }
  | { type: "NodeParked"; nodeId: NodeId }
  | { type: "NodeResumed"; nodeId: NodeId }
  | { type: "CriterionAdded"; nodeId: NodeId; criterionId: CriterionId }
  | { type: "EvidenceAdded"; nodeId: NodeId; evidenceId: EvidenceId }
  | { type: "EvidenceLinked"; nodeId: NodeId; criterionId: CriterionId; evidenceId: EvidenceId }
  | { type: "CriterionDeclaredSatisfied"; nodeId: NodeId; criterionId: CriterionId }
  | { type: "SummarySet"; nodeId: NodeId }
  | { type: "NodeClosed"; nodeId: NodeId }
  | { type: "NodeReopened"; nodeId: NodeId; reopenEventId: ReopenEventId }
  | { type: "ReturnedToParent"; parentId: NodeId }
  | { type: "PassCompleted"; passId: PassId };

export type DomainResult<T> =
  | { ok: true; snapshot: T; events: DomainEvent[] }
  | { ok: false; error: import("./errors.js").DomainError };

export interface CreateProject {
  name: string;
  source?: string;
  description?: string;
}

export interface EnsureProjectRoot {
  /** When set, used as the Project Root node id (migration). Otherwise ports.id(). */
  nodeId?: NodeId;
}

export interface UpdateProjectMetadata {
  name: string;
  source?: string;
  description?: string;
}

export interface AddCoreQuestion {
  question: string;
  goal: string;
  targetDepth?: LearningDepth;
}

/** Stable Project Root id for legacy semantic migration. */
export function migratedProjectRootId(projectId: ProjectId): NodeId {
  return `plt:project-root:${projectId}`;
}

export const PROJECT_ROOT_ORIENTATION_GOAL =
  "Orient learning for this project through its Core Questions.";

export interface FocusNode {
  nodeId: NodeId;
}

export interface ActivateNode {
  nodeId: NodeId;
}

export interface ActivateBlockingChild {
  parentId: NodeId;
  childId: NodeId;
}

export interface CreateBlockingChild {
  parentId: NodeId;
  question: string;
  goal: string;
  targetDepth?: LearningDepth;
}

export interface CreateChild {
  parentId: NodeId;
  question: string;
  goal: string;
  targetDepth?: LearningDepth;
}

export interface MarkChildBlocking {
  parentId: NodeId;
  childId: NodeId;
}

export interface UnmarkChildBlocking {
  parentId: NodeId;
  childId: NodeId;
}

export interface MoveCandidateToFrontier {
  sourceNodeId: NodeId;
  question: string;
  reason?: string;
}

export type FrontierPlacement =
  | { kind: "root" }
  | { kind: "child"; parentId: NodeId }
  | { kind: "blockingChild"; parentId: NodeId };

export interface PromoteFrontierItem {
  frontierItemId: FrontierItemId;
  placement: FrontierPlacement;
}

export interface ParkNode {
  nodeId: NodeId;
}

export interface ResumeNode {
  nodeId: NodeId;
}

export interface AddCriterion {
  nodeId: NodeId;
  description: string;
  required: boolean;
  evidenceRequired: boolean;
  notes?: string;
}

export interface AddEvidence {
  nodeId: NodeId;
  type: string;
  reference: string;
  note?: string;
}

export interface LinkEvidenceToCriterion {
  nodeId: NodeId;
  criterionId: CriterionId;
  evidenceId: EvidenceId;
}

export interface DeclareCriterionSatisfied {
  nodeId: NodeId;
  criterionId: CriterionId;
}

export interface SetNodeSummary {
  nodeId: NodeId;
  summary: string;
}

export interface EvaluateConvergence {
  nodeId: NodeId;
}

export interface CloseNode {
  nodeId: NodeId;
}

export interface ReopenNode {
  nodeId: NodeId;
  reason: string;
}

export interface ConvergenceEvaluation {
  canClose: boolean;
  failures: import("./errors.js").DomainError[];
}

export const CORE_QUESTION_LIMIT = 5;
