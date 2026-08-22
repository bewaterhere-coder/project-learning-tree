import type {
  DomainError,
  DomainSnapshot,
  NodeId,
  ProjectId,
} from "../application/index.js";

export type WorkspaceLocale = "zh-CN" | "en-US";
export type ColorScheme = "system" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";
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
}

export interface PaneReleaseResult {
  open: boolean;
  size: number;
}

export interface ProjectWorkspaceLayout {
  nodePositions: Record<NodeId, NodePosition>;
  viewport: Viewport;
  inspectorOpen: boolean;
  inspectorWidth: number;
}

export interface ProjectWorkspace {
  projectId: ProjectId;
  snapshot: DomainSnapshot;
  layout: ProjectWorkspaceLayout;
  archived: boolean;
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
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
