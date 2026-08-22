import type { LearningFlowNode } from "./to-react-flow.js";
import { Button } from "../primitives/Button.js";
import { t, useLocale } from "../i18n/index.js";

export function LearningNode({
  data,
  onOpenChat,
  onAddChild,
  onComplete,
}: {
  data: LearningFlowNode["data"];
  onOpenChat?: () => void;
  onAddChild?: () => void;
  onComplete?: () => void;
}) {
  const locale = useLocale();
  const { lifecycle } = data;
  const className = [
    "learning-node",
    `lifecycle-${lifecycle}`,
    data.isOnActiveStack ? "on-stack" : "",
    data.isCurrentFocus ? "focused" : "",
    data.isActiveStackLeaf ? "stack-leaf" : "",
    data.isRecommended ? "recommended" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const blockedLabel = t(locale, "node.blocked", {
    count: data.unresolvedBlockerCount,
  });
  const canAddChild = lifecycle !== "closed" && onAddChild;
  const showComplete = lifecycle !== "closed" && onComplete;
  const completeEnabled = showComplete && data.canComplete === true;
  const isCompleted = lifecycle === "closed";
  const completeTitle = completeEnabled
    ? t(locale, "actions.complete")
    : t(locale, "close.notReady");

  return (
    <div
      className={className}
      data-node-id={data.id}
      data-lifecycle={lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
      data-recommended={data.isRecommended ? "true" : "false"}
      data-project-root={data.isProjectRoot ? "true" : "false"}
      data-completed={isCompleted ? "true" : "false"}
      data-can-complete={completeEnabled ? "true" : "false"}
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p className="node-question">{data.question}</p>
      <p className="node-meta" data-testid={`node-goal-${data.id}`}>
        {data.goal}
      </p>
      {isCompleted ? (
        <span
          className="node-completed-mark"
          data-testid={`node-completed-${data.id}`}
        >
          {t(locale, "actions.complete")}
        </span>
      ) : null}
      {data.isRecommended ? (
        <span
          className="node-recommended"
          data-testid={`recommended-badge-${data.id}`}
          aria-label={t(locale, "bootstrap.nodeRecommended")}
          title={t(locale, "bootstrap.nodeRecommended")}
        />
      ) : null}
      {data.isBlocked ? (
        <span
          className="blocked-pip"
          data-testid={`blocked-badge-${data.id}`}
          aria-label={blockedLabel}
          title={blockedLabel}
        />
      ) : null}
      <div className="node-toolbar nodrag nopan">
        {onOpenChat ? (
          <Button
            type="button"
            variant="icon"
            className="node-chat-action"
            data-testid={`node-chat-${data.id}`}
            aria-label={t(locale, "chat.open")}
            title={t(locale, "chat.open")}
            onClick={(event) => {
              event.stopPropagation();
              onOpenChat();
            }}
          >
            <svg
              className="node-chat-icon"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v5A1.5 1.5 0 0 1 12.5 10H8.7l-2.4 2.4a.5.5 0 0 1-.85-.35V10H3.5A1.5 1.5 0 0 1 2 8.5v-5Z"
              />
            </svg>
          </Button>
        ) : null}
        {canAddChild ? (
          <Button
            type="button"
            variant="icon"
            className="node-add-child-action"
            data-testid={`node-add-child-${data.id}`}
            aria-label={t(locale, "actions.addSubQuestion")}
            title={t(locale, "actions.addSubQuestion")}
            onClick={(event) => {
              event.stopPropagation();
              onAddChild();
            }}
          >
            <span aria-hidden="true">＋</span>
          </Button>
        ) : null}
        {showComplete ? (
          <Button
            type="button"
            variant="ghost"
            className="node-complete-action"
            data-testid={`node-complete-${data.id}`}
            aria-label={completeTitle}
            title={completeTitle}
            disabled={!completeEnabled}
            onClick={(event) => {
              event.stopPropagation();
              if (!completeEnabled) {
                return;
              }
              onComplete();
            }}
          >
            {t(locale, "actions.complete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
