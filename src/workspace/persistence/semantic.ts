import type { DomainSnapshot } from "../../application/index.js";
import {
  defaultProjectLayout,
  defaultShell,
  WORKSPACE_SEMANTIC_KEY,
} from "../defaults.js";
import { createWorkspace, normalizeWorkspaceSelection } from "../session.js";
import type {
  LearningWorkspace,
  PreferenceStorage,
  ProjectWorkspace,
  StoredWorkspaceProject,
  StoredWorkspaceSemantics,
} from "../types.js";
import { SEMANTIC_VERSION } from "../types.js";

const PREFERENCE_ONLY_KEYS = [
  "nodePositions",
  "viewport",
  "inspectorWidth",
  "inspectorOpen",
  "projectSidebarWidth",
  "projectSidebarOpen",
  "archivedPaneOpen",
  "archivedPaneHeight",
  "locale",
  "colorScheme",
] as const;

export function serializeSemanticWorkspace(
  workspace: LearningWorkspace,
): StoredWorkspaceSemantics {
  return {
    version: SEMANTIC_VERSION,
    selectedProjectId: workspace.selectedProjectId,
    projects: workspace.projects.map((project) => ({
      projectId: project.projectId,
      archived: project.archived,
      snapshot: project.snapshot,
    })),
  };
}

export function saveSemanticWorkspace(
  storage: PreferenceStorage,
  workspace: LearningWorkspace,
): void {
  storage.setItem(
    WORKSPACE_SEMANTIC_KEY,
    JSON.stringify(serializeSemanticWorkspace(workspace)),
  );
}

export function loadSemanticWorkspace(
  storage: PreferenceStorage,
): LearningWorkspace {
  const raw = storage.getItem(WORKSPACE_SEMANTIC_KEY);
  if (raw === null || raw === "") {
    return createWorkspace([]);
  }
  try {
    const parsed = parseSemanticWorkspace(JSON.parse(raw));
    return parsed ?? createWorkspace([]);
  } catch {
    return createWorkspace([]);
  }
}

export function hydrateSemanticWorkspace(
  storage: PreferenceStorage,
): LearningWorkspace {
  return normalizeWorkspaceSelection(loadSemanticWorkspace(storage));
}

export function parseSemanticWorkspace(
  value: unknown,
): LearningWorkspace | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of PREFERENCE_ONLY_KEYS) {
    if (key in value) {
      return undefined;
    }
  }
  if (value.version !== SEMANTIC_VERSION) {
    return undefined;
  }
  if (value.selectedProjectId !== null && typeof value.selectedProjectId !== "string") {
    return undefined;
  }
  if (!Array.isArray(value.projects)) {
    return undefined;
  }
  const projects: ProjectWorkspace[] = [];
  for (const entry of value.projects) {
    const project = parseStoredProject(entry);
    if (project === undefined) {
      return undefined;
    }
    projects.push(project);
  }
  return normalizeWorkspaceSelection({
    projects,
    selectedProjectId: value.selectedProjectId,
    shell: defaultShell(),
  });
}

function parseStoredProject(value: unknown): ProjectWorkspace | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.projectId !== "string" || value.projectId === "") {
    return undefined;
  }
  if (typeof value.archived !== "boolean") {
    return undefined;
  }
  const snapshot = parseSnapshot(value.snapshot);
  if (!snapshot || snapshot.project.id !== value.projectId) {
    return undefined;
  }
  return {
    projectId: value.projectId,
    archived: value.archived,
    snapshot,
    layout: defaultProjectLayout(snapshot),
  };
}

function parseSnapshot(value: unknown): DomainSnapshot | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (!isRecord(value.project) || !isRecord(value.pass) || !isRecord(value.nodes)) {
    return undefined;
  }
  if (typeof value.project.id !== "string" || typeof value.project.name !== "string") {
    return undefined;
  }
  if (!Array.isArray(value.project.passIds)) {
    return undefined;
  }
  if (typeof value.pass.id !== "string" || typeof value.pass.projectId !== "string") {
    return undefined;
  }
  if (value.pass.status !== "in_progress" && value.pass.status !== "completed") {
    return undefined;
  }
  if (!Array.isArray(value.pass.rootNodeIds) || !Array.isArray(value.pass.activeStack)) {
    return undefined;
  }
  return value as unknown as DomainSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { StoredWorkspaceProject };
