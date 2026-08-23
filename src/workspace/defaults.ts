import type { DomainSnapshot } from "../application/index.js";
import type {
  ChatBinding,
  ChatPosition,
  ColorScheme,
  NodePosition,
  PaneReleaseResult,
  ProjectWorkspaceLayout,
  ResolvedColorScheme,
  ThemeRecipeId,
  Viewport,
  WorkspaceLocale,
  WorkspaceShellLayout,
} from "./types.js";

export const DEFAULT_INSPECTOR_WIDTH = 400;
export const MIN_INSPECTOR_WIDTH = 320;
export const MAX_INSPECTOR_WIDTH = 420;
export const DEFAULT_CHAT_WIDTH = 360;
export const MIN_CHAT_WIDTH = 280;
export const MAX_CHAT_WIDTH = 480;
/** Absolute preference ceiling so floating widths above docked max survive reload. */
export const MAX_STORED_CHAT_WIDTH = 960;
export const DEFAULT_CHAT_HEIGHT = 480;
export const MIN_CHAT_HEIGHT = 240;
export const MAX_CHAT_HEIGHT = 720;
export const MAX_STORED_CHAT_HEIGHT = 960;
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
/** Evaluation default; permanent product default remains an Acceptance decision. */
export const DEFAULT_THEME_RECIPE_ID: ThemeRecipeId = "rose-pine";
export const THEME_RECIPE_IDS = [
  "rose-pine",
  "catppuccin",
  "everforest",
  "nord",
] as const satisfies readonly ThemeRecipeId[];
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
    themeRecipeId: DEFAULT_THEME_RECIPE_ID,
  };
}

export function isThemeRecipeId(value: unknown): value is ThemeRecipeId {
  return (
    value === "rose-pine" ||
    value === "catppuccin" ||
    value === "everforest" ||
    value === "nord"
  );
}

export function parseThemeRecipeId(value: unknown): ThemeRecipeId {
  return isThemeRecipeId(value) ? value : DEFAULT_THEME_RECIPE_ID;
}

export function defaultProjectLayout(
  snapshot: DomainSnapshot,
): ProjectWorkspaceLayout {
  return {
    nodePositions: {},
    viewport: { ...DEFAULT_VIEWPORT },
    inspectorOpen: snapshot.pass.currentFocusNodeId !== undefined,
    inspectorWidth: DEFAULT_INSPECTOR_WIDTH,
    ...defaultChatLayout(),
  };
}

export function defaultChatLayout(): Pick<
  ProjectWorkspaceLayout,
  | "chatOpen"
  | "chatPlacement"
  | "chatWidth"
  | "chatHeight"
  | "chatPosition"
  | "chatPositionOrigin"
  | "chatBinding"
> {
  return {
    chatOpen: false,
    chatPlacement: "docked",
    chatWidth: DEFAULT_CHAT_WIDTH,
    chatHeight: DEFAULT_CHAT_HEIGHT,
    chatPositionOrigin: "auto",
    chatBinding: { mode: "follow-focus" },
  };
}

export function defaultChatBinding(): ChatBinding {
  return { mode: "follow-focus" };
}

export function clampChatWidth(width: number, paneWidth?: number): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_CHAT_WIDTH;
  }
  const paneCap =
    paneWidth !== undefined && Number.isFinite(paneWidth)
      ? Math.max(MIN_CHAT_WIDTH, paneWidth * 0.5)
      : MAX_CHAT_WIDTH;
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), Math.min(MAX_CHAT_WIDTH, paneCap));
}

export function clampFloatingChatWidth(
  width: number,
  viewportWidth?: number,
): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_CHAT_WIDTH;
  }
  const max =
    viewportWidth !== undefined && Number.isFinite(viewportWidth)
      ? Math.max(MIN_CHAT_WIDTH, viewportWidth - 24)
      : MAX_STORED_CHAT_WIDTH;
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), Math.min(MAX_STORED_CHAT_WIDTH, max));
}

export function clampStoredChatWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_CHAT_WIDTH;
  }
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_STORED_CHAT_WIDTH);
}

export function clampChatHeight(
  height: number,
  viewportHeight?: number,
): number {
  if (!Number.isFinite(height)) {
    return DEFAULT_CHAT_HEIGHT;
  }
  const max =
    viewportHeight !== undefined && Number.isFinite(viewportHeight)
      ? Math.max(MIN_CHAT_HEIGHT, viewportHeight - 24)
      : MAX_CHAT_HEIGHT;
  return Math.min(Math.max(height, MIN_CHAT_HEIGHT), Math.min(MAX_CHAT_HEIGHT, max));
}

export function clampStoredChatHeight(height: number): number {
  if (!Number.isFinite(height)) {
    return DEFAULT_CHAT_HEIGHT;
  }
  return Math.min(Math.max(height, MIN_CHAT_HEIGHT), MAX_STORED_CHAT_HEIGHT);
}

/** Usable inset from each viewport edge for floating chat geometry. */
export const FLOATING_CHAT_VIEWPORT_MARGIN = 12;

export interface FloatingChatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Resolve a floating chat resize gesture into a rectangle that stays fully
 * inside the usable viewport. West/north (and matching corners) keep the
 * opposite edge stable while growing/shrinking into the margin.
 */
export function resolveFloatingChatResize(input: {
  handle: string;
  originX: number;
  originY: number;
  startWidth: number;
  startHeight: number;
  dx: number;
  dy: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}): FloatingChatRect {
  const margin = input.margin ?? FLOATING_CHAT_VIEWPORT_MARGIN;
  const viewportW = Math.max(margin * 2 + MIN_CHAT_WIDTH, input.viewportWidth);
  const viewportH = Math.max(margin * 2 + MIN_CHAT_HEIGHT, input.viewportHeight);
  const maxWidth = Math.min(MAX_STORED_CHAT_WIDTH, viewportW - margin * 2);
  const maxHeight = Math.min(MAX_CHAT_HEIGHT, viewportH - margin * 2);

  const anchorEast = input.handle.includes("w");
  const anchorSouth = input.handle.includes("n");
  const growEast = input.handle.includes("e");
  const growSouth = input.handle.includes("s");

  const stableRight = input.originX + input.startWidth;
  const stableBottom = input.originY + input.startHeight;

  let width = input.startWidth;
  let height = input.startHeight;
  let x = input.originX;
  let y = input.originY;

  if (growEast) {
    width = input.startWidth + input.dx;
  }
  if (anchorEast) {
    width = input.startWidth - input.dx;
  }
  if (growSouth) {
    height = input.startHeight + input.dy;
  }
  if (anchorSouth) {
    height = input.startHeight - input.dy;
  }

  width = Math.min(Math.max(width, MIN_CHAT_WIDTH), maxWidth);
  height = Math.min(Math.max(height, MIN_CHAT_HEIGHT), maxHeight);

  if (anchorEast) {
    const maxAnchoredWidth = Math.max(MIN_CHAT_WIDTH, stableRight - margin);
    width = Math.min(width, maxAnchoredWidth, maxWidth);
    x = stableRight - width;
  } else if (growEast) {
    x = input.originX;
    width = Math.min(width, Math.max(MIN_CHAT_WIDTH, viewportW - margin - x));
  } else {
    x = input.originX;
  }

  if (anchorSouth) {
    const maxAnchoredHeight = Math.max(MIN_CHAT_HEIGHT, stableBottom - margin);
    height = Math.min(height, maxAnchoredHeight, maxHeight);
    y = stableBottom - height;
  } else if (growSouth) {
    y = input.originY;
    height = Math.min(height, Math.max(MIN_CHAT_HEIGHT, viewportH - margin - y));
  } else {
    y = input.originY;
  }

  // Final hard bounds so every edge/corner stays fully visible.
  x = Math.min(Math.max(x, margin), Math.max(margin, viewportW - margin - width));
  y = Math.min(Math.max(y, margin), Math.max(margin, viewportH - margin - height));
  if (x + width > viewportW - margin) {
    width = Math.max(MIN_CHAT_WIDTH, viewportW - margin - x);
  }
  if (y + height > viewportH - margin) {
    height = Math.max(MIN_CHAT_HEIGHT, viewportH - margin - y);
  }

  return { x, y, width, height };
}

export function initialFloatingChatPosition(
  nodePosition: NodePosition | undefined,
  viewport: Viewport,
): ChatPosition {
  if (nodePosition === undefined) {
    return { x: 24, y: 24 };
  }
  const x = nodePosition.x * viewport.zoom + viewport.x + 220;
  const y = nodePosition.y * viewport.zoom + viewport.y + 12;
  return {
    x: Number.isFinite(x) ? Math.max(12, x) : 24,
    y: Number.isFinite(y) ? Math.max(12, y) : 24,
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
  const hasAvailable =
    availableHeight !== undefined &&
    Number.isFinite(availableHeight) &&
    availableHeight > MIN_ARCHIVED_PANE_HEIGHT + MIN_ACTIVE_PANE_HEIGHT;
  const maxFromAvailable = hasAvailable
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
