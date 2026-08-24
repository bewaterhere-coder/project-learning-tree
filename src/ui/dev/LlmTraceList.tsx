import type { WorkspaceLocale } from "../../workspace/index.js";
import type { LlmTraceListItem } from "../../infrastructure/index.js";
import { t } from "../i18n/index.js";

export function LlmTraceList({
  locale,
  traces,
  selectedId,
  onSelect,
}: {
  locale: WorkspaceLocale;
  traces: LlmTraceListItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (traces.length === 0) {
    return (
      <div className="llm-trace-list" data-testid="llm-trace-list-empty">
        <p className="llm-trace-muted">{t(locale, "llmTrace.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="llm-trace-list" data-testid="llm-trace-list">
      {traces.map((trace) => (
        <li key={trace.id}>
          <button
            type="button"
            className="llm-trace-row"
            data-testid={`llm-trace-row-${trace.id}`}
            data-selected={selectedId === trace.id ? "true" : "false"}
            data-status={trace.status}
            onClick={() => onSelect(trace.id)}
          >
            <span className="llm-trace-status" data-status={trace.status}>
              {trace.status}
            </span>
            <span className="llm-trace-row-main">
              <span className="llm-trace-row-meta">
                {trace.provider}
                {trace.model ? ` · ${trace.model}` : ""} · {trace.durationMs}ms
              </span>
              <span className="llm-trace-row-preview">{trace.inputPreview}</span>
            </span>
            <time dateTime={trace.createdAt}>{formatTime(trace.createdAt)}</time>
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}
