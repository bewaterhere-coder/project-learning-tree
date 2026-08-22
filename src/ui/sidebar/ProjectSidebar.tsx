import type { CSSProperties } from "react";
import type { ProjectSummary } from "../../application/index.js";
import { t } from "../i18n/index.js";
import { ResizeHandle } from "../chrome/ResizeHandle.js";
import type { ProjectId, WorkspaceLocale } from "../../workspace/index.js";

export function ProjectSidebar({
  locale,
  open,
  width,
  selectedProjectId,
  summaries,
  onSelectProject,
  onToggle,
  onResize,
}: {
  locale: WorkspaceLocale;
  open: boolean;
  width: number;
  selectedProjectId: ProjectId;
  summaries: ProjectSummary[];
  onSelectProject: (projectId: ProjectId) => void;
  onToggle: () => void;
  onResize: (width: number) => void;
}) {
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
          className="sidebar-toggle"
          data-testid="sidebar-toggle"
          aria-label={open ? t(locale, "sidebar.collapse") : t(locale, "sidebar.expand")}
          onClick={onToggle}
        >
          {open ? "‹" : "›"}
        </button>
        {open ? (
          <h2 data-testid="sidebar-title">{t(locale, "sidebar.title")}</h2>
        ) : null}
      </div>
      {open ? (
        <ul className="project-list" data-testid="project-list">
          {summaries.map((summary) => (
            <li key={summary.projectId}>
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
            </li>
          ))}
        </ul>
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
