import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useExitHold } from "../hooks/useExitHold.js";

const MENU_GAP = 4;
const VIEWPORT_PAD = 8;
const MENU_EXIT_MS = import.meta.env.MODE === "test" ? 0 : 160;

export function Menu({
  open,
  onClose,
  children,
  testId,
  align = "end",
  anchorRef,
  anchorId,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  align?: "start" | "end";
  anchorRef: RefObject<HTMLElement | null>;
  anchorId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useExitHold(open, MENU_EXIT_MS);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    placement: "below" as "below" | "above",
  });

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const anchor = anchorRef.current;
    const menu = ref.current;
    if (!anchor || !menu) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 160;
    const menuHeight = menu.offsetHeight || 40;
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;
    let placement: "below" | "above" = "below";
    let top = rect.bottom + MENU_GAP;
    if (top + menuHeight > viewportHeight - VIEWPORT_PAD && rect.top - MENU_GAP - menuHeight >= VIEWPORT_PAD) {
      placement = "above";
      top = rect.top - MENU_GAP - menuHeight;
    }
    let left = align === "end" ? rect.right - menuWidth : rect.left;
    left = Math.max(
      VIEWPORT_PAD,
      Math.min(left, viewportWidth - menuWidth - VIEWPORT_PAD),
    );
    setCoords({ top, left, placement });
  }, [align, anchorRef, open, children]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onScroll = () => {
      onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [anchorRef, open, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={ref}
      className={align === "start" ? "ui-menu align-start" : "ui-menu"}
      role="menu"
      data-testid={testId}
      data-anchor-id={anchorId}
      data-placement={coords.placement}
      data-state={open ? "open" : "closed"}
      style={{ top: coords.top, left: coords.left }}
    >
      {children}
    </div>,
    document.body,
  );
}
