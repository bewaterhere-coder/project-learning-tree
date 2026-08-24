import type { LLMInteractionTrace } from "../../ai/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function LlmTraceDetail({
  locale,
  trace,
  loading,
}: {
  locale: WorkspaceLocale;
  trace: LLMInteractionTrace | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="llm-trace-detail" data-testid="llm-trace-detail-loading">
        <p className="llm-trace-muted">{t(locale, "llmTrace.loading")}</p>
      </div>
    );
  }
  if (!trace) {
    return (
      <div className="llm-trace-detail" data-testid="llm-trace-detail-empty">
        <p className="llm-trace-muted">{t(locale, "llmTrace.selectPrompt")}</p>
      </div>
    );
  }

  return (
    <div className="llm-trace-detail" data-testid="llm-trace-detail">
      <header className="llm-trace-detail-header">
        <span
          className="llm-trace-status"
          data-status={trace.status}
          data-testid="llm-trace-detail-status"
        >
          {trace.status}
        </span>
        <span data-testid="llm-trace-detail-provider">
          {trace.provider}
          {trace.model ? ` · ${trace.model}` : ""}
        </span>
        <span data-testid="llm-trace-detail-duration">{trace.durationMs}ms</span>
      </header>
      <dl className="llm-trace-detail-meta">
        <div>
          <dt>{t(locale, "llmTrace.id")}</dt>
          <dd data-testid="llm-trace-detail-id">{trace.id}</dd>
        </div>
        <div>
          <dt>{t(locale, "llmTrace.createdAt")}</dt>
          <dd>{trace.createdAt}</dd>
        </div>
        <div>
          <dt>{t(locale, "llmTrace.projectId")}</dt>
          <dd>{trace.request.projectId ?? "—"}</dd>
        </div>
        <div>
          <dt>{t(locale, "llmTrace.nodeId")}</dt>
          <dd>{trace.request.nodeId ?? "—"}</dd>
        </div>
        <div>
          <dt>{t(locale, "llmTrace.historyCount")}</dt>
          <dd>{trace.request.historyCount}</dd>
        </div>
        <div>
          <dt>{t(locale, "llmTrace.contextFlags")}</dt>
          <dd>
            node={String(trace.request.hasNode)} · parent=
            {String(trace.request.hasParent)}
          </dd>
        </div>
      </dl>
      <section className="llm-trace-block">
        <h3>{t(locale, "llmTrace.input")}</h3>
        <pre data-testid="llm-trace-detail-input">{trace.input}</pre>
      </section>
      {trace.response ? (
        <section className="llm-trace-block">
          <h3>{t(locale, "llmTrace.response")}</h3>
          <pre data-testid="llm-trace-detail-answer">{trace.response.answer}</pre>
          <p className="llm-trace-muted">
            {t(locale, "llmTrace.suggestionCount")}: {trace.response.suggestionCount}
          </p>
        </section>
      ) : null}
      {trace.error ? (
        <section className="llm-trace-block llm-trace-block-error">
          <h3>{t(locale, "llmTrace.error")}</h3>
          <pre data-testid="llm-trace-detail-error">{trace.error.message}</pre>
          {trace.error.status !== undefined ? (
            <p className="llm-trace-muted">HTTP {trace.error.status}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
