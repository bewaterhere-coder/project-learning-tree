import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ProjectSummary } from "../../application/index.js";
import type { PaneReleaseResult, ProjectId, WorkspaceLocale } from "../../workspace/index.js";
import {
  COLLAPSED_SIDEBAR_WIDTH,
  resolveArchivedRelease,
  resolveSidebarRelease,
} from "../../workspace/index.js";
import { Pane, PaneDivider, PaneGroup } from "../chrome/Pane.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";
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
  onSelectProject,
  onToggle,
  onSidebarCommit,
  onArchivedCommit,
  onCreateProject,
  onArchiveProject,
  onRestoreProject,
  onOpenCreate,
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
  onSelectProject: (projectId: ProjectId) => void;
  onToggle: () => void;
  onSidebarCommit: (next: PaneReleaseResult) => void;
  onArchivedCommit: (next: PaneReleaseResult) => void;
  onCreateProject: (name: string) => boolean;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
  onOpenCreate?: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [menuId, setMenuId] = useState<string>();
  const [dragWidth, setDragWidth] = useState<number>();
  const [dragHeight, setDragHeight] = useState<number>();
  const dragWidthRef = useRef<number | null>(null);
  const dragHeightRef = useRef<number | null>(null);
  const panesRef = useRef<HTMLDivElement>(null);

  const displayWidth = dragWidth ?? width;
  const displayHeight = dragHeight ?? archivedHeight;
  const dragging = dragWidth !== undefined || dragHeight !== undefined;

  const submitCreate = (): void => {
    if (name.trim() === "") {
      setNameError(t(locale, "sidebar.projectNameEmpty"));
      return;
    }
    const ok = onCreateProject(name);
    if (ok) {
      setName("");
      setNameError(undefined);
      setCreating(false);
    }
  };

  return (
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
                setCreating((value) => !value);
                onOpenCreate?.();
              }}
            >
              +
            </button>
          </>
        ) : null}
      </div>
      {open && creating ? (
        <form
          className="project-create"
          data-testid="project-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitCreate();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setCreating(false);
              setNameError(undefined);
            }
          }}
        >
          <Field
            label={t(locale, "sidebar.projectName")}
            required
            error={nameError}
          >
            <TextInput
              data-testid="project-name-input"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          {createError ? (
            <p className="field-error" role="alert" data-testid="project-create-error">
              {createError}
            </p>
          ) : null}
          <div className="authoring-actions">
            <Button variant="primary" type="submit" data-testid="project-create-submit">
              {t(locale, "project.create")}
            </Button>
            <Button
              variant="ghost"
              data-testid="project-create-cancel"
              onClick={() => {
                setCreating(false);
                setNameError(undefined);
              }}
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
