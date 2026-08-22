import type { ReactNode } from "react";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { PaneDivider } from "../chrome/Pane.js";
import { t } from "../i18n/index.js";

export function ContextualWorkspace({
  width,
  locale,
  children,
  onResizeDrag,
  onResizeRelease,
}: {
  width: number;
  locale: WorkspaceLocale;
  children: ReactNode;
  onResizeDrag: (delta: number) => void;
  onResizeRelease: () => void;
}) {
  return (
    <aside
      className="contextual-workspace"
      data-testid="inspector-pane"
      data-width={String(width)}
      style={{ width }}
    >
      {children}
      <PaneDivider
        invert
        orientation="vertical"
        testId="inspector-resize"
        label={t(locale, "inspector.resize")}
        onDrag={onResizeDrag}
        onRelease={onResizeRelease}
      />
    </aside>
  );
}
