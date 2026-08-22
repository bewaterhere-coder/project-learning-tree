import type {
  ActionAvailability,
  InspectorViewModel,
  UiCommand,
} from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function NodeActions({
  nodeId,
  availability,
  locale,
  onCommand,
}: {
  nodeId: string;
  availability: ActionAvailability;
  locale: WorkspaceLocale;
  onCommand: (command: UiCommand) => void;
}) {
  return (
    <div className="node-actions" data-testid="node-actions">
      {availability.canActivate ? (
        <button
          type="button"
          data-testid="action-activate"
          onClick={() => onCommand({ type: "activateNode", nodeId })}
        >
          {t(
            locale,
            availability.activateLabel === "startLearning"
              ? "actions.startLearning"
              : "actions.enterQuestion",
          )}
        </button>
      ) : null}
      {availability.canPark ? (
        <button
          type="button"
          data-testid="action-park"
          onClick={() => onCommand({ type: "parkNode", nodeId })}
        >
          {t(locale, "actions.park")}
        </button>
      ) : null}
      {availability.canResume ? (
        <button
          type="button"
          data-testid="action-resume"
          onClick={() => onCommand({ type: "resumeNode", nodeId })}
        >
          {t(locale, "actions.resume")}
        </button>
      ) : null}
      {availability.canClose ? (
        <button
          type="button"
          data-testid="action-close"
          onClick={() => onCommand({ type: "closeNode", nodeId })}
        >
          {t(locale, "actions.close")}
        </button>
      ) : null}
      {availability.canReturnToParent ? (
        <button
          type="button"
          data-testid="action-return-to-parent"
          onClick={() => onCommand({ type: "returnToParent" })}
        >
          {t(locale, "actions.returnToParent")}
        </button>
      ) : null}
    </div>
  );
}

export function NodeInspector({
  inspector,
  availability,
  locale,
  onCommand,
  onClose,
}: {
  inspector: InspectorViewModel;
  availability?: ActionAvailability;
  locale: WorkspaceLocale;
  onCommand: (command: UiCommand) => void;
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
      {availability ? (
        <NodeActions
          nodeId={inspector.nodeId}
          availability={availability}
          locale={locale}
          onCommand={onCommand}
        />
      ) : null}
      <dl className="inspector-fields">
        <div>
          <dt>{t(locale, "inspector.question")}</dt>
          <dd data-testid="inspector-question">{inspector.question}</dd>
        </div>
        <div>
          <dt>{t(locale, "inspector.goal")}</dt>
          <dd data-testid="inspector-goal">{inspector.goal}</dd>
        </div>
        <div>
          <dt>{t(locale, "inspector.targetDepth")}</dt>
          <dd data-testid="inspector-depth">{inspector.targetDepth}</dd>
        </div>
        <div>
          <dt>{t(locale, "inspector.lifecycle")}</dt>
          <dd data-testid="inspector-lifecycle">{inspector.lifecycle}</dd>
        </div>
        <div>
          <dt>{t(locale, "inspector.blocked")}</dt>
          <dd data-testid="inspector-blocked">
            {inspector.isBlocked
              ? t(locale, "inspector.blockedYes")
              : t(locale, "inspector.blockedNo")}
          </dd>
        </div>
      </dl>

      <h3>{t(locale, "inspector.dod")}</h3>
      {inspector.definitionOfDone.length === 0 ? (
        <p className="empty">{t(locale, "inspector.noCriteria")}</p>
      ) : (
        <ul data-testid="inspector-dod">
          {inspector.definitionOfDone.map((criterion) => (
            <li key={criterion.id}>
              <strong>{criterion.description}</strong>
              <span>
                {" "}
                ({criterion.required
                  ? t(locale, "inspector.required")
                  : t(locale, "inspector.optional")}
                , {criterion.status}
                {criterion.evidenceRequired
                  ? `, ${t(locale, "inspector.evidenceRequired")}`
                  : ""}
                )
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>{t(locale, "inspector.evidence")}</h3>
      {inspector.evidence.length === 0 ? (
        <p className="empty">{t(locale, "inspector.noEvidence")}</p>
      ) : (
        <ul data-testid="inspector-evidence">
          {inspector.evidence.map((item) => (
            <li key={item.id}>
              {item.type}: {item.reference}
              {item.note ? ` — ${item.note}` : ""}
            </li>
          ))}
        </ul>
      )}

      <h3>{t(locale, "inspector.summary")}</h3>
      <p data-testid="inspector-summary">
        {inspector.summary ?? t(locale, "inspector.noSummary")}
      </p>
    </section>
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
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
