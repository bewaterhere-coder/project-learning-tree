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

**Gate:** `plan_review` — revised per PR #36 Plan Review (changes required); awaiting re-review (`plan_approved=true`).

**Hard constraints:**

- No production code until `plan_approved=true`.
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

`TreeCanvas` enables `panOnDrag` and does **not** disable the pane `draggable` class path. Semantic grab/grabbing for empty-canvas pan is therefore already provided by XYFlow — the app is not missing those class hooks. Reasserting the same keywords in app CSS would not change contrast.

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
- `input` / `textarea` rely on UA default `text` — **no change planned** (no observed defect).
- **No** `cursor: none`, custom `url(...)` cursors, or theme-level cursor tokens exist today.

### Light canvas luminance (why native grab fails)

Light `--color-bg-canvas` values are high-luminance cream / paper / snow surfaces, e.g.:

| Recipe | Light canvas (approx.) |
| --- | --- |
| Rosé Pine Dawn (default fallback) | `#faf4ed` |
| Everforest Medium light | `#efebd4` |
| Catppuccin Latte | crust `#dce0e8` |
| Nord light | Snow Storm `nord6` |

Platform native `grab` / `grabbing` cursors are typically light gray open/closed hands with a thin outline. On these canvases the hand silhouette has **poor contrast**, so the pointer feels like it “disappears” over empty light canvas even though CSS state is correct. Dark canvases keep adequate contrast with the same native cursors — matching “light-mode only” reports and the non-goal of not regressing dark mode.

**Insufficiency evidence (binding for this Plan):** audit shows correct XYFlow semantics + no app override + systematically high-luminance light canvases. Native keywords cannot be restyled; therefore a light-mode custom cursor treatment is the smallest remediation that can satisfy AC1 while preserving grab/grabbing semantics (AC2–3).

### What is *not* the bug

| Hypothesis | Verdict |
| --- | --- |
| App CSS clears / forces a wrong global canvas cursor | **False** — RF pane cursor not overridden |
| `panOnDrag` missing → no grab class | **False** — `panOnDrag` is set; vendor CSS defines `.draggable` / `.dragging` |
| Re-declaring `grab` under light theme will fix visibility | **False** — same computed keyword; no contrast change |
| Theme recipe forgot a cursor token | **N/A** — no cursor tokens in the recipe system; out of scope to invent a broad token API |
| Need React Flow replacement / selection rewrite | **Out of scope** and unnecessary |
| Dark mode broken by missing cursor | **No evidence** — leave dark vendor defaults alone |
| Missing explicit `cursor: text` on inputs | **No observed defect** — out of scope |

---

## Root-cause statement

> Light-mode empty-canvas pointer visibility fails because **native `grab`/`grabbing` (from XYFlow pane classes) has insufficient contrast against high-luminance `--color-bg-canvas` surfaces**. Interaction-state wiring is already correct; the defect is presentation contrast under light themes, not missing pan semantics. Fixing it requires a **light-mode-only high-contrast cursor asset** on the pannable pane states, not CSS that merely reasserts the same native keywords.

---

## Proposed implementation (after `plan_approved=true`)

### Single path — light-mode pane high-contrast cursors

1. Add two minimal hand icons (open = grab, closed = grabbing) as static SVG files under e.g. `src/ui/assets/cursors/` (or equivalent), **or** equivalent compact data-URIs if bundling stays simpler without regressions.
2. Visual treatment: **dark stroke + light fill** (or equivalent dual-tone) so the silhouette remains visible on cream / snow canvases across all light recipes.
3. Apply **only** under light theme and **only** on necessary XYFlow pane states:

   ```css
   html[data-theme="light"] .react-flow__pane.draggable {
     cursor: url("…/canvas-grab.svg") HOTSPOT_X HOTSPOT_Y, grab;
   }
   html[data-theme="light"] .react-flow__pane.dragging {
     cursor: url("…/canvas-grabbing.svg") HOTSPOT_X HOTSPOT_Y, grabbing;
   }
   ```

4. Preserve native `grab` / `grabbing` as the final fallback keywords if the `url(...)` fails to load.
5. **Do not** apply custom cursors under `html[data-theme="dark"]`.
6. **Do not** override `.react-flow__node*`, toolbar/`nodrag`/`nopan` controls, pane dividers, inputs, or `.chat-header` in this task.
7. Do **not** set `cursor` on `.react-flow`, `.react-flow__renderer`, `.tree-canvas-host`, or `.tree-pane` as a blanket rule.
8. No animation, follow-dot, halo, or canvas-wide default-arrow substitution.

### Asset size / hotspot constraints (binding)

| Constraint | Binding value |
| --- | --- |
| Rasterized / intrinsic canvas | **32×32** CSS px (stay well under typical 128×128 browser cursor limits) |
| Format | SVG (file or data-URI); keep path count minimal |
| Hotspot | Align to the **visible contact tip** of the hand (not the bounding-box center). Record exact `(x, y)` in the CSS `url(...) x y` and in a one-line comment next to the rule (e.g. open-hand tip ≈ `(8, 5)` — finalize against the drawn artwork) |
| DPI / zoom | Must remain readable and hotspot-aligned at **100%** browser zoom **and one non-100% zoom** (prefer **125%** or **90%**) during manual verify |
| Color | Dual-tone for contrast on `#faf4ed`–class backgrounds; no dependence on theme CSS variables inside the cursor image |

### Explicit non-changes

- No Domain / Application / Workspace semantic changes.
- No change to `panOnDrag`, selection, node drag persistence, edge routing, or toolbar `nodrag`/`nopan`.
- No canvas background redesign, grid, or vignette “to help the cursor.”
- No new theme-recipe cursor token system.
- No “reinforce native grab” CSS step.
- No speculative `cursor: text` rules.

---

## Binding decisions for Plan Review

| ID | Question | Binding choice |
| --- | --- | --- |
| D1 | Custom cursor assets? | **Yes for light pane only** — native grab contrast failure already evidenced by audit |
| D2 | Scope of CSS | **`html[data-theme="light"]` + `.react-flow__pane.draggable` / `.dragging` only** |
| D3 | Node drag cursors | **Leave vendor defaults** this task (preserve existing node semantics) |
| D4 | Explicit `cursor: text` | **No** — no observed defect |
| D5 | `!important` | **Avoid** |
| D6 | Asset size / hotspot | **32×32**; hotspot on visible tip; document coordinates next to CSS |
| D7 | Zoom verify | **100% + one non-100%** (125% or 90%) required for acceptance manual pass |
| D8 | Automated test | Assert light-theme pane rules include `url(` + fallback `grab`/`grabbing`; assert dark CSS does not gain these overrides. OS-cursor pixels are not reliably snapshottable — headed manual verify covers AC1 |

---

## File touch list (implementation phase)

| File | Change |
| --- | --- |
| `src/ui/assets/cursors/canvas-grab.svg` (+ grabbing) | High-contrast 32×32 dual-tone hands |
| [`src/ui/styles.css`](../../src/ui/styles.css) | Light-only pane `url(...) , grab|grabbing` rules |
| Tests under `src/ui/` or style/theme test home | Contract: light pane rules present; dark unchanged |
| This plan + requirement gates | Updated when moving to `implementing` / acceptance |

No Domain, Application, or Workspace files expected.

---

## Acceptance mapping

| # | Criterion | How this plan satisfies it |
| --- | --- | --- |
| 1 | Light empty canvas pointer immediately visible | Dual-tone custom open-hand on light `.react-flow__pane.draggable` |
| 2 | Pannable empty canvas → grab semantics | Custom open-hand + fallback keyword `grab` |
| 3 | Active pan → grabbing | Custom closed-hand on `.dragging` + fallback `grabbing` |
| 4 | Node actions → `pointer` | Untouched `.ui-button` + `nodrag nopan` |
| 5 | Text surfaces → `text` | Untouched UA defaults |
| 6 | Resize handles | Untouched `.pane-divider-*` |
| 7 | Dark mode not degraded | No dark overrides |
| 8 | Behavior unchanged aside from cursor presentation | No RF prop / domain changes |
| 9 | Custom asset only when native insufficient | Audit evidences insufficiency; assets scoped to light pane only |
| (impl) | Automated checks + manual browser verify | Contract tests + headed light/dark + zoom checklist |

---

## Regression / verification checklist

Manual (headed browser), at minimum:

- [ ] Light empty canvas: pointer immediately locatable **before** click (default recipe + spot-check other light recipes)
- [ ] Empty canvas pan: open-hand → closed-hand → open-hand
- [ ] Hotspot feels aligned with the visible tip (no offset “ghost” grab)
- [ ] Browser zoom **100%** and **one non-100%** (125% or 90%): cursor still visible; hotspot still usable
- [ ] Node hover / select / drag (existing native node cursors preserved)
- [ ] Node toolbar chat / add-child / more (`pointer`)
- [ ] Inspector reflection / authoring / chat composer (`text`)
- [ ] Sidebar / inspector / chat resize dividers
- [ ] Dark theme empty canvas + pan (native grab/grabbing unchanged; no custom url)

Automated:

- [ ] Existing `npm test` / `typecheck` / CI green
- [ ] Focused assertion(s) for light pane `url(` + fallback keywords; dark stylesheet path free of those overrides

---

## Planning evidence summary

| Question | Answer |
| --- | --- |
| Where is cursor defined? | Mostly XYFlow vendor CSS; app adds chrome pointers/resize/chat-grab only |
| Does light theme break cursor CSS? | No broken override; contrast failure against bright `--color-bg-canvas` |
| Is grab already wired? | Yes — reasserting it cannot fix contrast |
| Smallest fix? | Light-only custom high-contrast pane grab/grabbing with native fallback |
| Scope? | Pane `.draggable` / `.dragging` under `html[data-theme="light"]` only |

---

## Gate handoff

1. This file is the canonical Plan artifact: `docs/plans/TASK-011-plan.md` (**revised** for PR #36 Plan Review).
2. Requirement remains `stage: plan_review`, `next_expected_actor: chatgpt`, `plan_approved: false`.
3. **Do not implement** until ChatGPT sets `plan_approved: true` and advances stage to `implementing` / `next_expected_actor: cursor`.
4. After approval, implement on **this same branch / PR #36 only**.
