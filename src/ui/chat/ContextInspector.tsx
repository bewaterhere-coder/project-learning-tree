import { useState } from "react";
import type { ContextInspectorView } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function ContextInspector({
  locale,
  view,
}: {
  locale: WorkspaceLocale;
  view: ContextInspectorView;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="chat-context" data-testid="chat-context">
      <button
        type="button"
        data-testid="chat-context-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        {t(locale, "chat.context")}
      </button>
      {open ? (
        <dl className="chat-context-body" data-testid="chat-context-body">
          {view.kind === "project" ? (
            <>
              <div>
                <dt>{t(locale, "chat.contextProject")}</dt>
                <dd data-testid="context-project">{view.projectName}</dd>
              </div>
              {view.currentQuestion ? (
                <div>
                  <dt>{t(locale, "chat.contextCurrent")}</dt>
                  <dd>{view.currentQuestion}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t(locale, "chat.contextPath")}</dt>
                <dd data-testid="context-path">
                  {view.learningPath.join(" → ") || t(locale, "app.activeStackEmpty")}
                </dd>
              </div>
              {view.frontierQuestions.length > 0 ? (
                <div>
                  <dt>{t(locale, "chat.contextFrontier")}</dt>
                  <dd>{view.frontierQuestions.join("；")}</dd>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div>
                <dt>{t(locale, "chat.contextCurrent")}</dt>
                <dd data-testid="context-current">{view.currentQuestion}</dd>
              </div>
              <div>
                <dt>{t(locale, "chat.contextParent")}</dt>
                <dd data-testid="context-parent">{view.parentQuestion ?? "—"}</dd>
              </div>
              <div>
                <dt>{t(locale, "chat.contextPath")}</dt>
                <dd data-testid="context-path">{view.learningPath.join(" → ")}</dd>
              </div>
              <div>
                <dt>{t(locale, "chat.contextDod")}</dt>
                <dd data-testid="context-dod">
                  {view.completionRequirements.join("；") || "—"}
                </dd>
              </div>
              <div>
                <dt>{t(locale, "chat.contextEvidence")}</dt>
                <dd data-testid="context-evidence">
                  {view.evidence.join("；") || "—"}
                </dd>
              </div>
              <div>
                <dt>{t(locale, "chat.contextConversation")}</dt>
                <dd data-testid="context-conversation">
                  {view.conversationPreview.join(" / ") || "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
      ) : null}
    </section>
  );
}
