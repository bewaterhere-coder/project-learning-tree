import type { LearningFlowNode } from "./to-react-flow.js";
import type { NodeId, UiCommand } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { Button } from "../primitives/Button.js";
import { t } from "../i18n/index.js";
import { NodeAddChildAction } from "./NodeAddChildAction.js";

export function LearningNode({
  data,
  locale,
  onOpenChat,
  onCommand,
}: {
  data: LearningFlowNode["data"];
  locale: WorkspaceLocale;
  onOpenChat?: () => void;
  onCommand?: (command: UiCommand) => boolean | void;
}) {
  const className = [
    "learning-node",
    `lifecycle-${data.lifecycle}`,
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
  const contextLine = data.summary?.trim();

  return (
    <div
      className={className}
      data-node-id={data.id}
      data-lifecycle={data.lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
      data-recommended={data.isRecommended ? "true" : "false"}
      data-completed={data.isCompleted ? "true" : "false"}
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p className="node-question">{data.question}</p>
      {contextLine ? (
        <p className="node-meta" data-testid={`node-context-${data.id}`}>
          {contextLine}
        </p>
      ) : null}
      {data.childCount > 0 ? (
        <p className="node-progress" data-testid={`node-progress-${data.id}`}>
          {t(locale, "node.childProgress", {
            count: data.childCount,
            percent: data.progressPercent ?? 0,
          })}
        </p>
      ) : null}
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
      <div className="node-actions-row nodrag nopan">
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
        {onCommand ? (
          <NodeAddChildAction
            nodeId={data.id as NodeId}
            locale={locale}
            canCreateChild={data.canCreateChild === true}
            onCommand={onCommand}
          />
        ) : null}
      </div>
    </div>
  );
}
