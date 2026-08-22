import type { DomainSnapshot } from "../application/index.js";
import type {
  ColorScheme,
  PaneReleaseResult,
  ProjectWorkspaceLayout,
  ResolvedColorScheme,
  Viewport,
  WorkspaceLocale,
  WorkspaceShellLayout,
} from "./types.js";

export const DEFAULT_INSPECTOR_WIDTH = 400;
export const MIN_INSPECTOR_WIDTH = 320;
export const MAX_INSPECTOR_WIDTH = 420;
export const DEFAULT_SIDEBAR_WIDTH = 260;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 360;
export const COLLAPSED_SIDEBAR_WIDTH = 48;
export const SIDEBAR_COLLAPSE_THRESHOLD = 80;
export const DEFAULT_ARCHIVED_PANE_HEIGHT = 168;
export const MIN_ARCHIVED_PANE_HEIGHT = 96;
export const MAX_ARCHIVED_PANE_HEIGHT = 480;
export const MIN_ACTIVE_PANE_HEIGHT = 120;
export const ARCHIVED_COLLAPSE_THRESHOLD = 56;
export const DEFAULT_LOCALE: WorkspaceLocale = "en-US";
export const DEFAULT_COLOR_SCHEME: ColorScheme = "system";
export const WORKSPACE_PREFERENCES_KEY = "plt.workspace.layout.v2";
export const WORKSPACE_PREFERENCES_KEY_V1 = "plt.workspace.layout.v1";
export const WORKSPACE_SEMANTIC_KEY = "plt.workspace.semantic.v1";
export const WORKSPACE_THEME_HINT_KEY = "plt.workspace.theme";

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export function defaultShell(): WorkspaceShellLayout {
  return {
    projectSidebarOpen: true,
    projectSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    archivedPaneOpen: false,
    archivedPaneHeight: DEFAULT_ARCHIVED_PANE_HEIGHT,
    locale: DEFAULT_LOCALE,
    colorScheme: DEFAULT_COLOR_SCHEME,
  };
}

export function defaultProjectLayout(
  snapshot: DomainSnapshot,
): ProjectWorkspaceLayout {
  return {
    nodePositions: {},
    viewport: { ...DEFAULT_VIEWPORT },
    inspectorOpen: snapshot.pass.currentFocusNodeId !== undefined,
    inspectorWidth: DEFAULT_INSPECTOR_WIDTH,
  };
}

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

export function clampArchivedPaneHeight(
  height: number,
  availableHeight?: number,
): number {
  if (!Number.isFinite(height)) {
    return DEFAULT_ARCHIVED_PANE_HEIGHT;
  }
  const maxFromAvailable =
    availableHeight !== undefined && Number.isFinite(availableHeight)
      ? Math.max(MIN_ARCHIVED_PANE_HEIGHT, availableHeight - MIN_ACTIVE_PANE_HEIGHT)
      : MAX_ARCHIVED_PANE_HEIGHT;
  return Math.min(
    Math.max(height, MIN_ARCHIVED_PANE_HEIGHT),
    Math.min(MAX_ARCHIVED_PANE_HEIGHT, maxFromAvailable),
  );
}

export function resolveSidebarRelease(
  dragWidth: number,
  lastExpandedWidth: number,
): PaneReleaseResult {
  const remembered = clampSidebarWidth(lastExpandedWidth);
  if (!Number.isFinite(dragWidth)) {
    return { open: true, size: remembered };
  }
  if (dragWidth <= SIDEBAR_COLLAPSE_THRESHOLD) {
    return { open: false, size: remembered };
  }
  return { open: true, size: clampSidebarWidth(dragWidth) };
}

export function resolveArchivedRelease(
  dragHeight: number,
  lastExpandedHeight: number,
  availableHeight?: number,
): PaneReleaseResult {
  const remembered = clampArchivedPaneHeight(lastExpandedHeight, availableHeight);
  if (!Number.isFinite(dragHeight)) {
    return { open: true, size: remembered };
  }
  if (dragHeight <= ARCHIVED_COLLAPSE_THRESHOLD) {
    return { open: false, size: remembered };
  }
  return {
    open: true,
    size: clampArchivedPaneHeight(dragHeight, availableHeight),
  };
}

export function clampInspectorWidth(
  width: number,
  treePaneWidth?: number,
): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_INSPECTOR_WIDTH;
  }
  const paneCap =
    treePaneWidth !== undefined && Number.isFinite(treePaneWidth)
      ? Math.max(MIN_INSPECTOR_WIDTH, treePaneWidth * 0.36)
      : MAX_INSPECTOR_WIDTH;
  return Math.min(
    Math.max(width, MIN_INSPECTOR_WIDTH),
    Math.min(MAX_INSPECTOR_WIDTH, paneCap),
  );
}

export function resolveColorScheme(
  colorScheme: ColorScheme,
  systemPrefersDark: boolean,
): ResolvedColorScheme {
  if (colorScheme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return colorScheme;
}
