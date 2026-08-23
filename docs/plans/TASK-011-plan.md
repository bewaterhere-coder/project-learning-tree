---
task_id: TASK-011
title: Light Mode Canvas Cursor Visibility
status: plan_review
requirement: ../requirements/TASK-011-light-mode-canvas-cursor-visibility.md
pr: 36
branch: task/TASK-011-light-mode-canvas-cursor-visibility
supersedes:
  - pr: 33
    task_id: TASK-010
    note: Duplicate TASK-010 allocation closed; light-mode cursor work re-issued as TASK-011
---

# TASK-011 Plan — Light Mode Canvas Cursor Visibility

This is the canonical implementation plan for TASK-011. It records Planning Gate evidence from the canvas / React Flow / theme / CSS cursor audit and the smallest change set that should satisfy the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `plan_review` — awaiting ChatGPT plan review (`plan_approved=true`).

**Hard constraints:**

- No production code until `plan_approved=true`.
- Prefer native / CSS cursor semantics; custom SVG/image cursors are a **fallback** only if light-mode native `grab`/`grabbing` remains demonstrably insufficient.
- Do not redesign canvas visuals, selection/focus semantics, pan/zoom behavior, or React Flow.
- Do not fold into TASK-009, PR #32 / TASK-010 (project-root progress), or any other active PR.
- No decorative pointer trails, halos, or cursor animations.
- Avoid broad `cursor` rules and avoid `!important` unless the cascade truly requires it (document why if used).

---

## Goal

Make the pointer immediately locatable on the light learning canvas while keeping correct interaction-state cursor semantics:

| Surface | Expected cursor |
| --- | --- |
| Empty / pannable canvas | `grab` |
| Active canvas pan | `grabbing` |
| Node actions / clickable controls | `pointer` |
| Text inputs / editable fields | `text` |
| Pane resize handles | `col-resize` / `row-resize` |
| Dark mode | no regression |

---

## Current-state findings (code evidence)

### Stack wiring

| Layer | Path | Role |
| --- | --- | --- |
| RF CSS import | [`src/ui/App.tsx`](../../src/ui/App.tsx) | Imports `@xyflow/react/dist/style.css` **before** `./styles.css` |
| Canvas host | [`src/ui/tree/TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) | `ReactFlow` with `panOnDrag`, `nodesDraggable`, no custom `cursor` props |
| App chrome | [`src/ui/styles.css`](../../src/ui/styles.css) | Semantic cursors for buttons / resize / chat drag; RF overrides set **background only** |
| Theme | [`src/ui/theme/apply-theme.ts`](../../src/ui/theme/apply-theme.ts) + recipes | Sets `html[data-theme=light\|dark]`, recipe CSS vars including `--color-bg-canvas` |

Derivation (unchanged by this task):

```text
Workspace shell colorScheme + themeRecipeId
  → applyThemeStyleVars → --color-bg-canvas on <html>
  → .tree-pane / .react-flow* backgrounds use var(--color-bg-canvas)
  → XYFlow pane/node classes drive grab / grabbing / pointer
```

### React Flow cursor contract (vendor CSS)

From `@xyflow/react/dist/style.css` (already loaded):

| Selector | Cursor |
| --- | --- |
| `.react-flow__pane.draggable` | `grab` |
| `.react-flow__pane.dragging` | `grabbing` |
| `.react-flow__pane.selection` | `pointer` |
| `.react-flow__node` | `default` |
| `.react-flow__node.selectable` | `pointer` |
| `.react-flow__node.draggable` | `grab` |
| `.react-flow__node.draggable.dragging` | `grabbing` |
| Handles / resize controls | `crosshair` / resize cursors (handles are non-interactive in our CSS) |

`TreeCanvas` enables `panOnDrag` and does **not** disable the pane `draggable` class path. Semantic grab/grabbing for empty-canvas pan is therefore already provided by XYFlow — the app is not missing those class hooks.

### Application CSS cursor map today

Explicit `cursor` rules in [`styles.css`](../../src/ui/styles.css):

| Selector | Cursor | Notes |
| --- | --- | --- |
| `.ui-button` (+ related chrome buttons) | `pointer` | Covers node toolbar actions via `Button` / `.ui-button` |
| `.project-item` / `.archived-toggle` / summaries | `pointer` / `default` | Sidebar chrome |
| `.pane-divider-vertical` / `-horizontal` | `col-resize` / `row-resize` | Sidebar / inspector / chat splitters |
| `.ui-button:disabled` | `not-allowed` | Disabled controls |
| `.chat-header` | `grab` | Floating chat drag affordance only |
| `.react-flow`, `__renderer`, `__pane`, `__viewport` | *(none)* | Background `--color-bg-canvas` only — **no cursor override** |

Also:

- Node toolbar root uses `nodrag nopan` ([`LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx)) so pan/drag do not steal button hits; buttons inherit `pointer`.
- Handles are `opacity: 0; pointer-events: none` — no user-facing handle cursor today.
- No `NodeResizer` in product UI; resize cursors that matter are pane dividers.
- `input` / `textarea` rely on UA default `text` (no explicit `cursor: text` in app CSS).
- **No** `cursor: none`, custom `url(...)` cursors, or theme-level cursor tokens exist.

### Light canvas luminance (why native grab fails)

Light `--color-bg-canvas` values are high-luminance cream / paper / snow surfaces, e.g.:

| Recipe | Light canvas (approx.) |
| --- | --- |
| Rosé Pine Dawn (default fallback) | `#faf4ed` |
| Everforest Medium light | `#efebd4` |
| Catppuccin Latte | crust `#dce0e8` |
| Nord light | Snow Storm `nord6` |

Platform native `grab` / `grabbing` cursors are typically light gray open/closed hands with a thin outline. On these canvases the hand silhouette has **poor contrast**, so the pointer feels like it “disappears” over empty light canvas even though CSS state is correct. Dark canvases keep adequate contrast with the same native cursors — matching “light-mode only” reports and the non-goal of not regressing dark mode.

### What is *not* the bug

| Hypothesis | Verdict |
| --- | --- |
| App CSS clears / forces a wrong global canvas cursor | **False** — RF pane cursor not overridden |
| `panOnDrag` missing → no grab class | **False** — `panOnDrag` is set; vendor CSS defines `.draggable` / `.dragging` |
| Theme recipe forgot a cursor token | **N/A** — no cursor tokens in the recipe system; out of scope to invent a broad token API |
| Need React Flow replacement / selection rewrite | **Out of scope** and unnecessary |
| Dark mode broken by missing cursor | **No evidence** — leave dark vendor defaults alone |

---

## Root-cause statement

> Light-mode empty-canvas pointer visibility fails because **native `grab`/`grabbing` (from XYFlow pane/node classes) has insufficient contrast against high-luminance `--color-bg-canvas` surfaces**. Interaction-state wiring is largely already correct; the defect is presentation contrast under light themes, not missing pan semantics.

---

## Proposed implementation (smallest robust fix)

Implement **only after** `plan_approved=true`. Two-step approach; stop at the earliest step that passes acceptance.

### Step 1 — Confirm vendor states + scoped light-mode reinforcement (no assets)

1. Manually verify in browser (light recipes + dark) that empty pane shows `.react-flow__pane.draggable` → computed `cursor: grab`, and pan shows `.dragging` → `grabbing`.
2. Add **scoped** CSS under `html[data-theme="light"]` that only targets XYFlow interaction classes already used by the library, e.g.:
   - `html[data-theme="light"] .react-flow__pane.draggable { cursor: grab; }`
   - `html[data-theme="light"] .react-flow__pane.dragging { cursor: grabbing; }`
   - Optionally the node.draggable / dragging pair if node surfaces show the same wash-out.
3. Do **not** set `cursor` on `.react-flow`, `.react-flow__renderer`, `.tree-canvas-host`, or `.tree-pane` as a blanket rule.
4. Optionally add explicit `cursor: text` on known edit fields (`.ui-input`, `.reflection-input`, `.authoring-form` text inputs, chat composer) — small hardening, not the primary fix.
5. Leave `.ui-button` / `.pane-divider-*` / `.chat-header` rules as-is.

If Step 1 alone cannot make the pointer “immediately visible” on large empty light canvas (expected: native grab remains washed out), proceed to Step 2.

### Step 2 — Light-mode-only high-contrast SVG cursors (fallback)

Only if Step 1 fails acceptance criterion 1 / 9:

1. Add minimal open-hand / closed-hand SVG assets (static files or carefully sized data-URIs) with a **dark stroke + light fill** (or inverse) so the tip remains visible on cream canvases.
2. Apply via:

   ```css
   html[data-theme="light"] .react-flow__pane.draggable {
     cursor: url("…/grab.svg") HOTSPOT_X HOTSPOT_Y, grab;
   }
   html[data-theme="light"] .react-flow__pane.dragging {
     cursor: url("…/grabbing.svg") HOTSPOT_X HOTSPOT_Y, grabbing;
   }
   ```

   Mirror for `.react-flow__node.draggable` / `.dragging` only if needed for the same wash-out on node chrome.
3. Hotspot must align with the visible tip; keep native `grab`/`grabbing` as the final fallback keyword.
4. **Do not** apply custom cursors under `html[data-theme="dark"]`.
5. No animation, no follow-dot, no canvas-wide `url(...)` default arrow unless review explicitly expands scope.

### Explicit non-changes

- No Domain / Application / Workspace semantic changes.
- No change to `panOnDrag`, selection, node drag persistence, edge routing, or toolbar `nodrag`/`nopan`.
- No canvas background redesign, grid, or vignette “to help the cursor.”
- No new theme-recipe cursor token system unless review demands it (prefer local CSS + optional assets).

---

## Binding decisions for Plan Review

| ID | Question | Plan recommendation |
| --- | --- | --- |
| D1 | Custom cursor assets by default? | **No.** Native first; assets only if light-mode grab contrast fails manual check. |
| D2 | Scope of CSS | **Light theme + XYFlow interaction classes only**; never a global app cursor. |
| D3 | Node drag cursors | Same visibility treatment as pane **if** node grab washes out; otherwise leave vendor defaults. |
| D4 | Explicit `cursor: text` on inputs | **Yes, optional small hardening** in the same CSS pass; does not replace the canvas fix. |
| D5 | `!important` | **Avoid.** Only if a future cascade fight with vendor order is proven; document the selector war if used. |
| D6 | Automated test | Prefer a focused CSS/contract unit or component assertion that light-theme pane rules resolve to `grab`/`grabbing` (and custom `url` only if Step 2 ships). Visual e2e snapshot of the OS cursor is unreliable — rely on headed manual verification for criterion 1. |

---

## File touch list (implementation phase)

| File | Change |
| --- | --- |
| [`src/ui/styles.css`](../../src/ui/styles.css) | Light-scoped RF pane/node cursor rules; optional input `cursor: text` |
| `src/ui/assets/cursors/*` (only if Step 2) | High-contrast grab/grabbing SVGs |
| Tests under `src/ui/` or existing style/theme test home | Contract checks for light cursor rules / no dark regression |
| This plan + requirement gates | Updated when moving to `implementing` / acceptance |

No Domain, Application, or Workspace files expected.

---

## Acceptance mapping

| # | Criterion | How this plan satisfies it |
| --- | --- | --- |
| 1 | Light empty canvas pointer immediately visible | Step 1 verify + Step 2 contrast cursors if needed |
| 2 | Pannable empty canvas → `grab` | Preserve / reinforce `.react-flow__pane.draggable` |
| 3 | Active pan → `grabbing` | Preserve / reinforce `.react-flow__pane.dragging` |
| 4 | Node actions → `pointer` | Keep `.ui-button` + `nodrag nopan`; no blanket pane cursor on toolbar |
| 5 | Text surfaces → `text` | UA default + optional explicit rules |
| 6 | Resize handles | Existing `.pane-divider-*` rules untouched |
| 7 | Dark mode not degraded | No dark overrides; custom assets light-only |
| 8 | Behavior unchanged aside from cursor presentation | No RF prop / domain changes |
| 9 | No custom asset unless necessary | Step 2 gated on Step 1 failure |
| (impl) | Automated checks + manual browser verify | Unit/contract + headed light/dark pass |

---

## Regression / verification checklist

Manual (headed browser), at minimum:

- [ ] Light + each theme recipe empty canvas: pointer locatable before click
- [ ] Empty canvas pan: grab → grabbing → grab
- [ ] Node hover / select / drag
- [ ] Node toolbar chat / add-child / more (`pointer`)
- [ ] Inspector reflection textarea + authoring inputs (`text`)
- [ ] Sidebar / inspector / chat resize dividers
- [ ] Dark theme empty canvas + pan (no regression)
- [ ] Browser zoom ~100% and one non-100% zoom if practical

Automated:

- [ ] Existing `npm test` / `typecheck` / CI green
- [ ] New focused assertion(s) for light cursor contract if implementation adds CSS/assets

---

## Planning evidence summary

| Question | Answer |
| --- | --- |
| Where is cursor defined? | Mostly XYFlow vendor CSS; app adds chrome pointers/resize/chat-grab only |
| Does light theme break cursor CSS? | No broken override found; contrast failure against bright `--color-bg-canvas` |
| Is grab already wired? | Yes, via `panOnDrag` + `.react-flow__pane.draggable` / `.dragging` |
| Smallest fix? | Light-scoped reinforcement; custom SVG only if native grab fails visibility AC |
| Custom cursor default? | **No** |

---

## Gate handoff

1. This file is the canonical Plan artifact: `docs/plans/TASK-011-plan.md`.
2. Requirement updated to `stage: plan_review`, `next_expected_actor: chatgpt`, `plan_approved: false`.
3. **Do not implement** until ChatGPT sets `plan_approved: true` and advances stage to `implementing` / `next_expected_actor: cursor`.
4. After approval, implement on **this same branch / PR #36 only**.
