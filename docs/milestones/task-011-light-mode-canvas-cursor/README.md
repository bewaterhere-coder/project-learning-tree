# TASK-011 — Light-mode canvas cursor verification

## Automated

- Unit contract: `tests/ui/task-011-canvas-cursor.test.ts` (32×32 dual-tone assets; light-only pane `url(...)` + `grab`/`grabbing` fallback; no dark overrides; no `cursor: text`)
- Playwright: `e2e/specs/task-011-canvas-cursor.spec.ts`
  - Light: computed pane cursor includes custom SVG + grab; dragging uses grabbing asset; still applied at **125%** page scale
  - Dark: custom canvas-grab assets **not** applied

## Evidence files

- `cursor-verification.json` / `dark-mode-cursor.json`
- `light-canvas-100.png`
- `cursor-asset-contrast.png` — dual-tone assets on cream / snow / dark swatches
- `light-empty-canvas.png` / `light-panning.png` / `light-zoom-125.png` / `dark-empty-canvas.png`

OS-level cursor pixels are not snapshottable; acceptance relies on computed-style contracts + headed evidence above.
