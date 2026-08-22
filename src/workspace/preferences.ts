import {
  clampInspectorWidth,
  clampSidebarWidth,
  WORKSPACE_PREFERENCES_KEY,
} from "./defaults.js";
import {
  LAYOUT_VERSION,
  type LearningWorkspace,
  type PreferenceStorage,
  type ProjectWorkspaceLayout,
  type StoredWorkspacePreferences,
  type Viewport,
  type WorkspaceLocale,
  type WorkspaceShellLayout,
} from "./types.js";

const DOMAIN_SNAPSHOT_KEYS = [
  "snapshot",
  "activeStack",
  "currentFocusNodeId",
  "definitionOfDone",
  "lifecycle",
  "blockingChildIds",
  "conversationThreadId",
] as const;

export function createMemoryPreferenceStorage(
  initial: Record<string, string> = {},
): PreferenceStorage {
  const data = { ...initial };
  return {
    getItem(key: string): string | null {
      return data[key] ?? null;
    },
    setItem(key: string, value: string): void {
      data[key] = value;
    },
  };
}

export function serializeWorkspacePreferences(
  workspace: LearningWorkspace,
): StoredWorkspacePreferences {
  const projects: StoredWorkspacePreferences["projects"] = {};
  for (const project of workspace.projects) {
    projects[project.projectId] = cloneLayout(project.layout);
  }
  return {
    version: LAYOUT_VERSION,
    shell: {
      projectSidebarOpen: workspace.shell.projectSidebarOpen,
      projectSidebarWidth: workspace.shell.projectSidebarWidth,
      locale: workspace.shell.locale,
    },
    projects,
  };
}

export function saveWorkspacePreferences(
  storage: PreferenceStorage,
  workspace: LearningWorkspace,
): void {
  const payload = serializeWorkspacePreferences(workspace);
  storage.setItem(WORKSPACE_PREFERENCES_KEY, JSON.stringify(payload));
}

export function loadWorkspacePreferences(
  storage: PreferenceStorage,
): StoredWorkspacePreferences | undefined {
  const raw = storage.getItem(WORKSPACE_PREFERENCES_KEY);
  if (raw === null || raw === "") {
    return undefined;
  }
  try {
    return parseStoredPreferences(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function hydrateWorkspacePreferences(
  workspace: LearningWorkspace,
  storage: PreferenceStorage,
): LearningWorkspace {
  const stored = loadWorkspacePreferences(storage);
  if (stored === undefined) {
    return workspace;
  }
  return applyStoredPreferences(workspace, stored);
}

export function applyStoredPreferences(
  workspace: LearningWorkspace,
  stored: StoredWorkspacePreferences,
): LearningWorkspace {
  return {
    ...workspace,
    shell: stored.shell,
    projects: workspace.projects.map((project) => {
      const layout = stored.projects[project.projectId];
      if (layout === undefined) {
        return project;
      }
      return { ...project, snapshot: project.snapshot, layout };
    }),
  };
}

export function parseStoredPreferences(
  value: unknown,
): StoredWorkspacePreferences | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of DOMAIN_SNAPSHOT_KEYS) {
    if (key in value) {
      return undefined;
    }
  }
  if (value.version !== LAYOUT_VERSION) {
    return undefined;
  }
  const shell = parseShell(value.shell);
  if (shell === undefined) {
    return undefined;
  }
  const projects = parseProjectLayouts(value.projects);
  if (projects === undefined) {
    return undefined;
  }
  return { version: LAYOUT_VERSION, shell, projects };
}

function parseShell(value: unknown): WorkspaceShellLayout | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const locale = parseLocale(value.locale);
  if (locale === undefined) {
    return undefined;
  }
  if (typeof value.projectSidebarOpen !== "boolean") {
    return undefined;
  }
  if (typeof value.projectSidebarWidth !== "number") {
    return undefined;
  }
  return {
    projectSidebarOpen: value.projectSidebarOpen,
    projectSidebarWidth: clampSidebarWidth(value.projectSidebarWidth),
    locale,
  };
}

function parseProjectLayouts(
  value: unknown,
): Record<string, ProjectWorkspaceLayout> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const projects: Record<string, ProjectWorkspaceLayout> = {};
  for (const [projectId, layout] of Object.entries(value)) {
    const parsed = parseProjectLayout(layout);
    if (parsed === undefined) {
      return undefined;
    }
    projects[projectId] = parsed;
  }
  return projects;
}

function parseProjectLayout(value: unknown): ProjectWorkspaceLayout | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if ("snapshot" in value || "activeStack" in value || "nodes" in value) {
    return undefined;
  }
  const nodePositions = parseNodePositions(value.nodePositions);
  const viewport = parseViewport(value.viewport);
  if (nodePositions === undefined || viewport === undefined) {
    return undefined;
  }
  if (typeof value.inspectorOpen !== "boolean") {
    return undefined;
  }
  if (typeof value.inspectorWidth !== "number") {
    return undefined;
  }
  return {
    nodePositions,
    viewport,
    inspectorOpen: value.inspectorOpen,
    inspectorWidth: clampInspectorWidth(value.inspectorWidth),
  };
}

function parseNodePositions(
  value: unknown,
): Record<string, { x: number; y: number }> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [nodeId, position] of Object.entries(value)) {
    if (!isRecord(position)) {
      return undefined;
    }
    if (typeof position.x !== "number" || typeof position.y !== "number") {
      return undefined;
    }
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      return undefined;
    }
    positions[nodeId] = { x: position.x, y: position.y };
  }
  return positions;
}

function parseViewport(value: unknown): Viewport | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (
    typeof value.x !== "number" ||
    typeof value.y !== "number" ||
    typeof value.zoom !== "number"
  ) {
    return undefined;
  }
  if (
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.zoom)
  ) {
    return undefined;
  }
  return { x: value.x, y: value.y, zoom: value.zoom };
}

function parseLocale(value: unknown): WorkspaceLocale | undefined {
  return value === "zh-CN" || value === "en-US" ? value : undefined;
}

function cloneLayout(layout: ProjectWorkspaceLayout): ProjectWorkspaceLayout {
  const nodePositions: ProjectWorkspaceLayout["nodePositions"] = {};
  for (const [nodeId, position] of Object.entries(layout.nodePositions)) {
    nodePositions[nodeId] = { x: position.x, y: position.y };
  }
  return {
    nodePositions,
    viewport: { ...layout.viewport },
    inspectorOpen: layout.inspectorOpen,
    inspectorWidth: layout.inspectorWidth,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
