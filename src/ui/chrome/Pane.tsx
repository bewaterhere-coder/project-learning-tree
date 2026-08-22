import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export function PaneGroup({
  orientation,
  children,
  className,
  testId,
}: {
  orientation: "horizontal" | "vertical";
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={["pane-group", `pane-group-${orientation}`, className]
        .filter(Boolean)
        .join(" ")}
      data-orientation={orientation}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function Pane({
  children,
  className,
  collapsed = false,
  size,
  testId,
  style,
}: {
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
  size?: number;
  testId?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["pane", className].filter(Boolean).join(" ")}
      data-collapsed={collapsed ? "true" : "false"}
      data-size={size === undefined ? undefined : String(size)}
      data-testid={testId}
      style={{
        ...style,
        ...(collapsed || size === undefined ? undefined : { flexBasis: size, height: size }),
      }}
    >
      {children}
    </div>
  );
}

export function PaneDivider({
  orientation,
  invert = false,
  onDrag,
  onRelease,
  testId,
  label,
}: {
  orientation: "horizontal" | "vertical";
  invert?: boolean;
  onDrag: (delta: number) => void;
  onRelease: () => void;
  testId: string;
  label: string;
}) {
  const last = useRef<number | null>(null);
  const dragging = useRef(false);

  const readPoint = (event: { clientX: number; clientY: number }): number =>
    orientation === "vertical" ? event.clientX : event.clientY;

  const nudge = (delta: number) => {
    onDrag(invert ? -delta : delta);
    onRelease();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 8;
    if (orientation === "vertical") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudge(-step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudge(step);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nudge(-step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudge(step);
    }
    if (event.key === "Home") {
      event.preventDefault();
      nudge(-1000);
    } else if (event.key === "End") {
      event.preventDefault();
      nudge(1000);
    }
  };

  return (
    <div
      className={`pane-divider pane-divider-${orientation}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      tabIndex={0}
      data-testid={testId}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        last.current = readPoint(event);
        dragging.current = true;
        event.currentTarget.dataset.active = "true";
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (last.current === null || (event.buttons & 1) === 0) {
          return;
        }
        const next = readPoint(event);
        const delta = next - last.current;
        last.current = next;
        onDrag(invert ? -delta : delta);
      }}
      onPointerUp={(event) => {
        last.current = null;
        event.currentTarget.dataset.active = "false";
        if (dragging.current) {
          dragging.current = false;
          onRelease();
        }
      }}
      onPointerCancel={(event) => {
        last.current = null;
        event.currentTarget.dataset.active = "false";
        if (dragging.current) {
          dragging.current = false;
          onRelease();
        }
      }}
    />
  );
}
