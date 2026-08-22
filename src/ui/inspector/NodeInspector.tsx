import type {
  ActionAvailability,
  InspectorViewModel,
  UiCommand,
} from "../../application/index.js";

export function NodeActions({
  nodeId,
  availability,
  onCommand,
}: {
  nodeId: string;
  availability: ActionAvailability;
  onCommand: (command: UiCommand) => void;
}) {
  return (
    <div className="node-actions" data-testid="node-actions">
      {availability.canActivate ? (
        <button
          type="button"
          data-testid="action-activate"
          onClick={() => onCommand({ type: "activateNode", nodeId })}
        >
          {availability.activateLabel}
        </button>
      ) : null}
      {availability.canPark ? (
        <button
          type="button"
          data-testid="action-park"
          onClick={() => onCommand({ type: "parkNode", nodeId })}
        >
          Park
        </button>
      ) : null}
      {availability.canResume ? (
        <button
          type="button"
          data-testid="action-resume"
          onClick={() => onCommand({ type: "resumeNode", nodeId })}
        >
          Resume
        </button>
      ) : null}
      {availability.canClose ? (
        <button
          type="button"
          data-testid="action-close"
          onClick={() => onCommand({ type: "closeNode", nodeId })}
        >
          Close
        </button>
      ) : null}
      {availability.canReturnToParent ? (
        <button
          type="button"
          data-testid="action-return-to-parent"
          onClick={() => onCommand({ type: "returnToParent" })}
        >
          Return to Parent
        </button>
      ) : null}
    </div>
  );
}

export function NodeInspector({
  inspector,
  availability,
  onCommand,
}: {
  inspector: InspectorViewModel;
  availability?: ActionAvailability;
  onCommand: (command: UiCommand) => void;
}) {
  if (!inspector.hasFocus || inspector.nodeId === undefined) {
    return (
      <section className="inspector" data-testid="node-inspector">
        <h2>Node Inspector</h2>
        <p className="empty">No node focused.</p>
      </section>
    );
  }

  return (
    <section className="inspector" data-testid="node-inspector">
      <h2>Node Inspector</h2>
      {availability ? (
        <NodeActions
          nodeId={inspector.nodeId}
          availability={availability}
          onCommand={onCommand}
        />
      ) : null}
      <dl className="inspector-fields">
        <div>
          <dt>Question</dt>
          <dd data-testid="inspector-question">{inspector.question}</dd>
        </div>
        <div>
          <dt>Goal</dt>
          <dd data-testid="inspector-goal">{inspector.goal}</dd>
        </div>
        <div>
          <dt>Target Depth</dt>
          <dd data-testid="inspector-depth">{inspector.targetDepth}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd data-testid="inspector-lifecycle">{inspector.lifecycle}</dd>
        </div>
        <div>
          <dt>Derived Blocked</dt>
          <dd data-testid="inspector-blocked">
            {inspector.isBlocked ? "Yes" : "No"}
          </dd>
        </div>
      </dl>

      <h3>Definition of Done</h3>
      {inspector.definitionOfDone.length === 0 ? (
        <p className="empty">No criteria.</p>
      ) : (
        <ul data-testid="inspector-dod">
          {inspector.definitionOfDone.map((criterion) => (
            <li key={criterion.id}>
              <strong>{criterion.description}</strong>
              <span>
                {" "}
                ({criterion.required ? "required" : "optional"},{" "}
                {criterion.status}
                {criterion.evidenceRequired ? ", evidence required" : ""})
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>Evidence</h3>
      {inspector.evidence.length === 0 ? (
        <p className="empty">No evidence.</p>
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

      <h3>Summary</h3>
      <p data-testid="inspector-summary">
        {inspector.summary ?? "No summary yet."}
      </p>
    </section>
  );
}
