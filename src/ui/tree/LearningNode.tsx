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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-lifecycle={data.lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
    >
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <p
        className="node-status"
        data-testid={`lifecycle-badge-${data.id}`}
      >
        {t(locale, lifecycleMessageKey(data.lifecycle))}
      </p>
      <p className="node-question">{data.question}</p>
      {data.isBlocked ? (
        <p className="node-meta" data-testid={`blocked-badge-${data.id}`}>
          {t(locale, "node.blocked", { count: data.unresolvedBlockerCount })}
        </p>
      ) : null}
    </div>
  );
}
