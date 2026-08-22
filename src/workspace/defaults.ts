import type { DomainSnapshot } from "../application/index.js";
import type {
  ProjectWorkspaceLayout,
  Viewport,
  WorkspaceLocale,
  WorkspaceShellLayout,
} from "./types.js";

export const DEFAULT_INSPECTOR_WIDTH = 400;
export const MIN_INSPECTOR_WIDTH = 320;
export const DEFAULT_SIDEBAR_WIDTH = 260;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 400;
export const DEFAULT_LOCALE: WorkspaceLocale = "en-US";
export const WORKSPACE_PREFERENCES_KEY = "plt.workspace.layout.v1";

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export function defaultShell(): WorkspaceShellLayout {
  return {
    projectSidebarOpen: true,
    projectSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    locale: DEFAULT_LOCALE,
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

export function clampInspectorWidth(
  width: number,
  treePaneWidth?: number,
): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_INSPECTOR_WIDTH;
  }
  const maxFromPane =
    treePaneWidth !== undefined && Number.isFinite(treePaneWidth)
      ? Math.max(MIN_INSPECTOR_WIDTH, treePaneWidth * 0.55)
      : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(width, MIN_INSPECTOR_WIDTH), maxFromPane);
}
