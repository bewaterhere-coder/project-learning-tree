export {
  applyNodeDragStop,
  applySelectedCommand,
  createWorkspace,
  focusAndOpenInspector,
  selectProject,
  selectedProject,
  setInspectorOpen,
  setSelectedViewport,
  updateSelectedLayout,
  updateShell,
  workspaceFromSnapshot,
} from "./session.js";
export {
  clampInspectorWidth,
  clampSidebarWidth,
  DEFAULT_INSPECTOR_WIDTH,
  DEFAULT_LOCALE,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_VIEWPORT,
  defaultProjectLayout,
  defaultShell,
  MAX_SIDEBAR_WIDTH,
  MIN_INSPECTOR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  WORKSPACE_PREFERENCES_KEY,
} from "./defaults.js";
export {
  mergeNodePositions,
  resolveNodePosition,
} from "./layout.js";
export {
  applyStoredPreferences,
  createMemoryPreferenceStorage,
  hydrateWorkspacePreferences,
  loadWorkspacePreferences,
  parseStoredPreferences,
  saveWorkspacePreferences,
  serializeWorkspacePreferences,
} from "./preferences.js";
export { LAYOUT_VERSION } from "./types.js";
export type {
  LearningWorkspace,
  NodePosition,
  PreferenceStorage,
  ProjectWorkspace,
  ProjectWorkspaceLayout,
  StoredWorkspacePreferences,
  Viewport,
  WorkspaceLocale,
  WorkspaceShellLayout,
} from "./types.js";
export type { NodeId, ProjectId } from "../application/index.js";
