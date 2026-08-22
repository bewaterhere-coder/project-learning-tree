import { useState, type CSSProperties } from "react";
import type { ProjectSummary } from "../../application/index.js";
import type { ProjectId, WorkspaceLocale } from "../../workspace/index.js";
import { ResizeHandle } from "../chrome/ResizeHandle.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";
import { Field, TextInput } from "../primitives/Field.js";
import { Menu } from "../primitives/Menu.js";

export function ProjectSidebar({
  locale,
  open,
  width,
  selectedProjectId,
  summaries,
  archivedSummaries,
  createError,
  onSelectProject,
  onToggle,
  onResize,
  onCreateProject,
  onArchiveProject,
  onRestoreProject,
  onOpenCreate,
  archivedOpen,
  onArchivedOpenChange,
}: {
  locale: WorkspaceLocale;
  open: boolean;
  width: number;
  selectedProjectId: ProjectId | null;
  summaries: ProjectSummary[];
  archivedSummaries: ProjectSummary[];
  createError?: string;
  onSelectProject: (projectId: ProjectId) => void;
  onToggle: () => void;
  onResize: (width: number) => void;
  onCreateProject: (name: string) => boolean;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
  onOpenCreate?: () => void;
  archivedOpen?: boolean;
  onArchivedOpenChange?: (open: boolean) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [menuId, setMenuId] = useState<string>();
  const [localArchivedOpen, setLocalArchivedOpen] = useState(false);
  const archivedExpanded = archivedOpen ?? localArchivedOpen;
  const setArchivedExpanded = onArchivedOpenChange ?? setLocalArchivedOpen;

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
      data-width={String(width)}
      style={{ width: open ? width : 48 }}
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
        <ul className="project-list" data-testid="project-list">
          {summaries.map((summary) => (
            <li key={summary.projectId} className="project-row">
              <button
                type="button"
                className={
                  summary.projectId === selectedProjectId
                    ? "project-item selected"
                    : "project-item"
                }
                data-testid={`project-item-${summary.projectId}`}
                data-selected={
                  summary.projectId === selectedProjectId ? "true" : "false"
                }
                data-blocked={summary.isBlocked ? "true" : "false"}
                onClick={() => onSelectProject(summary.projectId)}
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
              <div className="project-row-menu">
                <button
                  type="button"
                  className="ui-button ui-button-icon"
                  data-testid={`project-actions-${summary.projectId}`}
                  aria-label={t(locale, "sidebar.projectActions")}
                  title={t(locale, "sidebar.projectActions")}
                  onClick={() =>
                    setMenuId((current) =>
                      current === summary.projectId ? undefined : summary.projectId,
                    )
                  }
                >
                  ···
                </button>
                <Menu
                  open={menuId === summary.projectId}
                  onClose={() => setMenuId(undefined)}
                  testId={`project-menu-${summary.projectId}`}
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
                </Menu>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {open && archivedSummaries.length > 0 ? (
        <div className="archived-section">
          <button
            type="button"
            className="archived-toggle"
            data-testid="archived-toggle"
            onClick={() => setArchivedExpanded(!archivedExpanded)}
          >
            {t(locale, "sidebar.archivedTitle")}
          </button>
          {archivedExpanded ? (
            <ul className="project-list archived-list" data-testid="archived-list">
              {archivedSummaries.map((summary) => (
                <li key={summary.projectId} className="project-row">
                  <div className="project-item archived">
                    <span className="project-item-name">{summary.name}</span>
                  </div>
                  <div className="project-row-menu">
                    <button
                      type="button"
                      className="ui-button ui-button-icon"
                      data-testid={`archived-actions-${summary.projectId}`}
                      aria-label={t(locale, "sidebar.projectActions")}
                      title={t(locale, "sidebar.projectActions")}
                      onClick={() =>
                        setMenuId((current) =>
                          current === `a-${summary.projectId}`
                            ? undefined
                            : `a-${summary.projectId}`,
                        )
                      }
                    >
                      ···
                    </button>
                    <Menu
                      open={menuId === `a-${summary.projectId}`}
                      onClose={() => setMenuId(undefined)}
                      testId={`archived-menu-${summary.projectId}`}
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
                    </Menu>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {open ? (
        <ResizeHandle
          testId="sidebar-resize"
          onDelta={(delta) => onResize(width + delta)}
        />
      ) : null}
    </aside>
  );
}
