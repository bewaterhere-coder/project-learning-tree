import {
  clampArchivedPaneHeight,
  clampChatWidth,
  clampInspectorWidth,
  clampSidebarWidth,
  DEFAULT_ARCHIVED_PANE_HEIGHT,
  DEFAULT_COLOR_SCHEME,
  defaultChatLayout,
  parseThemeRecipeId,
  resolveColorScheme,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_PREFERENCES_KEY_V1,
  WORKSPACE_THEME_HINT_KEY,
} from "./defaults.js";
import {
  LAYOUT_VERSION,
  type ChatBinding,
  type ChatPlacement,
  type ChatPosition,
  type ChatPositionOrigin,
  type ColorScheme,
  type LearningWorkspace,
  type PreferenceStorage,
  type ProjectWorkspaceLayout,
  type ResolvedColorScheme,
  type StoredWorkspacePreferences,
  type Viewport,
  type WorkspaceLocale,
  type WorkspaceShellLayout,
} from "./types.js";
import { normalizeChatBindings } from "./session.js";

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
      archivedPaneOpen: workspace.shell.archivedPaneOpen,
      archivedPaneHeight: workspace.shell.archivedPaneHeight,
      locale: workspace.shell.locale,
      colorScheme: workspace.shell.colorScheme,
      themeRecipeId: workspace.shell.themeRecipeId,
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
  const current = readPreferences(storage, WORKSPACE_PREFERENCES_KEY);
  if (current !== undefined) {
    return current;
  }
  const legacy = readPreferences(storage, WORKSPACE_PREFERENCES_KEY_V1);
  return legacy;
}

export function hydrateWorkspacePreferences(
  workspace: LearningWorkspace,
  storage: PreferenceStorage,
  options: { clearPositionsForProjectIds?: readonly string[] } = {},
): LearningWorkspace {
  const stored = loadWorkspacePreferences(storage);
  const clearIds = new Set(options.clearPositionsForProjectIds ?? []);
  if (stored === undefined) {
    return normalizeChatBindings(workspace);
  }
  const applied = normalizeChatBindings(applyStoredPreferences(workspace, stored));
  if (clearIds.size === 0) {
    return applied;
  }
  const cleared = {
    ...applied,
    projects: applied.projects.map((project) =>
      clearIds.has(project.projectId)
        ? { ...project, layout: { ...project.layout, nodePositions: {} } }
        : project,
    ),
  };
  saveWorkspacePreferences(storage, cleared);
  return cleared;
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
  if (value.version !== 1 && value.version !== LAYOUT_VERSION) {
    return undefined;
  }
  const shell = parseShell(value.shell, value.version === 1);
  if (shell === undefined) {
    return undefined;
  }
  const projects = parseProjectLayouts(value.projects);
  if (projects === undefined) {
    return undefined;
  }
  return { version: LAYOUT_VERSION, shell, projects };
}

export function writeThemeHint(
  storage: PreferenceStorage,
  colorScheme: ColorScheme,
  systemPrefersDark: boolean,
): void {
  storage.setItem(
    WORKSPACE_THEME_HINT_KEY,
    resolveColorScheme(colorScheme, systemPrefersDark),
  );
}

export function readThemeHint(
  storage: PreferenceStorage,
): ResolvedColorScheme | undefined {
  const raw = storage.getItem(WORKSPACE_THEME_HINT_KEY);
  return raw === "dark" || raw === "light" ? raw : undefined;
}

export function reconcileThemeHint(
  storage: PreferenceStorage,
  colorScheme: ColorScheme,
  systemPrefersDark: boolean,
): ResolvedColorScheme {
  const resolved = resolveColorScheme(colorScheme, systemPrefersDark);
  if (readThemeHint(storage) !== resolved) {
    writeThemeHint(storage, colorScheme, systemPrefersDark);
  }
  return resolved;
}

function readPreferences(
  storage: PreferenceStorage,
  key: string,
): StoredWorkspacePreferences | undefined {
  const raw = storage.getItem(key);
  if (raw === null || raw === "") {
    return undefined;
  }
  try {
    return parseStoredPreferences(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function parseShell(
  value: unknown,
  legacy: boolean,
): WorkspaceShellLayout | undefined {
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
  const colorScheme = parseColorScheme(value.colorScheme);
  if (!legacy && colorScheme === undefined) {
    return undefined;
  }
  return {
    projectSidebarOpen: value.projectSidebarOpen,
    projectSidebarWidth: clampSidebarWidth(value.projectSidebarWidth),
    archivedPaneOpen:
      typeof value.archivedPaneOpen === "boolean" ? value.archivedPaneOpen : false,
    archivedPaneHeight:
      typeof value.archivedPaneHeight === "number"
        ? clampArchivedPaneHeight(value.archivedPaneHeight)
        : DEFAULT_ARCHIVED_PANE_HEIGHT,
    locale,
    colorScheme: colorScheme ?? DEFAULT_COLOR_SCHEME,
    themeRecipeId: parseThemeRecipeId(value.themeRecipeId),
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
  if ("messages" in value || "proposals" in value) {
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
  const chat = parseChatLayout(value);
  return {
    nodePositions,
    viewport,
    inspectorOpen: value.inspectorOpen,
    inspectorWidth: clampInspectorWidth(value.inspectorWidth),
    ...chat,
  };
}

function parseChatLayout(value: Record<string, unknown>): ReturnType<typeof defaultChatLayout> & {
  chatPosition?: ChatPosition;
} {
  const defaults = defaultChatLayout();
  const chatOpen =
    typeof value.chatOpen === "boolean" ? value.chatOpen : defaults.chatOpen;
  const chatPlacement = parseChatPlacement(value.chatPlacement) ?? defaults.chatPlacement;
  const chatWidth =
    typeof value.chatWidth === "number"
      ? clampChatWidth(value.chatWidth)
      : defaults.chatWidth;
  const chatPosition = parseChatPosition(value.chatPosition);
  const chatPositionOrigin = parseChatOrigin(value.chatPositionOrigin) ?? defaults.chatPositionOrigin;
  const chatBinding = parseChatBinding(value.chatBinding) ?? defaults.chatBinding;
  return {
    chatOpen,
    chatPlacement,
    chatWidth,
    chatPosition,
    chatPositionOrigin,
    chatBinding,
  };
}

function parseChatPlacement(value: unknown): ChatPlacement | undefined {
  return value === "floating" || value === "docked" ? value : undefined;
}

function parseChatOrigin(value: unknown): ChatPositionOrigin | undefined {
  return value === "auto" || value === "user" ? value : undefined;
}

function parseChatPosition(value: unknown): ChatPosition | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.x !== "number" || typeof value.y !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    return undefined;
  }
  return { x: value.x, y: value.y };
}

function parseChatBinding(value: unknown): ChatBinding | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.mode === "follow-focus") {
    return { mode: "follow-focus" };
  }
  if (
    value.mode === "pinned" &&
    typeof value.projectId === "string" &&
    typeof value.nodeId === "string"
  ) {
    return {
      mode: "pinned",
      projectId: value.projectId,
      nodeId: value.nodeId,
    };
  }
  return undefined;
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

function parseColorScheme(value: unknown): ColorScheme | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
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
    chatOpen: layout.chatOpen,
    chatPlacement: layout.chatPlacement,
    chatWidth: layout.chatWidth,
    chatPosition:
      layout.chatPosition === undefined
        ? undefined
        : { x: layout.chatPosition.x, y: layout.chatPosition.y },
    chatPositionOrigin: layout.chatPositionOrigin,
    chatBinding:
      layout.chatBinding.mode === "pinned"
        ? { ...layout.chatBinding }
        : { mode: "follow-focus" },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
