import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LearningFlowNode } from "./to-react-flow.js";
import { lifecycleMessageKey, t, useLocale } from "../i18n/index.js";

export function LearningNode({ data }: NodeProps<LearningFlowNode>) {
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
      data-testid={`node-${data.id}`}
      data-lifecycle={data.lifecycle}
      data-blocked={data.isBlocked ? "true" : "false"}
      data-on-stack={data.isOnActiveStack ? "true" : "false"}
      data-focus={data.isCurrentFocus ? "true" : "false"}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {data.isOnActiveStack ? <div className="stack-rail" aria-hidden="true" /> : null}
      <div className="node-badges">
        <span className="lifecycle-badge" data-testid={`lifecycle-badge-${data.id}`}>
          {t(locale, lifecycleMessageKey(data.lifecycle))}
        </span>
        {data.isBlocked ? (
          <span className="blocked-badge" data-testid={`blocked-badge-${data.id}`}>
            {t(locale, "node.blocked", { count: data.unresolvedBlockerCount })}
          </span>
        ) : null}
      </div>
      <p className="node-question">{data.question}</p>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}
