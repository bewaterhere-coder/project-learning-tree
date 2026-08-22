import { useRef, useState } from "react";
import type { LearningFlowNode } from "./to-react-flow.js";
import { Button } from "../primitives/Button.js";
import { Menu } from "../primitives/Menu.js";
import { t, useLocale } from "../i18n/index.js";

export function LearningNode({
  data,
}: {
  data: LearningFlowNode["data"];
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
    data.isCompleted ? "completed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const blockedLabel = t(locale, "node.blocked", {
    count: data.unresolvedBlockerCount,
  });

  return (
    <div
      className={className}
      data-node-id={data.id}
      data-lifecycle={lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
      data-recommended={data.isRecommended ? "true" : "false"}
      data-completed={data.isCompleted ? "true" : "false"}
      data-can-complete={
        lifecycle !== "closed" && data.canComplete === true ? "true" : "false"
      }
      data-child-count={String(data.childCount)}
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p className="node-question">{data.question}</p>
      <p className="node-meta" data-testid={`node-goal-${data.id}`}>
        {data.goal}
      </p>
      {data.childCount > 0 ? (
        <p
          className="node-progress"
          data-testid={`node-progress-${data.id}`}
          data-child-count={String(data.childCount)}
        >
          {t(locale, "node.childProgress", {
            count: data.childCount,
            percent: data.progressPercent ?? 0,
          })}
        </p>
      ) : (
        <p
          className="node-child-count"
          data-testid={`node-child-count-${data.id}`}
        >
          {t(locale, "node.childCount", { count: data.childCount })}
        </p>
      )}
      {data.isCompleted ? (
        <span
          className="node-completed-mark"
          data-testid={`node-completed-${data.id}`}
          aria-label={t(locale, "node.completed")}
          title={t(locale, "node.completed")}
        >
          ✓
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
    </div>
  );
}

export function LearningNodeToolbarActions({
  data,
  onOpenChat,
  onAddChild,
  onComplete,
  onOpenInspector,
}: {
  data: LearningFlowNode["data"];
  onOpenChat?: () => void;
  onAddChild?: () => void;
  onComplete?: () => void;
  onOpenInspector?: () => void;
}) {
  const locale = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const { lifecycle } = data;
  const canAddChild =
    (data.canCreateChild ?? lifecycle !== "closed") && onAddChild;
  const showComplete = lifecycle !== "closed" && onComplete;
  const completeEnabled = showComplete && data.canComplete === true;
  const completeTitle = completeEnabled
    ? t(locale, "actions.complete")
    : t(locale, "close.notReady");
  const showMore = showComplete || onOpenInspector;

  return (
    <div className="node-toolbar-actions nodrag nopan">
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
      {showMore ? (
        <div className="node-more-anchor">
          <button
            ref={moreTriggerRef}
            type="button"
            className="ui-button ui-button-icon node-more-action"
            data-testid={`node-more-${data.id}`}
            aria-label={t(locale, "actions.more")}
            title={t(locale, "actions.more")}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMoreOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">⋯</span>
          </button>
          <Menu
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            testId={`node-more-menu-${data.id}`}
            anchorRef={moreTriggerRef}
            align="end"
          >
            {onOpenInspector ? (
              <button
                type="button"
                data-testid={`node-open-inspector-${data.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setMoreOpen(false);
                  onOpenInspector();
                }}
              >
                {t(locale, "inspector.open")}
              </button>
            ) : null}
            {showComplete ? (
              <button
                type="button"
                data-testid={`node-complete-${data.id}`}
                disabled={!completeEnabled}
                title={completeTitle}
                aria-label={completeTitle}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!completeEnabled) {
                    return;
                  }
                  setMoreOpen(false);
                  onComplete();
                }}
              >
                {t(locale, "actions.complete")}
              </button>
            ) : null}
          </Menu>
        </div>
      ) : null}
    </div>
  );
}
