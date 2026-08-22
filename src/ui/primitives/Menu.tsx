import { useEffect, useRef, type ReactNode } from "react";

export function Menu({
  open,
  onClose,
  children,
  testId,
  align = "end",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  align?: "start" | "end";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={align === "start" ? "ui-menu align-start" : "ui-menu"}
      role="menu"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
