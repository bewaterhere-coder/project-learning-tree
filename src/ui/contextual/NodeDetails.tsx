import { useEffect, useState } from "react";
import type {
  CloseReadiness,
  InspectorViewModel,
  UiCommand,
} from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { Button } from "../primitives/Button.js";
import { criterionStatusKey, t } from "../i18n/index.js";

export function NodeDetails({
  inspector,
  readiness,
  locale,
  actionError,
  onCommand,
  onClose,
}: {
  inspector: InspectorViewModel;
  readiness?: CloseReadiness;
  locale: WorkspaceLocale;
  actionError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onClose: () => void;
}) {
  if (!inspector.hasFocus || inspector.nodeId === undefined) {
    return (
      <section className="inspector" data-testid="node-inspector">
        <InspectorChrome locale={locale} onClose={onClose} />
        <p className="empty">{t(locale, "inspector.noFocus")}</p>
      </section>
    );
  }

  return (
    <section className="inspector" data-testid="node-inspector">
      <InspectorChrome locale={locale} onClose={onClose} />
      <div className="details-section">
        <h3 className="details-heading">{t(locale, "inspector.question")}</h3>
        <p data-testid="inspector-question">{inspector.question}</p>
        {inspector.goal ? (
          <p className="inspector-goal" data-testid="inspector-goal">
            {inspector.goal}
          </p>
        ) : null}
      </div>

      <CriteriaSection
        nodeId={inspector.nodeId}
        criteria={inspector.definitionOfDone}
        locale={locale}
        onCommand={onCommand}
      />

      <ReflectionSection
        nodeId={inspector.nodeId}
        summary={inspector.summary}
        readiness={readiness}
        locale={locale}
        onCommand={onCommand}
      />

      {actionError ? (
        <p className="node-action-error" role="alert" data-testid="node-action-error">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}

function CriteriaSection({
  nodeId,
  criteria,
  locale,
  onCommand,
}: {
  nodeId: string;
  criteria: InspectorViewModel["definitionOfDone"];
  locale: WorkspaceLocale;
  onCommand: (command: UiCommand) => boolean | void;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
  }, [nodeId]);

  return (
    <div className="details-section" data-testid="inspector-dod-section">
      <h3 data-testid="inspector-dod-heading">{t(locale, "inspector.dod")}</h3>
      {criteria.length === 0 ? (
        <p className="empty">{t(locale, "inspector.noCriteria")}</p>
      ) : (
        <ul data-testid="inspector-dod">
          {criteria.map((criterion) => (
            <li key={criterion.id}>
              <strong>{criterion.description}</strong>
              <span>
                {" "}
                ({t(locale, criterionStatusKey(criterion.status))})
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="criterion-add-form"
        data-testid="criterion-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const description = draft.trim();
          if (description === "") {
            return;
          }
          const ok = onCommand({
            type: "addCriterion",
            nodeId,
            description,
            required: true,
            evidenceRequired: false,
          });
          if (ok !== false) {
            setDraft("");
          }
        }}
      >
        <label>
          {t(locale, "inspector.addCriterion")}
          <input
            type="text"
            data-testid="criterion-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <Button type="submit" data-testid="criterion-add-submit">
          {t(locale, "inspector.addCriterionSubmit")}
        </Button>
      </form>
    </div>
  );
}

function ReflectionSection({
  nodeId,
  summary,
  readiness,
  locale,
  onCommand,
}: {
  nodeId: string;
  summary?: string;
  readiness?: CloseReadiness;
  locale: WorkspaceLocale;
  onCommand: (command: UiCommand) => boolean | void;
}) {
  const [draft, setDraft] = useState(summary ?? "");

  useEffect(() => {
    setDraft(summary ?? "");
  }, [nodeId, summary]);

  const summaryRequirement = readiness?.requirements.find(
    (requirement) => requirement.kind === "summary",
  );

  return (
    <div className="details-section" data-testid="inspector-summary-section">
      <h3 data-testid="inspector-summary-heading">
        {t(locale, "inspector.summary")}
        {summaryRequirement && !summaryRequirement.met ? (
          <span className="requirement-status unmet" data-testid="summary-status">
            ! {t(locale, "status.missingSummary")}
          </span>
        ) : null}
      </h3>
      <textarea
        className="reflection-input"
        data-testid="inspector-summary"
        rows={5}
        value={draft}
        placeholder={t(locale, "inspector.noSummary")}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = draft.trim();
          const previous = (summary ?? "").trim();
          if (next === previous) {
            return;
          }
          onCommand({ type: "setNodeSummary", nodeId, summary: next });
        }}
      />
    </div>
  );
}

function InspectorChrome({
  locale,
  onClose,
}: {
  locale: WorkspaceLocale;
  onClose: () => void;
}) {
  return (
    <div className="inspector-chrome">
      <h2>{t(locale, "inspector.title")}</h2>
      <button
        type="button"
        className="inspector-close"
        data-testid="inspector-close"
        aria-label={t(locale, "inspector.close")}
        title={t(locale, "inspector.close")}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
