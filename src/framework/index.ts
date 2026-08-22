export {
  BOOTSTRAP_PIPELINE,
  defaultDefinitionOfDone,
  EXPLORATION_BUDGET,
  PROJECT_LEARNING_FRAMEWORK_ID,
  PROJECT_LEARNING_FRAMEWORK_VERSION,
  type BootstrapPipelineStage,
  type CoreQuestionRole,
  type DefinitionOfDoneTemplate,
  type ExplorationBudget,
  type FrameworkId,
  type FrameworkVersion,
  type LearningDepth,
  type QuestionContract,
} from "./contract.js";
export {
  deriveRepositoryEvidence,
  parseGitHubSource,
  type EvidenceInput,
  type GitHubRepositoryRef,
  type RepositoryEvidence,
} from "./evidence.js";
export {
  classifyDiscovery,
  type DiscoveryClassification,
  type DiscoveryDestination,
} from "./classify.js";
export {
  defaultTargetDepthForRole,
  runProjectLearningBootstrap,
  type ProjectLearningProposal,
  type ProposedCoreQuestion,
} from "./bootstrap.js";
