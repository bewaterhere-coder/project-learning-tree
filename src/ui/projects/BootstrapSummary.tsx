import type {
  DomainSnapshot,
  NodeId,
  ProjectLearningBootstrapRecord,
} from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";

export function BootstrapSummary({
  locale,
  record,
  snapshot,
  onFocusNode,
}: {
  locale: WorkspaceLocale;
  record: ProjectLearningBootstrapRecord;
  snapshot: DomainSnapshot;
  onFocusNode: (nodeId: NodeId) => void;
}) {
  const recommended = record.recommendedFocusNodeIds.flatMap((nodeId) => {
    const node = snapshot.nodes[nodeId];
    return node ? [{ nodeId, question: node.question }] : [];
  });

  return (
    <aside className="bootstrap-summary" data-testid="bootstrap-summary">
      <p className="bootstrap-kicker">
        {t(locale, "bootstrap.kicker", {
          version: `${record.frameworkId}/${record.frameworkVersion}`,
        })}
      </p>
      <p className="bootstrap-positioning" data-testid="bootstrap-positioning">
        {record.positioning}
      </p>
      {recommended.length > 0 ? (
        <div className="bootstrap-recommended" data-testid="bootstrap-recommended">
          <p className="bootstrap-recommended-label">{t(locale, "bootstrap.recommended")}</p>
          <ul>
            {recommended.map((item) => (
              <li key={item.nodeId}>
                <Button
                  variant="ghost"
                  data-testid={`bootstrap-focus-${item.nodeId}`}
                  onClick={() => onFocusNode(item.nodeId)}
                >
                  {item.question}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
