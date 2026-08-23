import { useRef, useState } from "react";
import { t, useLocale } from "../i18n/index.js";
import { Menu } from "../primitives/Menu.js";
import type { LayoutDirection } from "./layout.js";

const DIRECTIONS: LayoutDirection[] = ["tb", "bt", "lr", "rl"];

const DIRECTION_KEYS = {
  tb: "layout.topToBottom",
  bt: "layout.bottomToTop",
  lr: "layout.leftToRight",
  rl: "layout.rightToLeft",
} as const;

export function LayoutMenu({
  disabled,
  onSelect,
  onFitAll,
}: {
  disabled: boolean;
  onSelect: (direction: LayoutDirection) => void;
  onFitAll: () => void;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="canvas-layout-panel nodrag nopan" data-testid="canvas-layout-panel">
      <button
        type="button"
        className="ui-button ui-button-secondary canvas-layout-trigger"
        data-testid="canvas-fit-all"
        disabled={disabled}
        title={t(locale, "canvas.fitAll")}
        onClick={() => {
          if (disabled) {
            return;
          }
          onFitAll();
        }}
      >
        {t(locale, "canvas.fitAll")}
      </button>
      <button
        ref={triggerRef}
        type="button"
        className="ui-button ui-button-secondary canvas-layout-trigger"
        data-testid="canvas-layout-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        title={t(locale, "layout.menu")}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((value) => !value);
        }}
      >
        {t(locale, "layout.menu")}
      </button>
      <Menu
        open={open && !disabled}
        onClose={() => setOpen(false)}
        testId="canvas-layout-menu-items"
        anchorRef={triggerRef}
        align="start"
      >
        {DIRECTIONS.map((direction) => (
          <button
            key={direction}
            type="button"
            role="menuitem"
            data-testid={`canvas-layout-${direction}`}
            onClick={() => {
              setOpen(false);
              onSelect(direction);
            }}
          >
            {t(locale, DIRECTION_KEYS[direction])}
          </button>
        ))}
      </Menu>
    </div>
  );
}
