import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isAuthoringCommand,
  isEmptyFirstLayer,
  isGlobalDomainError,
  isProjectCreateCommand,
  isProjectMetadataCommand,
  selectActionAvailability,
  selectAuthoringAvailability,
  selectCloseReadiness,
  selectCoreQuestionAuthoring,
  selectInspectorViewModel,
  selectProjectSummary,
  selectTreeViewModel,
  type DomainSnapshot,
  type UiCommand,
} from "../application/index.js";
import {
  applyNodeDragStop,
  applySelectedCommand,
  archiveProject,
  createWorkspace,
  createWorkspaceProject,
  focusAndOpenInspector,
  hydrateSemanticWorkspaceWithMigration,
  hydrateWorkspacePreferences,
  openChat,
  openChatForNode,
  reconcileThemeHint,
  resolveColorScheme,
  restoreProject,
  saveSemanticWorkspace,
  saveWorkspacePreferences,
  selectProject,
  selectedProject,
  setInspectorOpen,
  setSelectedViewport,
  updateSelectedLayout,
  updateShell,
  updateWorkspaceProjectMetadata,
  clampInspectorWidth,
  type ColorScheme,
  type LearningWorkspace,
  type NodePosition,
  type PreferenceStorage,
  type ProjectId,
  type Viewport,
} from "../workspace/index.js";
import type { ChatProvider } from "../ai/index.js";
import type { ConversationStore } from "../conversation/index.js";
import type { RepositoryEvidenceProvider } from "../application/index.js";
import { createGitHubRepositoryEvidenceProvider } from "../infrastructure/index.js";
import { ChatHost } from "./chat/ChatHost.js";
import { DomainErrorBanner } from "./errors/DomainErrorBanner.js";
import { formatPresentedError, LocaleProvider, t } from "./i18n/index.js";
import { ContextualWorkspace } from "./contextual/ContextualWorkspace.js";
import { NodeDetails } from "./contextual/NodeDetails.js";
import { createBrowserPreferenceStorage } from "./persistence/browser-storage.js";
import { ProjectSidebar } from "./sidebar/ProjectSidebar.js";
import { TreeCanvas } from "./tree/TreeCanvas.js";
import { Button } from "./primitives/Button.js";
import { EmptyState } from "./primitives/EmptyState.js";
import { Menu } from "./primitives/Menu.js";
import { CoreQuestionForm } from "./projects/CoreQuestionForm.js";
import { BootstrapSummary } from "./projects/BootstrapSummary.js";
import { permanentlyDeleteArchivedProject } from "./projects/permanent-delete.js";
import { applyResolvedTheme, systemPrefersDark } from "./theme/apply-theme.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

function bootWorkspace(
  storage: PreferenceStorage,
  initialWorkspace?: LearningWorkspace,
  initialSnapshot?: DomainSnapshot,
): LearningWorkspace {
  if (initialWorkspace) {
    return hydrateWorkspacePreferences(initialWorkspace, storage);
  }
  if (initialSnapshot) {
    return hydrateWorkspacePreferences(createWorkspace([initialSnapshot]), storage);
  }
  const { workspace, migratedProjectIds } =
    hydrateSemanticWorkspaceWithMigration(storage);
  return hydrateWorkspacePreferences(workspace, storage, {
    clearPositionsForProjectIds: migratedProjectIds,
  });
}

export function App({
  initialSnapshot,
  initialWorkspace,
  preferenceStorage,
  conversationStore,
  chatProvider,
  evidenceProvider,
}: {
  initialSnapshot?: DomainSnapshot;
  initialWorkspace?: LearningWorkspace;
  preferenceStorage?: PreferenceStorage;
  conversationStore?: ConversationStore;
  chatProvider?: ChatProvider;
  evidenceProvider?: RepositoryEvidenceProvider;
}) {
  const storage = useMemo(
    () => preferenceStorage ?? createBrowserPreferenceStorage(),
    [preferenceStorage],
  );
  const [workspace, setWorkspace] = useState<LearningWorkspace>(() =>
    bootWorkspace(storage, initialWorkspace, initialSnapshot),
  );
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coreFormOpen, setCoreFormOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const resolvedEvidenceProvider = useMemo(
    () => evidenceProvider ?? createGitHubRepositoryEvidenceProvider(),
    [evidenceProvider],
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const [inspectorDragWidth, setInspectorDragWidth] = useState<number>();
  const inspectorDragRef = useRef<number | null>(null);
  const [viewportPersistLocked, setViewportPersistLocked] = useState(false);
  const viewportUnlockTimer = useRef<number | undefined>(undefined);

  const lockViewportPersist = useCallback(() => {
    if (viewportUnlockTimer.current !== undefined) {
      window.clearTimeout(viewportUnlockTimer.current);
      viewportUnlockTimer.current = undefined;
    }
    setViewportPersistLocked(true);
  }, []);

  const unlockViewportPersist = useCallback(() => {
    if (viewportUnlockTimer.current !== undefined) {
      window.clearTimeout(viewportUnlockTimer.current);
    }
    viewportUnlockTimer.current = window.setTimeout(() => {
      setViewportPersistLocked(false);
      viewportUnlockTimer.current = undefined;
    }, 200);
  }, []);
  const [assistInput, setAssistInput] = useState<string>();
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const resolvedTheme = resolveColorScheme(workspace.shell.colorScheme, systemDark);

  useEffect(() => {
    saveWorkspacePreferences(storage, workspace);
  }, [storage, workspace]);

  useLayoutEffect(() => {
    applyResolvedTheme(resolvedTheme);
    reconcileThemeHint(storage, workspace.shell.colorScheme, systemDark);
  }, [resolvedTheme, storage, systemDark, workspace.shell.colorScheme]);

  useEffect(() => {
    const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) {
      return;
    }
    const onChange = () => {
      setSystemDark(media.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const current = selectedProject(workspace);
  const locale = workspace.shell.locale;

  useEffect(() => {
    document.title = t(locale, "app.title");
    document.documentElement.lang = locale;
  }, [locale]);

  const tree = useMemo(
    () => (current ? selectTreeViewModel(current.snapshot) : undefined),
    [current],
  );
  const inspector = useMemo(
    () => (current ? selectInspectorViewModel(current.snapshot) : undefined),
    [current],
  );
  const availability = useMemo(() => {
    if (!current || inspector?.nodeId === undefined) {
      return undefined;
    }
    return selectActionAvailability(current.snapshot, inspector.nodeId);
  }, [inspector?.nodeId, current]);
  const readiness = useMemo(() => {
    if (!current || inspector?.nodeId === undefined) {
      return undefined;
    }
    return selectCloseReadiness(current.snapshot, inspector.nodeId);
  }, [inspector?.nodeId, current]);
  const authoring = useMemo(() => {
    if (!current || inspector?.nodeId === undefined) {
      return undefined;
    }
    return selectAuthoringAvailability(current.snapshot, inspector.nodeId);
  }, [inspector?.nodeId, current]);
  const coreAuthoring = useMemo(
    () => (current ? selectCoreQuestionAuthoring(current.snapshot) : undefined),
    [current],
  );
  const summaries = useMemo(
    () =>
      workspace.projects
        .filter((project) => !project.archived)
        .map((project) => selectProjectSummary(project.snapshot)),
    [workspace.projects],
  );
  const archivedSummaries = useMemo(
    () =>
      workspace.projects
        .filter((project) => project.archived)
        .map((project) => selectProjectSummary(project.snapshot)),
    [workspace.projects],
  );

  const globalError =
    workspace.lastError &&
    isGlobalDomainError(workspace.lastError, workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;
  const authoringError =
    workspace.lastError &&
    isAuthoringCommand(workspace.lastErrorCommand) &&
    workspace.lastErrorCommand !== "addCoreQuestion"
      ? workspace.lastError
      : undefined;
  const coreAuthoringError =
    workspace.lastError && workspace.lastErrorCommand === "addCoreQuestion"
      ? workspace.lastError
      : undefined;
  const createError =
    workspace.lastError && isProjectCreateCommand(workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;
  const editError =
    workspace.lastError && isProjectMetadataCommand(workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;
  const actionError =
    workspace.lastError &&
    !isGlobalDomainError(workspace.lastError, workspace.lastErrorCommand) &&
    !isAuthoringCommand(workspace.lastErrorCommand) &&
    !isProjectCreateCommand(workspace.lastErrorCommand) &&
    !isProjectMetadataCommand(workspace.lastErrorCommand)
      ? workspace.lastError
      : undefined;

  const commit = useCallback(
    (next: LearningWorkspace, semantic: boolean) => {
      workspaceRef.current = next;
      if (semantic) {
        saveSemanticWorkspace(storage, next);
      }
      setWorkspace(next);
      return next;
    },
    [storage],
  );

  const runCommand = useCallback(
    (command: UiCommand): { ok: boolean; errorMessage?: string } => {
      const currentWorkspace = workspaceRef.current;
      const next = applySelectedCommand(currentWorkspace, command);
      const before = selectedProject(currentWorkspace)?.snapshot;
      const after = selectedProject(next)?.snapshot;
      commit(next, before !== after);
      if (next.lastError) {
        return {
          ok: false,
          errorMessage: formatPresentedError(
            currentWorkspace.shell.locale,
            next.lastError,
            after ?? before,
          ),
        };
      }
      return { ok: true };
    },
    [commit],
  );

  const dispatch = useCallback(
    (command: UiCommand): boolean => runCommand(command).ok,
    [runCommand],
  );

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const currentWorkspace = workspaceRef.current;
      const next = focusAndOpenInspector(currentWorkspace, nodeId);
      const before = selectedProject(currentWorkspace)?.snapshot;
      const after = selectedProject(next)?.snapshot;
      commit(next, before !== after);
    },
    [commit],
  );

  const handleOpenChatForNode = useCallback(
    (nodeId: string) => {
      const currentWorkspace = workspaceRef.current;
      const next = openChatForNode(currentWorkspace, nodeId);
      const before = selectedProject(currentWorkspace)?.snapshot;
      const after = selectedProject(next)?.snapshot;
      commit(next, before !== after);
    },
    [commit],
  );

  const handleNodeDragStop = useCallback(
    (positions: Record<string, NodePosition>) => {
      commit(applyNodeDragStop(workspaceRef.current, positions), false);
    },
    [commit],
  );

  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      commit(setSelectedViewport(workspaceRef.current, viewport), false);
    },
    [commit],
  );

  const inspectorOpen = current?.layout.inspectorOpen === true;
  const prevInspectorOpenRef = useRef(inspectorOpen);
  useEffect(() => {
    if (prevInspectorOpenRef.current === inspectorOpen) {
      return;
    }
    prevInspectorOpenRef.current = inspectorOpen;
    lockViewportPersist();
    unlockViewportPersist();
  }, [inspectorOpen, lockViewportPersist, unlockViewportPersist]);

  useEffect(() => {
    return () => {
      if (viewportUnlockTimer.current !== undefined) {
        window.clearTimeout(viewportUnlockTimer.current);
      }
    };
  }, []);

  const breadcrumb =
    tree && tree.activeStack.length > 0
      ? tree.activeStack
          .map((id) => tree.nodes.find((node) => node.id === id)?.question ?? id)
          .join(" › ")
      : "";

  const emptyProject = current !== undefined && isEmptyFirstLayer(current.snapshot);

  return (
    <LocaleProvider locale={locale}>
      <div className="shell" data-testid="shell" data-theme={resolvedTheme}>
        <header className="shell-header">
          <div className="header-identity">
            <h1
              className={current ? "app-title" : "app-title is-primary"}
              data-testid="app-title"
            >
              {t(locale, "app.title")}
            </h1>
            {current ? (
              <p className="project-title" data-testid="project-title">
                {current.snapshot.project.name}
              </p>
            ) : null}
            {breadcrumb ? (
              <p className="stack-legend" data-testid="active-stack">
                {breadcrumb}
              </p>
            ) : (
              <p className="stack-legend is-empty" data-testid="active-stack" hidden>
                {t(locale, "app.activeStackEmpty")}
              </p>
            )}
          </div>
          <div className="header-tools">
            {current ? (
              <Button
                variant="secondary"
                data-testid="chat-open-header"
                onClick={() =>
                  commit(openChat(workspaceRef.current), false)
                }
              >
                {t(
                  locale,
                  current.snapshot.pass.currentFocusNodeId
                    ? "chat.open"
                    : "chat.openProject",
                )}
              </Button>
            ) : null}
            <div className="settings-anchor">
              <button
                ref={settingsTriggerRef}
                type="button"
                className="ui-button ui-button-icon"
                data-testid="settings-open"
                aria-label={t(locale, "app.settings")}
                aria-haspopup="menu"
                aria-expanded={settingsOpen}
                title={t(locale, "app.settings")}
                onClick={() => setSettingsOpen((value) => !value)}
              >
                ⚙
              </button>
              <Menu
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                testId="settings-menu"
                anchorRef={settingsTriggerRef}
                anchorId="settings"
              >
                <p className="settings-label">{t(locale, "app.language")}</p>
                <div className="locale-switch" data-testid="locale-switch">
                  <button
                    type="button"
                    data-testid="locale-en"
                    data-active={locale === "en-US" ? "true" : "false"}
                    onClick={() =>
                      commit(updateShell(workspaceRef.current, { locale: "en-US" }), false)
                    }
                  >
                    {t(locale, "app.localeEn")}
                  </button>
                  <button
                    type="button"
                    data-testid="locale-zh"
                    data-active={locale === "zh-CN" ? "true" : "false"}
                    onClick={() =>
                      commit(updateShell(workspaceRef.current, { locale: "zh-CN" }), false)
                    }
                  >
                    {t(locale, "app.localeZh")}
                  </button>
                </div>
                <p className="settings-label">{t(locale, "app.appearance")}</p>
                <div className="theme-switch" data-testid="theme-switch">
                  {(["system", "light", "dark"] as ColorScheme[]).map((scheme) => (
                    <button
                      key={scheme}
                      type="button"
                      data-testid={`theme-${scheme}`}
                      data-active={
                        workspace.shell.colorScheme === scheme ? "true" : "false"
                      }
                      onClick={() =>
                        commit(
                          updateShell(workspaceRef.current, { colorScheme: scheme }),
                          false,
                        )
                      }
                    >
                      {t(
                        locale,
                        scheme === "system"
                          ? "app.themeSystem"
                          : scheme === "light"
                            ? "app.themeLight"
                            : "app.themeDark",
                      )}
                    </button>
                  ))}
                </div>
              </Menu>
            </div>
          </div>
        </header>
        {globalError && current ? (
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
            archivedOpen={workspace.shell.archivedPaneOpen}
            archivedHeight={workspace.shell.archivedPaneHeight}
            selectedProjectId={workspace.selectedProjectId}
            summaries={summaries}
            archivedSummaries={archivedSummaries}
            createError={
              createError
                ? formatPresentedError(locale, createError)
                : undefined
            }
            editError={
              editError
                ? formatPresentedError(locale, editError)
                : undefined
            }
            onSelectProject={(projectId) =>
              commit(selectProject(workspaceRef.current, projectId), true)
            }
            onArchiveProject={(projectId) =>
              commit(archiveProject(workspaceRef.current, projectId), true)
            }
            onRestoreProject={(projectId) =>
              commit(restoreProject(workspaceRef.current, projectId), true)
            }
            onUpdateProject={(projectId, input) => {
              const next = updateWorkspaceProjectMetadata(
                workspaceRef.current,
                projectId,
                input,
              );
              const failed = isProjectMetadataCommand(next.lastErrorCommand);
              commit(next, !failed);
              return !failed;
            }}
            onDeleteProject={async (projectId: ProjectId) => {
              await permanentlyDeleteArchivedProject({
                workspace: workspaceRef.current,
                projectId,
                commit,
                conversationStore,
              });
            }}
            onToggle={() =>
              commit(
                updateShell(workspaceRef.current, {
                  projectSidebarOpen: !workspaceRef.current.shell.projectSidebarOpen,
                }),
                false,
              )
            }
            onSidebarCommit={(next) =>
              commit(
                updateShell(workspaceRef.current, {
                  projectSidebarOpen: next.open,
                  projectSidebarWidth: next.size,
                }),
                false,
              )
            }
            onArchivedCommit={(next) =>
              commit(
                updateShell(workspaceRef.current, {
                  archivedPaneOpen: next.open,
                  archivedPaneHeight: next.size,
                }),
                false,
              )
            }
            createPending={creatingProject}
            onCreateProject={async (input) => {
              setCreatingProject(true);
              try {
                const next = await createWorkspaceProject(workspaceRef.current, input, {
                  provider: resolvedEvidenceProvider,
                });
                const failed = isProjectCreateCommand(next.lastErrorCommand);
                commit(next, !failed);
                if (!failed) {
                  setCoreFormOpen(false);
                }
                return !failed;
              } finally {
                setCreatingProject(false);
              }
            }}
          />
          <div className="workspace-body">
          <main className="tree-pane" data-testid="tree-canvas">
            {!current ? (
              <EmptyState
                testId="workspace-empty"
                title={t(locale, "workspace.emptyTitle")}
                body={t(locale, "workspace.emptyBody")}
              >
                <Button
                  variant="primary"
                  data-testid="workspace-empty-create"
                  onClick={() => {
                    const plus = document.querySelector<HTMLButtonElement>(
                      '[data-testid="project-create-open"]',
                    );
                    plus?.click();
                  }}
                >
                  {t(locale, "workspace.emptyCreate")}
                </Button>
                {archivedSummaries.length > 0 ? (
                  <Button
                    variant="ghost"
                    data-testid="workspace-view-archived"
                    onClick={() =>
                      commit(
                        updateShell(workspaceRef.current, { archivedPaneOpen: true }),
                        false,
                      )
                    }
                  >
                    {t(locale, "sidebar.viewArchived")}
                  </Button>
                ) : null}
              </EmptyState>
            ) : (
              <>
                {emptyProject ? (
                  <EmptyState
                    testId="project-empty"
                    title={t(locale, "project.emptyTitle")}
                    body={t(locale, "project.emptyBody")}
                  >
                    {coreFormOpen && coreAuthoring ? (
                      <CoreQuestionForm
                        locale={locale}
                        remaining={coreAuthoring.remaining}
                        atLimit={coreAuthoring.atLimit}
                        authoringError={
                          coreAuthoringError
                            ? formatPresentedError(
                                locale,
                                coreAuthoringError,
                                current.snapshot,
                              )
                            : undefined
                        }
                        onCommand={dispatch}
                      />
                    ) : (
                      <Button
                        variant="secondary"
                        data-testid="project-empty-add-core"
                        onClick={() => setCoreFormOpen(true)}
                      >
                        {t(locale, "project.addCore")}
                      </Button>
                    )}
                  </EmptyState>
                ) : (
                  <>
                    {current.bootstrap ? (
                      <BootstrapSummary
                        locale={locale}
                        record={current.bootstrap}
                        snapshot={current.snapshot}
                        onFocusNode={handleFocusNode}
                      />
                    ) : null}
                    {tree ? (
                      <TreeCanvas
                        key={workspace.selectedProjectId ?? "none"}
                        model={tree}
                        savedPositions={current.layout.nodePositions}
                        viewport={current.layout.viewport}
                        persistViewport={!viewportPersistLocked}
                        recommendedNodeIds={
                          current.bootstrap?.recommendedFocusNodeIds ?? []
                        }
                        onFocusNode={handleFocusNode}
                        onOpenChatForNode={handleOpenChatForNode}
                        onNodeDragStop={handleNodeDragStop}
                        onViewportChange={handleViewportChange}
                      />
                    ) : null}
                    {coreAuthoring?.canAdd ? (
                      <div className="canvas-core-action">
                        {coreFormOpen ? (
                          <CoreQuestionForm
                            locale={locale}
                            remaining={coreAuthoring.remaining}
                            atLimit={coreAuthoring.atLimit}
                            authoringError={
                              coreAuthoringError
                                ? formatPresentedError(
                                    locale,
                                    coreAuthoringError,
                                    current.snapshot,
                                  )
                                : undefined
                            }
                            onCommand={(command) => {
                              const ok = dispatch(command);
                              if (ok) {
                                setCoreFormOpen(false);
                              }
                              return ok;
                            }}
                            onCancel={() => setCoreFormOpen(false)}
                          />
                        ) : (
                          <Button
                            variant="secondary"
                            data-testid="add-core-question"
                            onClick={() => setCoreFormOpen(true)}
                          >
                            {t(locale, "project.addCore")}
                          </Button>
                        )}
                      </div>
                    ) : coreAuthoring?.atLimit ? (
                      <p className="canvas-core-limit" data-testid="core-question-limit-reached">
                        {t(locale, "project.coreLimit")}
                      </p>
                    ) : null}
                  </>
                )}
                {!inspectorOpen ? (
                  <button
                    type="button"
                    className="inspector-open ui-button ui-button-secondary"
                    data-testid="inspector-open"
                    aria-label={t(locale, "inspector.open")}
                    title={t(locale, "inspector.open")}
                    onClick={() =>
                      commit(setInspectorOpen(workspaceRef.current, true), false)
                    }
                  >
                    {t(locale, "inspector.open")}
                  </button>
                ) : null}
                {current ? (
                  <ChatHost
                    locale={locale}
                    current={current}
                    inspector={inspector}
                    workspace={workspace}
                    storage={storage}
                    conversationStore={conversationStore}
                    chatProvider={chatProvider}
                    assistInput={assistInput}
                    onAssistConsumed={() => setAssistInput(undefined)}
                    onWorkspace={(next, semantic) => commit(next, semantic)}
                    runCommand={runCommand}
                  />
                ) : null}
              </>
            )}
          </main>
          {current && inspectorOpen && inspector ? (
            <ContextualWorkspace
              width={inspectorDragWidth ?? current.layout.inspectorWidth}
              locale={locale}
              onResizeDrag={(delta) => {
                lockViewportPersist();
                const base =
                  inspectorDragRef.current ??
                  selectedProject(workspaceRef.current)?.layout.inspectorWidth ??
                  current.layout.inspectorWidth;
                const next = clampInspectorWidth(base + delta);
                inspectorDragRef.current = next;
                setInspectorDragWidth(next);
              }}
              onResizeRelease={() => {
                const next =
                  inspectorDragRef.current ?? current.layout.inspectorWidth;
                inspectorDragRef.current = null;
                setInspectorDragWidth(undefined);
                commit(
                  updateSelectedLayout(workspaceRef.current, {
                    inspectorWidth: next,
                  }),
                  false,
                );
                unlockViewportPersist();
              }}
            >
              <NodeDetails
                inspector={inspector}
                availability={availability}
                readiness={readiness}
                authoring={authoring}
                locale={locale}
                actionError={
                  actionError
                    ? formatPresentedError(locale, actionError, current.snapshot)
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
                  commit(setInspectorOpen(workspaceRef.current, false), false)
                }
                onOpenChat={() =>
                  commit(openChat(workspaceRef.current), false)
                }
                onAskSummary={() => {
                  commit(openChat(workspaceRef.current), false);
                  setAssistInput("整理当前学习结果");
                }}
              />
            </ContextualWorkspace>
          ) : null}
          </div>
        </div>
      </div>
    </LocaleProvider>
  );
}
