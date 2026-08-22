import { useRef } from "react";

export function ResizeHandle({
  invert = false,
  onDelta,
  testId,
}: {
  invert?: boolean;
  onDelta: (delta: number) => void;
  testId: string;
}) {
  const lastX = useRef<number | null>(null);

  return (
    <div
      className="resize-handle"
      data-testid={testId}
      onPointerDown={(event) => {
        lastX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (lastX.current === null || (event.buttons & 1) === 0) {
          return;
        }
        const delta = event.clientX - lastX.current;
        lastX.current = event.clientX;
        onDelta(invert ? -delta : delta);
      }}
      onPointerUp={() => {
        lastX.current = null;
      }}
    />
  );
}
