import type { LearningFlowNode } from "./to-react-flow.js";
import { lifecycleMessageKey, t, useLocale } from "../i18n/index.js";

export function LearningNode({ data }: { data: LearningFlowNode["data"] }) {
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
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p
        className="node-status visually-hidden"
        data-testid={`lifecycle-badge-${data.id}`}
      >
        {t(locale, lifecycleMessageKey(data.lifecycle))}
      </p>
      <p className="node-question">{data.question}</p>
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
    </div>
  );
}
