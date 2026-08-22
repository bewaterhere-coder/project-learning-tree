import type { LearningFlowNode } from "./to-react-flow.js";
import { Button } from "../primitives/Button.js";
import { lifecycleMessageKey, t, useLocale } from "../i18n/index.js";

export function LearningNode({
  data,
  onOpenChat,
}: {
  data: LearningFlowNode["data"];
  onOpenChat?: () => void;
}) {
  const locale = useLocale();
  const className = [
    "learning-node",
    `lifecycle-${data.lifecycle}`,
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

  return (
    <div
      className={className}
      data-node-id={data.id}
      data-lifecycle={data.lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
      data-recommended={data.isRecommended ? "true" : "false"}
      data-project-root={data.isProjectRoot ? "true" : "false"}
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p
        className="node-status visually-hidden"
        data-testid={`lifecycle-badge-${data.id}`}
      >
        {t(locale, lifecycleMessageKey(data.lifecycle))}
      </p>
      <p className="node-question">{data.question}</p>
      <p className="node-meta" data-testid={`node-goal-${data.id}`}>
        {data.goal}
      </p>
      {data.isRecommended ? (
        <p className="node-recommended" data-testid={`recommended-badge-${data.id}`}>
          {t(locale, "bootstrap.nodeRecommended")}
        </p>
      ) : null}
      {data.isBlocked ? (
        <span
          className="blocked-pip"
          data-testid={`blocked-badge-${data.id}`}
          aria-label={blockedLabel}
          title={blockedLabel}
        />
      ) : null}
      {onOpenChat ? (
        <Button
          type="button"
          variant="icon"
          className="node-chat-action nodrag nopan"
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
    </div>
  );
}
