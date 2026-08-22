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
      <div className="bootstrap-summary-main">
        <p className="bootstrap-kicker">
          {t(locale, "bootstrap.kicker", {
            version: `${record.frameworkId}/${record.frameworkVersion}`,
          })}
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
      </div>
      <details className="bootstrap-details">
        <summary>{t(locale, "bootstrap.details")}</summary>
        <p className="bootstrap-positioning" data-testid="bootstrap-positioning">
          {record.positioning}
        </p>
        <p className="bootstrap-evidence" data-testid="bootstrap-evidence-status">
          {t(
            locale,
            record.evidenceStatus === "verified"
              ? "bootstrap.evidence.verified"
              : record.evidenceStatus === "partial"
                ? "bootstrap.evidence.partial"
                : "bootstrap.evidence.fallback",
          )}
        </p>
      </details>
    </aside>
  );
}
