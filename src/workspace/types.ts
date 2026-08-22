import type { DomainError, DomainSnapshot, NodeId, ProjectId } from "../application/index.js";

export type WorkspaceLocale = "zh-CN" | "en-US";

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
  locale: WorkspaceLocale;
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
}

export interface LearningWorkspace {
  projects: ProjectWorkspace[];
  selectedProjectId: ProjectId;
  shell: WorkspaceShellLayout;
  lastError?: DomainError;
}

export const LAYOUT_VERSION = 1;

export interface StoredWorkspacePreferences {
  version: number;
  shell: WorkspaceShellLayout;
  projects: Record<string, ProjectWorkspaceLayout>;
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
