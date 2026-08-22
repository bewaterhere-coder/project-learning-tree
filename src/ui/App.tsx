import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isAuthoringCommand,
  isGlobalDomainError,
  selectActionAvailability,
  selectAuthoringAvailability,
  selectCloseReadiness,
  selectInspectorViewModel,
  selectProjectSummary,
  selectTreeViewModel,
  type DomainSnapshot,
  type UiCommand,
} from "../application/index.js";
import { createDemoWorkspaceFixture } from "../fixtures/demo-workspace.js";
import {
  applyNodeDragStop,
  applySelectedCommand,
  createWorkspace,
  focusAndOpenInspector,
  hydrateWorkspacePreferences,
  saveWorkspacePreferences,
  selectProject,
  selectedProject,
  setInspectorOpen,
  setSelectedViewport,
  updateSelectedLayout,
  updateShell,
  type LearningWorkspace,
  type NodePosition,
  type PreferenceStorage,
  type Viewport,
} from "../workspace/index.js";
import { DomainErrorBanner } from "./errors/DomainErrorBanner.js";
import { formatPresentedError, LocaleProvider, t } from "./i18n/index.js";
import { NodeInspector } from "./inspector/NodeInspector.js";
import { createBrowserPreferenceStorage } from "./persistence/browser-storage.js";
import { ProjectSidebar } from "./sidebar/ProjectSidebar.js";
import { ResizeHandle } from "./chrome/ResizeHandle.js";
import { TreeCanvas } from "./tree/TreeCanvas.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

export function App({
  initialSnapshot,
  initialWorkspace,
  preferenceStorage,
}: {
  initialSnapshot?: DomainSnapshot;
  initialWorkspace?: LearningWorkspace;
  preferenceStorage?: PreferenceStorage;
}) {
  const storage = useMemo(
    () => preferenceStorage ?? createBrowserPreferenceStorage(),
    [preferenceStorage],
  );
  const [workspace, setWorkspace] = useState<LearningWorkspace>(() => {
    const base =
      initialWorkspace ??
      (initialSnapshot
        ? createWorkspace([initialSnapshot])
        : createDemoWorkspaceFixture().workspace);
    return hydrateWorkspacePreferences(base, storage);
  });

  useEffect(() => {
    saveWorkspacePreferences(storage, workspace);
  }, [storage, workspace]);

  const current = selectedProject(workspace);
  const locale = workspace.shell.locale;

  useEffect(() => {
    document.title = t(locale, "app.title");
    document.documentElement.lang = locale;
  }, [locale]);

  const tree = useMemo(
    () => selectTreeViewModel(current.snapshot),
    [current.snapshot],
  );
  const inspector = useMemo(
    () => selectInspectorViewModel(current.snapshot),
    [current.snapshot],
  );
  const availability = useMemo(() => {
    if (inspector.nodeId === undefined) {
      return undefined;
    }
    return selectActionAvailability(current.snapshot, inspector.nodeId);
  }, [inspector.nodeId, current.snapshot]);
  const readiness = useMemo(() => {
    if (inspector.nodeId === undefined) {
      return undefined;
    }
    return selectCloseReadiness(current.snapshot, inspector.nodeId);
  }, [inspector.nodeId, current.snapshot]);
  const authoring = useMemo(() => {
    if (inspector.nodeId === undefined) {
      return undefined;
    }
    return selectAuthoringAvailability(current.snapshot, inspector.nodeId);
  }, [inspector.nodeId, current.snapshot]);
  const summaries = useMemo(
    () =>
      workspace.projects.map((project) => selectProjectSummary(project.snapshot)),
    [workspace.projects],
  );

  const globalError =
    workspace.lastError &&
    isGlobalDomainError(workspace.lastError, workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;
  const authoringError =
    workspace.lastError &&
    isAuthoringCommand(workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;
  const actionError =
    workspace.lastError &&
    !isGlobalDomainError(workspace.lastError, workspace.lastErrorCommand) &&
    !isAuthoringCommand(workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;

  const dispatch = useCallback((command: UiCommand) => {
    setWorkspace((currentWorkspace) =>
      applySelectedCommand(currentWorkspace, command),
    );
  }, []);

  const handleFocusNode = useCallback((nodeId: string) => {
    setWorkspace((currentWorkspace) =>
      focusAndOpenInspector(currentWorkspace, nodeId),
    );
  }, []);

  const handleNodeDragStop = useCallback(
    (positions: Record<string, NodePosition>) => {
      setWorkspace((currentWorkspace) =>
        applyNodeDragStop(currentWorkspace, positions),
      );
    },
    [],
  );

  const handleViewportChange = useCallback((viewport: Viewport) => {
    setWorkspace((currentWorkspace) =>
      setSelectedViewport(currentWorkspace, viewport),
    );
  }, []);

  return (
    <LocaleProvider locale={locale}>
      <div className="shell">
        <header className="shell-header">
          <div>
            <h1>{t(locale, "app.title")}</h1>
            <p className="project-name">{current.snapshot.project.name}</p>
          </div>
          <div className="header-tools">
            <p className="stack-legend" data-testid="active-stack">
              {t(locale, "app.activeStack")}{" "}
              {tree.activeStack.length === 0
                ? t(locale, "app.activeStackEmpty")
                : tree.activeStack
                    .map(
                      (id) =>
                        tree.nodes.find((node) => node.id === id)?.question ?? id,
                    )
                    .join(" → ")}
            </p>
            <div className="locale-switch" data-testid="locale-switch">
              <button
                type="button"
                data-testid="locale-en"
                data-active={locale === "en-US" ? "true" : "false"}
                onClick={() =>
                  setWorkspace((currentWorkspace) =>
                    updateShell(currentWorkspace, { locale: "en-US" }),
                  )
                }
              >
                {t(locale, "app.localeEn")}
              </button>
              <button
                type="button"
                data-testid="locale-zh"
                data-active={locale === "zh-CN" ? "true" : "false"}
                onClick={() =>
                  setWorkspace((currentWorkspace) =>
                    updateShell(currentWorkspace, { locale: "zh-CN" }),
                  )
                }
              >
                {t(locale, "app.localeZh")}
              </button>
            </div>
          </div>
        </header>
        {globalError ? (
          <DomainErrorBanner
            message={formatPresentedError(locale, globalError, current.snapshot)}
            onDismiss={() => dispatch({ type: "dismissError" })}
          />
        ) : null}
        <div className="workspace">
          <ProjectSidebar
            locale={locale}
            open={workspace.shell.projectSidebarOpen}
            width={workspace.shell.projectSidebarWidth}
            selectedProjectId={workspace.selectedProjectId}
            summaries={summaries}
            onSelectProject={(projectId) =>
              setWorkspace((currentWorkspace) =>
                selectProject(currentWorkspace, projectId),
              )
            }
            onToggle={() =>
              setWorkspace((currentWorkspace) =>
                updateShell(currentWorkspace, {
                  projectSidebarOpen: !currentWorkspace.shell.projectSidebarOpen,
                }),
              )
            }
            onResize={(width) =>
              setWorkspace((currentWorkspace) =>
                updateShell(currentWorkspace, { projectSidebarWidth: width }),
              )
            }
          />
          <main className="tree-pane" data-testid="tree-canvas">
            <TreeCanvas
              key={workspace.selectedProjectId}
              model={tree}
              savedPositions={current.layout.nodePositions}
              viewport={current.layout.viewport}
              onFocusNode={handleFocusNode}
              onNodeDragStop={handleNodeDragStop}
              onViewportChange={handleViewportChange}
            />
            {current.layout.inspectorOpen ? (
              <aside
                className="inspector-overlay"
                data-testid="inspector-overlay"
                data-width={String(current.layout.inspectorWidth)}
                style={{ width: current.layout.inspectorWidth }}
              >
                <NodeInspector
                  inspector={inspector}
                  availability={availability}
                  readiness={readiness}
                  authoring={authoring}
                  locale={locale}
                  actionError={
                    actionError
                      ? formatPresentedError(
                          locale,
                          actionError,
                          current.snapshot,
                        )
                      : undefined
                  }
                  authoringError={
                    authoringError
                      ? formatPresentedError(
                          locale,
                          authoringError,
                          current.snapshot,
                        )
                      : undefined
                  }
                  onCommand={dispatch}
                  onClose={() =>
                    setWorkspace((currentWorkspace) =>
                      setInspectorOpen(currentWorkspace, false),
                    )
                  }
                />
                <ResizeHandle
                  invert
                  testId="inspector-resize"
                  onDelta={(delta) =>
                    setWorkspace((currentWorkspace) =>
                      updateSelectedLayout(currentWorkspace, {
                        inspectorWidth:
                          selectedProject(currentWorkspace).layout.inspectorWidth +
                          delta,
                      }),
                    )
                  }
                />
              </aside>
            ) : (
              <button
                type="button"
                className="inspector-open"
                data-testid="inspector-open"
                onClick={() =>
                  setWorkspace((currentWorkspace) =>
                    setInspectorOpen(currentWorkspace, true),
                  )
                }
              >
                {t(locale, "inspector.open")}
              </button>
            )}
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
