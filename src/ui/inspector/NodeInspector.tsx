import type {
  ActionAvailability,
  AuthoringAvailability,
  CloseReadiness,
  CloseRequirement,
  InspectorViewModel,
  UiCommand,
} from "../../application/index.js";
import { ChildAuthoringSection } from "./ChildAuthoringSection.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import {
  criterionStatusKey,
  depthMessageKey,
  lifecycleMessageKey,
  t,
} from "../i18n/index.js";

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

export function NodeActions({
  nodeId,
  availability,
  readiness,
  locale,
  actionError,
  onCommand,
  onOpenChat,
  onAskSummary,
}: {
  nodeId: string;
  availability: ActionAvailability;
  readiness: CloseReadiness;
  locale: WorkspaceLocale;
  actionError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onOpenChat?: () => void;
  onAskSummary?: () => void;
}) {
  const unmet = readiness.requirements.filter((requirement) => !requirement.met);

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
          disabled={!readiness.allowed}
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
      {onOpenChat ? (
        <button
          type="button"
          data-testid="chat-open"
          onClick={onOpenChat}
        >
          {t(locale, "chat.open")}
        </button>
      ) : null}
      {availability.canClose && unmet.length > 0 ? (
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
                  {requirement.kind === "summary" && onAskSummary ? (
                    <button
                      type="button"
                      data-testid="close-ask-ai-summary"
                      onClick={onAskSummary}
                    >
                      {t(locale, "close.askAiSummary")}
                    </button>
                  ) : null}
                </li>,
              ];
            })}
          </ul>
        </div>
      ) : null}
      {actionError ? (
        <p className="node-action-error" role="alert" data-testid="node-action-error">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}

export function NodeInspector({
  inspector,
  availability,
  readiness,
  authoring,
  locale,
  actionError,
  authoringError,
  onCommand,
  onClose,
  onOpenChat,
  onAskSummary,
}: {
  inspector: InspectorViewModel;
  availability?: ActionAvailability;
  readiness?: CloseReadiness;
  authoring?: AuthoringAvailability;
  locale: WorkspaceLocale;
  actionError?: string;
  authoringError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onClose: () => void;
  onOpenChat?: () => void;
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

  const showCloseRequirements = availability?.canClose === true;
  const summaryRequirement = readiness?.requirements.find(
    (requirement) => requirement.kind === "summary",
  );
  const blockingRequirement = readiness?.requirements.find(
    (requirement) => requirement.kind === "blockingChildren",
  );
  const hasRequiredCriterion = (readiness?.requirements ?? []).some(
    (requirement) => requirement.kind === "criterion",
  );
  const hasRequiredEvidence = (readiness?.requirements ?? []).some(
    (requirement) => requirement.kind === "evidence",
  );

  return (
    <section className="inspector" data-testid="node-inspector">
      <InspectorChrome locale={locale} onClose={onClose} />
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
          <dt>{t(locale, "inspector.lifecycle")}</dt>
          <dd data-testid="inspector-lifecycle">
            {inspector.lifecycle
              ? t(locale, lifecycleMessageKey(inspector.lifecycle))
              : ""}
          </dd>
        </div>
        <div>
          <dt>
            {showCloseRequirements && blockingRequirement ? <RequiredMarker /> : null}
            {t(locale, "inspector.blocked")}
          </dt>
          <dd data-testid="inspector-blocked">
            {(inspector.unresolvedBlockerCount ?? 0) > 0
              ? t(locale, "node.blocked", {
                  count: inspector.unresolvedBlockerCount ?? 0,
                })
              : t(locale, "inspector.blockedNone")}
            {showCloseRequirements && blockingRequirement ? (
              <RequirementStatus
                locale={locale}
                requirement={blockingRequirement}
                testId="blocked-status"
              />
            ) : null}
          </dd>
        </div>
      </dl>
      {availability && readiness ? (
        <NodeActions
          nodeId={inspector.nodeId}
          availability={availability}
          readiness={readiness}
          locale={locale}
          actionError={actionError}
          onCommand={onCommand}
          onOpenChat={onOpenChat}
          onAskSummary={onAskSummary}
        />
      ) : null}
      {authoring ? (
        <ChildAuthoringSection
          parentId={inspector.nodeId}
          children={inspector.children}
          availability={authoring}
          locale={locale}
          authoringError={authoringError}
          onCommand={onCommand}
        />
      ) : null}
      <details className="inspector-details" data-testid="inspector-details">
        <summary>{t(locale, "inspector.details")}</summary>
      <div>
        <dt>{t(locale, "inspector.targetDepth")}</dt>
        <dd data-testid="inspector-depth">
          {inspector.targetDepth
            ? t(locale, depthMessageKey(inspector.targetDepth))
            : ""}
        </dd>
      </div>
      <h3 data-testid="inspector-dod-heading">
        {showCloseRequirements && hasRequiredCriterion ? <RequiredMarker /> : null}
        {t(locale, "inspector.dod")}
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

      <h3 data-testid="inspector-evidence-heading">
        {showCloseRequirements && hasRequiredEvidence ? (
          <span data-testid="evidence-required-marker">
            <RequiredMarker />
          </span>
        ) : null}
        {t(locale, "inspector.evidence")}
      </h3>
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

      <h3 data-testid="inspector-summary-heading">
        {showCloseRequirements && summaryRequirement ? (
          <span data-testid="summary-required-marker">
            <RequiredMarker />
          </span>
        ) : null}
        {t(locale, "inspector.summary")}
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
      </details>
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
