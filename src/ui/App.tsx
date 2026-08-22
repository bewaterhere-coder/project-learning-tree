import { useCallback, useMemo, useState } from "react";
import {
  createSession,
  dispatchCommand,
  formatDomainError,
  selectActionAvailability,
  selectInspectorViewModel,
  selectTreeViewModel,
  type DomainSnapshot,
  type TreeSession,
  type UiCommand,
} from "../application/index.js";
import { createDemoTreeFixture } from "../fixtures/demo-tree.js";
import { DomainErrorBanner } from "./errors/DomainErrorBanner.js";
import { NodeInspector } from "./inspector/NodeInspector.js";
import { TreeCanvas } from "./tree/TreeCanvas.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

export function App({
  initialSnapshot,
}: {
  initialSnapshot?: DomainSnapshot;
}) {
  const [session, setSession] = useState<TreeSession>(() =>
    createSession(initialSnapshot ?? createDemoTreeFixture().snapshot),
  );

  const tree = useMemo(
    () => selectTreeViewModel(session.snapshot),
    [session.snapshot],
  );
  const inspector = useMemo(
    () => selectInspectorViewModel(session.snapshot),
    [session.snapshot],
  );
  const availability = useMemo(() => {
    if (inspector.nodeId === undefined) {
      return undefined;
    }
    return selectActionAvailability(session.snapshot, inspector.nodeId);
  }, [inspector.nodeId, session.snapshot]);

  const dispatch = useCallback((command: UiCommand) => {
    setSession((current) => dispatchCommand(current, command));
  }, []);

  return (
    <div className="shell">
      <header className="shell-header">
        <div>
          <h1>Project Learning Tree</h1>
          <p className="project-name">{session.snapshot.project.name}</p>
        </div>
        <p className="stack-legend" data-testid="active-stack">
          Active Stack:{" "}
          {tree.activeStack.length === 0
            ? "(empty)"
            : tree.activeStack
                .map((id) => tree.nodes.find((node) => node.id === id)?.question ?? id)
                .join(" → ")}
        </p>
      </header>
      {session.lastError ? (
        <DomainErrorBanner
          message={formatDomainError(session.lastError)}
          onDismiss={() => dispatch({ type: "dismissError" })}
        />
      ) : null}
      <div className="workspace">
        <main className="tree-pane" data-testid="tree-canvas">
          <TreeCanvas
            model={tree}
            onFocusNode={(nodeId) => dispatch({ type: "focusNode", nodeId })}
          />
        </main>
        <aside className="inspector-pane">
          <NodeInspector
            inspector={inspector}
            availability={availability}
            onCommand={dispatch}
          />
        </aside>
      </div>
    </div>
  );
}
