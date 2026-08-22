import type {
  CloseReadiness,
  CloseRequirement,
  InspectorViewModel,
  UiCommand,
} from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { Button } from "../primitives/Button.js";
import { criterionStatusKey, t } from "../i18n/index.js";

function RequiredMarker() {
  return (
    <span className="required-marker" aria-hidden="true">
      *{" "}
    </span>
  );
}

function RequirementStatus({
  locale,
  requirement,
  testId,
}: {
  locale: WorkspaceLocale;
  requirement: CloseRequirement;
  testId: string;
}) {
  if (requirement.met) {
    return (
      <span className="requirement-status met" data-testid={testId}>
        ✓ {t(locale, "status.done")}
      </span>
    );
  }

  const message =
    requirement.kind === "summary"
      ? t(locale, "status.missingSummary")
      : requirement.kind === "criterion"
        ? t(locale, "status.criterionUnmet")
        : requirement.kind === "evidence"
          ? t(locale, "status.missingEvidence")
          : t(locale, "status.openChildren", { count: requirement.count });

  return (
    <span className="requirement-status unmet" data-testid={testId}>
      ! {message}
    </span>
  );
}

function unmetLabel(locale: WorkspaceLocale, requirement: CloseRequirement): string {
  switch (requirement.kind) {
    case "summary":
      return t(locale, "close.needSummary");
    case "criterion":
      return t(locale, "close.needCriterion", {
        description: requirement.description,
      });
    case "evidence":
      return t(locale, "close.needEvidence", {
        description: requirement.description,
      });
    case "blockingChildren":
      if (requirement.questions.length === 1 && requirement.questions[0]) {
        return t(locale, "close.needChild", {
          question: requirement.questions[0],
        });
      }
      return t(locale, "close.needChildren", { count: requirement.count });
  }
}

export function NodeDetails({
  inspector,
  readiness,
  locale,
  actionError,
  onCommand,
  onClose,
  onComplete,
  onAskSummary,
}: {
  inspector: InspectorViewModel;
  readiness?: CloseReadiness;
  locale: WorkspaceLocale;
  actionError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onClose: () => void;
  onComplete: () => void;
  onAskSummary?: () => void;
}) {
  if (!inspector.hasFocus || inspector.nodeId === undefined) {
    return (
      <section className="inspector" data-testid="node-inspector">
        <InspectorChrome locale={locale} onClose={onClose} />
        <p className="empty">{t(locale, "inspector.noFocus")}</p>
      </section>
    );
  }

  const showCloseRequirements = inspector.lifecycle !== "closed";
  const summaryRequirement = readiness?.requirements.find(
    (requirement) => requirement.kind === "summary",
  );
  const hasRequiredCriterion = (readiness?.requirements ?? []).some(
    (requirement) => requirement.kind === "criterion",
  );
  const hasRequiredEvidence = (readiness?.requirements ?? []).some(
    (requirement) => requirement.kind === "evidence",
  );
  const unmet = (readiness?.requirements ?? []).filter(
    (requirement) => !requirement.met,
  );

  return (
    <section className="inspector" data-testid="node-inspector">
      <InspectorChrome locale={locale} onClose={onClose} />
      <div className="details-section">
        <h3 className="details-heading">{t(locale, "inspector.question")}</h3>
        <p className="inspector-question" data-testid="inspector-question">
          {inspector.question}
        </p>
      </div>
      <div className="details-section">
        <h3 className="details-heading" data-testid="inspector-dod-heading">
          {showCloseRequirements && hasRequiredCriterion ? <RequiredMarker /> : null}
          {t(locale, "inspector.criteria")}
        </h3>
        {inspector.definitionOfDone.length === 0 ? (
          <p className="empty">{t(locale, "inspector.noCriteria")}</p>
        ) : (
          <ul data-testid="inspector-dod">
            {inspector.definitionOfDone.map((criterion) => {
              const criterionRequirement = readiness?.requirements.find(
                (requirement) =>
                  requirement.kind === "criterion" &&
                  requirement.criterionId === criterion.id,
              );
              return (
                <li key={criterion.id}>
                  <strong>
                    {showCloseRequirements && criterion.required ? (
                      <RequiredMarker />
                    ) : null}
                    {criterion.description}
                  </strong>
                  <span>
                    {" "}
                    ({criterion.required
                      ? t(locale, "inspector.required")
                      : t(locale, "inspector.optional")}
                    , {t(locale, criterionStatusKey(criterion.status))}
                    {criterion.evidenceRequired
                      ? `, ${t(locale, "inspector.evidenceRequired")}`
                      : ""}
                    )
                  </span>
                  {showCloseRequirements && criterionRequirement ? (
                    <RequirementStatus
                      locale={locale}
                      requirement={criterionRequirement}
                      testId={`criterion-status-${criterion.id}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {showCloseRequirements
          ? readiness?.requirements
              .filter((requirement) => requirement.kind === "evidence")
              .map((requirement) => (
                <RequirementStatus
                  key={requirement.criterionId}
                  locale={locale}
                  requirement={requirement}
                  testId={`evidence-status-${requirement.criterionId}`}
                />
              ))
          : null}
        {showCloseRequirements && hasRequiredEvidence ? (
          <>
            <h4 data-testid="inspector-evidence-heading">
              <span data-testid="evidence-required-marker">
                <RequiredMarker />
              </span>
              {t(locale, "inspector.evidence")}
            </h4>
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
            {readiness?.requirements
              .filter((requirement) => requirement.kind === "evidence")
              .map((requirement) => (
                <RequirementStatus
                  key={requirement.criterionId}
                  locale={locale}
                  requirement={requirement}
                  testId={`evidence-status-${requirement.criterionId}`}
                />
              ))}
          </>
        ) : inspector.evidence.length > 0 ? (
          <>
            <h4 data-testid="inspector-evidence-heading">{t(locale, "inspector.evidence")}</h4>
            <ul data-testid="inspector-evidence">
              {inspector.evidence.map((item) => (
                <li key={item.id}>
                  {item.type}: {item.reference}
                  {item.note ? ` — ${item.note}` : ""}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div className="details-section">
        <h3 className="details-heading" data-testid="inspector-summary-heading">
          {showCloseRequirements && summaryRequirement ? (
            <span data-testid="summary-required-marker">
              <RequiredMarker />
            </span>
          ) : null}
          {t(locale, "inspector.notes")}
          {showCloseRequirements && summaryRequirement ? (
            <RequirementStatus
              locale={locale}
              requirement={summaryRequirement}
              testId="summary-status"
            />
          ) : null}
        </h3>
        <p data-testid="inspector-summary">
          {inspector.summary ?? t(locale, "inspector.noSummary")}
        </p>
        {showCloseRequirements &&
        summaryRequirement &&
        !summaryRequirement.met &&
        onAskSummary ? (
          <Button
            variant="ghost"
            data-testid="close-ask-ai-summary"
            onClick={onAskSummary}
          >
            {t(locale, "close.askAiSummary")}
          </Button>
        ) : null}
      </div>
      {inspector.lifecycle !== "closed" && readiness ? (
        <div className="details-section details-complete">
          <Button
            variant="primary"
            data-testid="action-close"
            disabled={!readiness.allowed}
            onClick={onComplete}
          >
            {t(locale, "actions.close")}
          </Button>
          {unmet.length > 0 ? (
            <div className="close-unmet" data-testid="close-unmet">
              <p>{t(locale, "close.stillNeeded")}</p>
              <ul>
                {unmet.flatMap((requirement, index) => {
                  if (
                    requirement.kind === "blockingChildren" &&
                    requirement.questions.length > 0
                  ) {
                    return requirement.questions.map((question) => (
                      <li key={`child-${question}`}>
                        * {t(locale, "close.needChild", { question })}
                      </li>
                    ));
                  }
                  return [
                    <li key={`${requirement.kind}-${index}`}>
                      * {unmetLabel(locale, requirement)}
                    </li>,
                  ];
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {actionError ? (
        <p className="node-action-error" role="alert" data-testid="node-action-error">
          {actionError}
        </p>
      ) : null}
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
        title={t(locale, "inspector.close")}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
