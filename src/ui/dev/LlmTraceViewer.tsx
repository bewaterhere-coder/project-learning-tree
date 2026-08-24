import { useEffect, useMemo, useState } from "react";
import type { LLMInteractionTrace } from "../../ai/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import {
  createLlmTraceApiClient,
  type LlmTraceApiClient,
  type LlmTraceListItem,
} from "../../infrastructure/index.js";
import { Button } from "../primitives/Button.js";
import { ConfirmDialog } from "../primitives/ConfirmDialog.js";
import { t } from "../i18n/index.js";
import { LlmTraceDetail } from "./LlmTraceDetail.js";
import { LlmTraceList } from "./LlmTraceList.js";

export function LlmTraceViewer({
  locale,
  open,
  onClose,
  apiUrl,
  client,
}: {
  locale: WorkspaceLocale;
  open: boolean;
  onClose: () => void;
  /** When undefined, shows Chat API not configured. */
  apiUrl: string | undefined;
  client?: LlmTraceApiClient;
}) {
  const [traces, setTraces] = useState<LlmTraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [detail, setDetail] = useState<LLMInteractionTrace | undefined>();
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirmClear, setConfirmClear] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const resolvedClient = useMemo(() => {
    if (client) {
      return client;
    }
    if (!apiUrl) {
      return undefined;
    }
    return createLlmTraceApiClient({ apiUrl });
  }, [client, apiUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!resolvedClient) {
      setTraces([]);
      setTotal(0);
      setDetail(undefined);
      setSelectedId(undefined);
      setError(undefined);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    setError(undefined);
    void resolvedClient
      .listTraces({ limit: 50 })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setTraces(result.traces);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setTraces([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : t(locale, "llmTrace.loadError"));
      })
      .finally(() => {
        if (!cancelled) {
          setListLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, resolvedClient, locale, reloadToken]);

  useEffect(() => {
    if (!open || !selectedId || !resolvedClient) {
      setDetail(undefined);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void resolvedClient
      .getTrace(selectedId)
      .then((trace) => {
        if (!cancelled) {
          setDetail(trace);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(undefined);
          setError(err instanceof Error ? err.message : t(locale, "llmTrace.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedId, resolvedClient, locale]);

  if (!open) {
    return null;
  }

  const refresh = () => {
    setReloadToken((value) => value + 1);
  };

  const clearAll = () => {
    if (!resolvedClient) {
      return;
    }
    void resolvedClient
      .clearTraces()
      .then(() => {
        setTraces([]);
        setTotal(0);
        setSelectedId(undefined);
        setDetail(undefined);
        setConfirmClear(false);
      })
      .catch((err: unknown) => {
        setConfirmClear(false);
        setError(err instanceof Error ? err.message : t(locale, "llmTrace.loadError"));
      });
  };

  return (
    <div
      className="llm-trace-viewer-backdrop"
      role="presentation"
      data-testid="llm-trace-viewer-backdrop"
      onClick={onClose}
    >
      <div
        className="llm-trace-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="llm-trace-viewer-title"
        data-testid="llm-trace-viewer"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="llm-trace-viewer-header">
          <div>
            <h2 id="llm-trace-viewer-title">{t(locale, "llmTrace.title")}</h2>
            <p className="llm-trace-muted">{t(locale, "llmTrace.subtitle")}</p>
          </div>
          <div className="llm-trace-viewer-actions">
            <Button
              variant="secondary"
              data-testid="llm-trace-refresh"
              disabled={!resolvedClient || listLoading}
              onClick={refresh}
            >
              {t(locale, "llmTrace.refresh")}
            </Button>
            <Button
              variant="danger"
              data-testid="llm-trace-clear"
              disabled={!resolvedClient || traces.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              {t(locale, "llmTrace.clear")}
            </Button>
            <Button
              variant="secondary"
              data-testid="llm-trace-close"
              onClick={onClose}
            >
              {t(locale, "llmTrace.close")}
            </Button>
          </div>
        </header>

        {!resolvedClient ? (
          <p className="llm-trace-banner" data-testid="llm-trace-unconfigured">
            {t(locale, "llmTrace.unconfigured")}
          </p>
        ) : null}
        {error ? (
          <p className="llm-trace-banner llm-trace-banner-error" data-testid="llm-trace-error">
            {error}
          </p>
        ) : null}

        <div className="llm-trace-viewer-body">
          <aside className="llm-trace-viewer-side">
            <p className="llm-trace-count" data-testid="llm-trace-count">
              {listLoading
                ? t(locale, "llmTrace.loading")
                : t(locale, "llmTrace.count").replace("{count}", String(total))}
            </p>
            <LlmTraceList
              locale={locale}
              traces={traces}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </aside>
          <LlmTraceDetail locale={locale} trace={detail} loading={detailLoading} />
        </div>
      </div>

      {confirmClear ? (
        <ConfirmDialog
          title={t(locale, "llmTrace.clearConfirmTitle")}
          body={t(locale, "llmTrace.clearConfirmBody")}
          cancelLabel={t(locale, "llmTrace.clearConfirmCancel")}
          confirmLabel={t(locale, "llmTrace.clearConfirmSubmit")}
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearAll}
          testId="llm-trace-clear-confirm"
          cancelTestId="llm-trace-clear-cancel"
          confirmTestId="llm-trace-clear-submit"
        />
      ) : null}
    </div>
  );
}
