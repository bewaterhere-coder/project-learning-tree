import type {
  DomainError,
  DomainSnapshot,
  NodeId,
  ProjectId,
  ProjectLearningBootstrapRecord,
} from "../application/index.js";

export type WorkspaceLocale = "zh-CN" | "en-US";
export type ColorScheme = "system" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";
export type ThemeRecipeId =
  | "rose-pine"
  | "catppuccin"
  | "everforest"
  | "nord";
export type WorkspaceErrorOrigin = string;

export interface NodePosition {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkspaceShellLayout {
  projectSidebarOpen: boolean;
  projectSidebarWidth: number;
  archivedPaneOpen: boolean;
  archivedPaneHeight: number;
  locale: WorkspaceLocale;
  colorScheme: ColorScheme;
  themeRecipeId: ThemeRecipeId;
}

export interface PaneReleaseResult {
  open: boolean;
  size: number;
}

export type ChatPlacement = "floating" | "docked";
export type ChatPositionOrigin = "auto" | "user";

export type ChatBinding =
  | { mode: "follow-focus" }
  | { mode: "pinned"; projectId: ProjectId; nodeId: NodeId };

export interface ChatPosition {
  x: number;
  y: number;
}

export interface ProjectWorkspaceLayout {
  nodePositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  inspectorOpen: boolean;
  inspectorWidth: number;
  chatOpen: boolean;
  chatPlacement: ChatPlacement;
  chatWidth: number;
  chatPosition?: ChatPosition;
  chatPositionOrigin: ChatPositionOrigin;
  chatBinding: ChatBinding;
}

export interface ProjectWorkspace {
  projectId: ProjectId;
  snapshot: DomainSnapshot;
  layout: ProjectWorkspaceLayout;
  archived: boolean;
  bootstrap?: ProjectLearningBootstrapRecord;
}

export interface LearningWorkspace {
  projects: ProjectWorkspace[];
  selectedProjectId: ProjectId | null;
  shell: WorkspaceShellLayout;
  lastError?: DomainError;
  lastErrorCommand?: WorkspaceErrorOrigin;
}

export const LAYOUT_VERSION = 2;
export const SEMANTIC_VERSION = 1;

export interface StoredWorkspacePreferences {
  version: number;
  shell: WorkspaceShellLayout;
  projects: Record<string, ProjectWorkspaceLayout>;
}

export interface StoredWorkspaceSemantics {
  version: number;
  selectedProjectId: string | null;
  projects: StoredWorkspaceProject[];
}

export interface StoredWorkspaceProject {
  projectId: string;
  archived: boolean;
  snapshot: DomainSnapshot;
  bootstrap?: ProjectLearningBootstrapRecord;
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
