import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  resolveProjectName,
  type ProjectSummary,
} from "../../application/index.js";
import type { PaneReleaseResult, ProjectId, WorkspaceLocale } from "../../workspace/index.js";
import {
  COLLAPSED_SIDEBAR_WIDTH,
  resolveArchivedRelease,
  resolveSidebarRelease,
} from "../../workspace/index.js";
import { Pane, PaneDivider, PaneGroup } from "../chrome/Pane.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";
import { ConfirmDialog } from "../primitives/ConfirmDialog.js";
import { Field, TextInput } from "../primitives/Field.js";
import { Menu } from "../primitives/Menu.js";

export function ProjectSidebar({
  locale,
  open,
  width,
  archivedOpen,
  archivedHeight,
  selectedProjectId,
  summaries,
  archivedSummaries,
  createError,
  editError,
  onSelectProject,
  onToggle,
  onSidebarCommit,
  onArchivedCommit,
  onCreateProject,
  onUpdateProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onOpenCreate,
  createPending = false,
}: {
  locale: WorkspaceLocale;
  open: boolean;
  width: number;
  archivedOpen: boolean;
  archivedHeight: number;
  selectedProjectId: ProjectId | null;
  summaries: ProjectSummary[];
  archivedSummaries: ProjectSummary[];
  createError?: string;
  editError?: string;
  onSelectProject: (projectId: ProjectId) => void;
  onToggle: () => void;
  onSidebarCommit: (next: PaneReleaseResult) => void;
  onArchivedCommit: (next: PaneReleaseResult) => void;
  onCreateProject: (input: {
    name?: string;
    source?: string;
    description?: string;
  }) => boolean | Promise<boolean>;
  onUpdateProject: (
    projectId: ProjectId,
    input: { name: string; source?: string; description?: string },
  ) => boolean;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
  onDeleteProject: (projectId: ProjectId) => void | Promise<void>;
  onOpenCreate?: () => void;
  createPending?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<ProjectId>();
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary>();
  const [dragWidth, setDragWidth] = useState<number>();
  const [dragHeight, setDragHeight] = useState<number>();
  const dragWidthRef = useRef<number | null>(null);
  const dragHeightRef = useRef<number | null>(null);
  const panesRef = useRef<HTMLDivElement>(null);

  const displayWidth = dragWidth ?? width;
  const displayHeight = dragHeight ?? archivedHeight;
  const dragging = dragWidth !== undefined || dragHeight !== undefined;
  const createBusy = createPending || submitting;
  const formOpen = creating || editingId !== undefined;

  const resetForm = (): void => {
    setName("");
    setSource("");
    setDescription("");
    setNameError(undefined);
    setCreating(false);
    setEditingId(undefined);
  };

  const beginEdit = (summary: ProjectSummary): void => {
    setCreating(false);
    setEditingId(summary.projectId);
    setName(summary.name);
    setSource(summary.source ?? "");
    setDescription(summary.description ?? "");
    setNameError(undefined);
    setMenuId(undefined);
  };

  const submitForm = async (): Promise<void> => {
    if (createBusy) {
      return;
    }
    const resolvedName = resolveProjectName({ name, source });
    if (resolvedName === undefined) {
      setNameError(t(locale, "sidebar.projectNameOrSource"));
      return;
    }
    setSubmitting(true);
    try {
      if (editingId !== undefined) {
        const ok = onUpdateProject(editingId, {
          name: resolvedName,
          source: source.trim() || undefined,
          description: description.trim() || undefined,
        });
        if (ok) {
          resetForm();
        }
        return;
      }
      const ok = await onCreateProject({
        name: name.trim() || resolvedName,
        source: source.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (ok) {
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <aside
      className={open ? "project-sidebar" : "project-sidebar collapsed"}
      data-testid="project-sidebar"
      data-open={open ? "true" : "false"}
      data-width={String(displayWidth)}
      data-dragging={dragging ? "true" : "false"}
      style={{ width: open ? displayWidth : COLLAPSED_SIDEBAR_WIDTH }}
    >
      <div className="project-sidebar-header">
        <button
          type="button"
          className="sidebar-toggle ui-button ui-button-icon"
          data-testid="sidebar-toggle"
          aria-label={open ? t(locale, "sidebar.collapse") : t(locale, "sidebar.expand")}
          title={open ? t(locale, "sidebar.collapse") : t(locale, "sidebar.expand")}
          onClick={onToggle}
        >
          {open ? "‹" : "›"}
        </button>
        {open ? (
          <>
            <h2 data-testid="sidebar-title">{t(locale, "sidebar.title")}</h2>
            <button
              type="button"
              className="ui-button ui-button-icon"
              data-testid="project-create-open"
              aria-label={t(locale, "sidebar.create")}
              title={t(locale, "sidebar.create")}
              onClick={() => {
                setEditingId(undefined);
                setCreating((value) => !value);
                setNameError(undefined);
                onOpenCreate?.();
              }}
            >
              +
            </button>
          </>
        ) : null}
      </div>
      {open && formOpen ? (
        <form
          className="project-create"
          data-testid={editingId ? "project-edit-form" : "project-create-form"}
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              resetForm();
            }
          }}
        >
          <Field
            label={t(locale, "sidebar.projectName")}
            required={editingId !== undefined}
            error={nameError}
          >
            <TextInput
              data-testid={editingId ? "project-edit-name-input" : "project-name-input"}
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field
            label={t(locale, "sidebar.projectSource")}
            helper={t(locale, "sidebar.projectSourceHelper")}
          >
            <TextInput
              data-testid={
                editingId ? "project-edit-source-input" : "project-source-input"
              }
              value={source}
              placeholder={t(locale, "sidebar.projectSourcePlaceholder")}
              onChange={(event) => setSource(event.target.value)}
            />
          </Field>
          <Field label={t(locale, "sidebar.projectDescription")}>
            <TextInput
              data-testid={
                editingId
                  ? "project-edit-description-input"
                  : "project-description-input"
              }
              value={description}
              placeholder={t(locale, "sidebar.projectDescriptionPlaceholder")}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          {(editingId ? editError : createError) ? (
            <p
              className="field-error"
              role="alert"
              data-testid={editingId ? "project-edit-error" : "project-create-error"}
            >
              {editingId ? editError : createError}
            </p>
          ) : null}
          <div className="authoring-actions">
            <Button
              variant="primary"
              type="submit"
              data-testid={
                editingId ? "project-edit-submit" : "project-create-submit"
              }
              disabled={createBusy}
              aria-busy={createBusy}
            >
              {editingId
                ? t(locale, "project.editSave")
                : createBusy
                  ? t(locale, "project.creating")
                  : t(locale, "project.create")}
            </Button>
            <Button
              variant="ghost"
              data-testid={
                editingId ? "project-edit-cancel" : "project-create-cancel"
              }
              onClick={resetForm}
            >
              {t(locale, "project.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
      {open ? (
        <PaneGroup
          orientation="vertical"
          className="sidebar-panes"
          testId="sidebar-panes"
        >
          <div className="sidebar-panes-body" ref={panesRef}>
            <Pane className="active-pane" testId="active-pane">
              <ul className="project-list" data-testid="project-list">
                {summaries.map((summary) => (
                  <ProjectRow
                    key={summary.projectId}
                    summary={summary}
                    selected={summary.projectId === selectedProjectId}
                    locale={locale}
                    menuOpen={menuId === summary.projectId}
                    onSelect={() => onSelectProject(summary.projectId)}
                    onToggleMenu={() =>
                      setMenuId((current) =>
                        current === summary.projectId ? undefined : summary.projectId,
                      )
                    }
                    onCloseMenu={() => setMenuId(undefined)}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      data-testid={`project-edit-${summary.projectId}`}
                      onClick={() => beginEdit(summary)}
                    >
                      {t(locale, "sidebar.edit")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid={`project-archive-${summary.projectId}`}
                      onClick={() => {
                        onArchiveProject(summary.projectId);
                        setMenuId(undefined);
                      }}
                    >
                      {t(locale, "sidebar.archive")}
                    </button>
                  </ProjectRow>
                ))}
              </ul>
            </Pane>
            {archivedSummaries.length > 0 ? (
              <>
                <PaneDivider
                  invert
                  orientation="horizontal"
                  testId="archived-resize"
                  label={t(locale, "sidebar.archivedResize")}
                  onDrag={(delta) => {
                    if (!Number.isFinite(delta)) {
                      return;
                    }
                    const base =
                      dragHeightRef.current ??
                      (archivedOpen ? archivedHeight : ARCHIVED_HEADER_HEIGHT);
                    const next = Math.max(0, base + delta);
                    dragHeightRef.current = next;
                    setDragHeight(next);
                  }}
                  onRelease={() => {
                    const next = resolveArchivedRelease(
                      dragHeightRef.current ?? archivedHeight,
                      archivedHeight,
                      panesRef.current?.clientHeight,
                    );
                    dragHeightRef.current = null;
                    setDragHeight(undefined);
                    onArchivedCommit(next);
                    setMenuId(undefined);
                  }}
                />
                <Pane
                  className="archived-pane"
                  collapsed={!archivedOpen && dragHeight === undefined}
                  size={
                    archivedOpen || dragHeight !== undefined ? displayHeight : undefined
                  }
                  testId="archived-pane"
                  style={
                    !archivedOpen && dragHeight === undefined
                      ? undefined
                      : { height: displayHeight }
                  }
                >
                  <button
                    type="button"
                    className="archived-toggle"
                    data-testid="archived-toggle"
                    aria-expanded={archivedOpen}
                    onClick={() =>
                      onArchivedCommit({
                        open: !archivedOpen,
                        size: archivedHeight,
                      })
                    }
                  >
                    {t(locale, "sidebar.archivedTitle")}
                  </button>
                  {archivedOpen || dragHeight !== undefined ? (
                    <ul className="project-list archived-list" data-testid="archived-list">
                      {archivedSummaries.map((summary) => (
                        <ProjectRow
                          key={summary.projectId}
                          summary={summary}
                          archived
                          locale={locale}
                          menuOpen={menuId === `a-${summary.projectId}`}
                          onToggleMenu={() =>
                            setMenuId((current) =>
                              current === `a-${summary.projectId}`
                                ? undefined
                                : `a-${summary.projectId}`,
                            )
                          }
                          onCloseMenu={() => setMenuId(undefined)}
                          triggerTestId={`archived-actions-${summary.projectId}`}
                          menuTestId={`archived-menu-${summary.projectId}`}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            data-testid={`project-restore-${summary.projectId}`}
                            onClick={() => {
                              onRestoreProject(summary.projectId);
                              setMenuId(undefined);
                            }}
                          >
                            {t(locale, "sidebar.restore")}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="menu-item-danger"
                            data-testid={`project-delete-${summary.projectId}`}
                            onClick={() => {
                              setPendingDelete(summary);
                              setMenuId(undefined);
                            }}
                          >
                            {t(locale, "sidebar.deletePermanently")}
                          </button>
                        </ProjectRow>
                      ))}
                    </ul>
                  ) : null}
                </Pane>
              </>
            ) : null}
          </div>
        </PaneGroup>
      ) : null}
      {open ? (
        <PaneDivider
          orientation="vertical"
          testId="sidebar-resize"
          label={t(locale, "sidebar.resize")}
          onDrag={(delta) => {
            if (!Number.isFinite(delta)) {
              return;
            }
            const base = dragWidthRef.current ?? width;
            const next = Math.max(0, base + delta);
            dragWidthRef.current = next;
            setDragWidth(next);
          }}
          onRelease={() => {
            const next = resolveSidebarRelease(dragWidthRef.current ?? width, width);
            dragWidthRef.current = null;
            setDragWidth(undefined);
            onSidebarCommit(next);
            setMenuId(undefined);
          }}
        />
      ) : null}
    </aside>
      {pendingDelete ? (
        <ConfirmDialog
          title={t(locale, "sidebar.deleteConfirmTitle", {
            name: pendingDelete.name,
          })}
          body={t(locale, "sidebar.deleteConfirmBody")}
          cancelLabel={t(locale, "sidebar.deleteConfirmCancel")}
          confirmLabel={t(locale, "sidebar.deleteConfirmSubmit")}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            const projectId = pendingDelete.projectId;
            setPendingDelete(undefined);
            void onDeleteProject(projectId);
          }}
        />
      ) : null}
    </>
  );
}

const ARCHIVED_HEADER_HEIGHT = 40;

function ProjectRow({
  summary,
  selected = false,
  archived = false,
  locale,
  menuOpen,
  onSelect,
  onToggleMenu,
  onCloseMenu,
  children,
  triggerTestId,
  menuTestId,
}: {
  summary: ProjectSummary;
  selected?: boolean;
  archived?: boolean;
  locale: WorkspaceLocale;
  menuOpen: boolean;
  onSelect?: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  children: ReactNode;
  triggerTestId?: string;
  menuTestId?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const actionsId = triggerTestId ?? `project-actions-${summary.projectId}`;
  const menuId = menuTestId ?? `project-menu-${summary.projectId}`;

  return (
    <li className="project-row">
      {archived ? (
        <div className="project-item archived">
          <span className="project-item-name">{summary.name}</span>
        </div>
      ) : (
        <button
          type="button"
          className={selected ? "project-item selected" : "project-item"}
          data-testid={`project-item-${summary.projectId}`}
          data-selected={selected ? "true" : "false"}
          data-blocked={summary.isBlocked ? "true" : "false"}
          onClick={onSelect}
        >
          <span className="project-item-name">{summary.name}</span>
          <span
            className="project-completion"
            data-testid={`project-completion-${summary.projectId}`}
            data-completion={String(summary.completionLevel)}
            style={
              {
                "--completion": String(summary.completionLevel),
              } as CSSProperties
            }
          >
            <span className="project-completion-fill" />
          </span>
          <span
            className="project-active-question"
            data-testid={`project-active-${summary.projectId}`}
          >
            {summary.activeQuestion ?? t(locale, "sidebar.noActiveQuestion")}
          </span>
          {summary.isBlocked ? (
            <span
              className="project-blocked-signal"
              data-testid={`project-blocked-${summary.projectId}`}
            >
              {t(locale, "node.blocked", {
                count: summary.unresolvedBlockerCount,
              })}
            </span>
          ) : null}
        </button>
      )}
      <div className="project-row-menu">
        <button
          ref={triggerRef}
          type="button"
          className="ui-button ui-button-icon"
          data-testid={actionsId}
          aria-label={t(locale, "sidebar.projectActions")}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={t(locale, "sidebar.projectActions")}
          onClick={onToggleMenu}
        >
          ···
        </button>
        <Menu
          open={menuOpen}
          onClose={onCloseMenu}
          testId={menuId}
          anchorRef={triggerRef}
          anchorId={summary.projectId}
        >
          {children}
        </Menu>
      </div>
    </li>
  );
}
