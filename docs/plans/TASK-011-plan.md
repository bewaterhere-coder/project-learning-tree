---
task_id: TASK-011
title: Light Mode Canvas Cursor Visibility
status: acceptance_review
requirement: ../requirements/TASK-011-light-mode-canvas-cursor-visibility.md
pr: 36
branch: task/TASK-011-light-mode-canvas-cursor-visibility
supersedes:
  - pr: 33
    task_id: TASK-010
    note: Duplicate TASK-010 allocation closed; light-mode cursor work re-issued as TASK-011
---

# TASK-011 Plan — Light Mode Canvas Cursor Visibility

This is the canonical implementation plan for TASK-011. It records Planning Gate evidence from the canvas / React Flow / theme / CSS cursor audit and the shipped change set for acceptance review.

**Gate:** `acceptance_review` — implementation complete on PR #36; awaiting ChatGPT acceptance (`acceptance_approved=true`).

**Hard constraints:**

- Native `grab`/`grabbing` on light canvases is **already evidenced insufficient** (contrast against high-luminance `--color-bg-canvas`); the implementation path is a **light-mode-only high-contrast custom cursor** on the necessary XYFlow pane states, with native keyword fallback.
- Do not redesign canvas visuals, selection/focus semantics, pan/zoom behavior, or React Flow.
- Do not fold into TASK-009, PR #32 / TASK-010 (project-root progress), or any other active PR.
- No decorative pointer trails, halos, or cursor animations.
- Avoid broad `cursor` rules and avoid `!important` unless the cascade truly requires it (document why if used).

---

## Review revisions (PR #36 Plan Review)

Blocking finding addressed in this revision:

1. **Removed “light-scoped CSS reinforcement” as a primary / gating step.** Re-declaring `cursor: grab` / `grabbing` under `html[data-theme="light"]` does not change the computed cursor value beyond what XYFlow already supplies, so it cannot fix native-cursor contrast and must not gate implementation.
2. **Custom high-contrast light-mode cursors are the implementation path**, justified by the retained audit: native grab/grabbing wash out on bright light canvases while dark mode remains usable.
3. **Scope tightened to necessary light-mode pane interaction states only** (`.react-flow__pane.draggable` / `.dragging`); do not blanket-override node/action/resize/text cursors.
4. **Dropped optional `cursor: text` hardening** — no observed defect; out of scope.
5. **Asset size / hotspot / zoom verification made explicit** (see Implementation).

---

## Goal

Make the pointer immediately locatable on the light learning canvas while keeping correct interaction-state cursor semantics:

| Surface | Expected cursor |
| --- | --- |
| Empty / pannable canvas (light) | High-contrast custom open-hand, fallback `grab` |
| Active canvas pan (light) | High-contrast custom closed-hand, fallback `grabbing` |
| Same pane states (dark) | Unchanged native XYFlow `grab` / `grabbing` |
| Node actions / clickable controls | Existing `pointer` (unchanged) |
| Text inputs / editable fields | Existing UA `text` (unchanged) |
| Pane resize handles | Existing `col-resize` / `row-resize` (unchanged) |

---

## Root-cause statement

> Light-mode empty-canvas pointer visibility fails because **native `grab`/`grabbing` (from XYFlow pane classes) has insufficient contrast against high-luminance `--color-bg-canvas` surfaces**. Interaction-state wiring is already correct; the defect is presentation contrast under light themes, not missing pan semantics. Fixing it requires a **light-mode-only high-contrast cursor asset** on the pannable pane states, not CSS that merely reasserts the same native keywords.

---

## Shipped implementation

1. Assets: `src/ui/assets/cursors/canvas-grab.svg` + `canvas-grabbing.svg` (32×32, dual-tone `#F7F4EF` fill / `#1C1917` stroke).
2. CSS in `src/ui/styles.css` (light pane only):

   ```css
   html[data-theme="light"] .react-flow__pane.draggable {
     cursor: url("./assets/cursors/canvas-grab.svg") 14 3, grab;
   }
   html[data-theme="light"] .react-flow__pane.dragging {
     cursor: url("./assets/cursors/canvas-grabbing.svg") 14 8, grabbing;
   }
   ```

3. Dark mode, nodes, toolbar, text, and resize cursors untouched.
4. Vite inlines the SVGs as `data:image/svg+xml` in production CSS while preserving hotspots and native fallbacks.

---

## Regression / verification checklist

Manual / headed (completed for acceptance handoff):

- [x] Light empty canvas: pointer immediately locatable **before** click (dual-tone contrast on `#faf4ed` / `#dce0e8`)
- [x] Empty canvas pan: open-hand → closed-hand → open-hand
- [x] Hotspot documented at tip (`14 3` / `14 8`) next to CSS rules
- [x] Browser zoom **100%** and **125%**: custom cursor still resolves
- [x] Node toolbar / buttons remain `pointer` (untouched rules)
- [x] Text surfaces remain UA `text` (no speculative hardening added)
- [x] Resize dividers unchanged
- [x] Dark theme empty canvas: native `grab` only (no custom `url`)

Automated:

- [x] `npm test` / `typecheck` / `build` green
- [x] `tests/ui/task-011-canvas-cursor.test.ts` contract assertions
- [x] `e2e/specs/task-011-canvas-cursor.spec.ts` light/dark/zoom cursor contract

Artifacts: `docs/milestones/task-011-light-mode-canvas-cursor/` (+ `/opt/cursor/artifacts/task-011/`).

---

## Gate handoff

1. This file is the canonical Plan artifact: `docs/plans/TASK-011-plan.md`.
2. Requirement is `stage: acceptance_review`, `plan_approved: true`, `next_expected_actor: chatgpt`.
3. Implementation shipped light-only pane custom cursors on this same branch / PR #36.
4. Automated + headed verification evidence under `docs/milestones/task-011-light-mode-canvas-cursor/`.
5. Awaiting ChatGPT acceptance review (`acceptance_approved`).
