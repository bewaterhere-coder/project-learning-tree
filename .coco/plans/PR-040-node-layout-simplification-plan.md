---
task_id: PR-040-node-layout-simplification
title: Canvas Node Layout Simplification
status: plan_review
requirement: ../tasks/PR-040-node-layout-simplification.md
pr: 40
branch: task/node-layout-simplification
---

# PR-040 Plan — Canvas Node Layout Simplification

This is the canonical implementation plan for PR-040. It records Planning Gate code evidence and the smallest change set that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `plan_review` — awaiting ChatGPT Plan Review (`plan_approved: true` on the Requirement).

**Hard constraints:**

- Presentation / layout only — no `DomainSnapshot` schema change, no semantic edge/node create/delete, no learning-progress or conversation mutation from layout.
- Node positions stay on the existing UI-preference boundary (`layout.nodePositions` → preference store); never write positions into semantic persistence.
- Preserve PR-038 independent drag semantics (`draggingNodeIdRef` / single-id drag-stop / null multi-select keys).
- Preserve TASK-010 Project Root on-canvas role (identity + derived progress; no chat / question lifecycle). Do **not** revive TASK-009 “hide Project Root” as a side effect of this task.
- Do not fold into PR-038 / TASK-009 / TASK-010 / TASK-011 lineages beyond conflict-aware reuse.
- Do not create another Task, branch, or PR for this requirement.

Implementation of product code is forbidden until Plan review records `plan_approved: true`. Writing this file is not Done for the task.

---

## Goal

```text
Canvas surface
  ├── Learning nodes (single visual card each, including Project Root)
  ├── Edges / handles
  ├── Existing graph chrome (core-question FAB, inspector-open, …)
  └── Compact 布局 / Layout menu → TB | BT | LR | RL presets
       └── writes preference nodePositions only
```

Remove competing project-information chrome from the tree pane; flatten node chrome to one card; add deterministic directional auto-layout that coexists with independent manual drag.

---

## Current-state findings (code evidence)

### 1. Project-information on the canvas (AC1)

| Surface | Path | Verdict |
| --- | --- | --- |
| **`BootstrapSummary`** | [`BootstrapSummary.tsx`](../../src/ui/projects/BootstrapSummary.tsx) mounted in [`App.tsx`](../../src/ui/App.tsx) above `TreeCanvas` inside `.tree-pane` | **Primary AC1 target** — bordered card (`data-testid="bootstrap-summary"`) with framework kicker, recommended focus list, positioning/evidence details. Competes with the graph. |
| Project Root RF node | [`LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) `isProjectRoot` branch + `.learning-node.project-root` | **Keep** — TASK-010 product rule: Root is a learning-tree structural node (name + derived progress), not a separate project-info card. Sidebar + shell `.project-title` already own metadata editing. |
| Shell header / sidebar | `App.tsx` `.project-title`, project sidebar | **Out of scope** — not inside the graph canvas. |

**Binding implication:** Removing `BootstrapSummary` from the tree pane satisfies “no project-information card/block inside the main graph canvas” without regressing TASK-010. Recommended-focus affordance already exists on nodes via `isRecommended` / `.node-recommended`.

### 2. Double-card node chrome (AC2)

Render stack today:

```text
.react-flow__node (fixed NODE_WIDTH × NODE_HEIGHT)
  └── .learning-node-shell   ← hover + toolbar host (TreeCanvas FlowLearningNode)
        ├── LearningNodeHandles
        ├── .learning-node   ← border / radius / background / padding (the visible card)
        └── NodeToolbar (floating; not a second card body)
```

Evidence: [`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) `FlowLearningNode`; [`styles.css`](../../src/ui/styles.css) `.learning-node` + `.learning-node-shell`.

`.learning-node-shell` has no border today, but the **DOM nesting + RF box + inner card** is the two-layer structure the requirement rejects. Flattening must collapse shell into one `.learning-node` surface (handles + content + drag/hover target), not merely delete a wrapper while keeping identical stacked appearance.

### 3. Layout algorithm (AC3–7)

[`layout.ts`](../../src/ui/tree/layout.ts) `computeLayout(model)`:

| Aspect | Today |
| --- | --- |
| Directions | **TB only** (y grows per generation; siblings along x) |
| Spacing | `NODE_WIDTH=260`, `NODE_HEIGHT=148`, gaps 40 / 72 / root 64 |
| Forests | `model.rootNodeIds` packed left→right |
| Orientation API | **None** |

Application path: `toReactFlow` → `computeLayout` → `resolveNodePosition(saved, auto)` — **saved beats auto**. Edges re-derive N/E/S/W handles from geometry ([`edge-routing.ts`](../../src/ui/tree/edge-routing.ts)) — already direction-agnostic once positions change.

Empty / single / multi-root:

- Empty first layer → empty state; no `TreeCanvas` → layout control N/A.
- Single node → stable origin placement.
- Multi-root forests → packed along the cross-axis; VM only includes reachable roots (true orphans never appear).

### 4. TreeCanvas chrome / drag (AC6, AC10)

[`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx): bare `ReactFlow` inside `.tree-canvas-host` — **no** `Panel` / `Controls` / layout menu today. Pane-level chrome lives in `App.tsx` (`BootstrapSummary`, core FAB, inspector-open).

PR-038 drag (must preserve):

- `draggingNodeIdRef` on drag start
- Multi-position batches filtered to gesture target
- `multiSelectionKeyCode` / `selectionKeyCode` null
- `onNodeDragStop` → single-id preference patch via `applyNodeDragStop`
- Clusters rebuild on topology / drag-stop, not every tick

### 5. Persistence boundary (AC5, AC8)

| Layer | Mechanism |
| --- | --- |
| Runtime | `current.layout.nodePositions` → `TreeCanvas` saved positions |
| Drag commit | `App` drag-stop handler → `applyNodeDragStop` → `updateSelectedLayout` merge |
| Persist | `commit(..., false)` → preferences only |
| Semantic | `nodePositions` stripped from semantic payloads |

Auto-layout must use the same preference write path with a **full** position map for all current learning-node ids (overwrite those keys). Do not store layout direction on `DomainSnapshot`. Optional UI preference for last direction is **out of scope** unless needed for tests.

### 6. i18n

[`messages.ts`](../../src/ui/i18n/messages.ts) — `enUS` + `zhCN`, `t(locale, key)`. Add layout menu keys in both locales.

### 7. Clusters

Presentation-only underlays; `draggable: false`. After layout, refresh underlays from new positions (same as drag-stop). Must not write domain or preference state themselves.

---

## Binding decisions (proposed for Plan review)

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| D1 | Canvas project-info | **Unmount `BootstrapSummary` from `.tree-pane`**. Keep bootstrap **domain/record** intact. Recommended focus remains via node `isRecommended` badge. Do **not** move the full summary card into the RF viewport. | AC1; card is the competing project-info block |
| D2 | Project Root on graph | **Keep** rendering Project Root as RF learning node (TASK-010). Not treated as removable “project-info card”. | Avoid TASK-010 regression; AC allows learning nodes |
| D3 | Bootstrap UX relocation | **No new canvas chrome.** Optional follow-up (out of scope): quieter sidebar/inspector bootstrap details. Tests that assert `bootstrap-summary` on the canvas must be updated to the new product truth. | Scope discipline |
| D4 | Flatten nodes | Collapse `.learning-node-shell` into a single `.learning-node` surface owning border/background/hover/focus/handles/drag. Keep `NodeToolbar` floating outside the card body. | AC2 |
| D5 | Visual flatten depth | Reduce redundant padding/border stacking so the result is one card, not a wrapper deletion with identical two-layer look. RF node wrapper stays unstyled (`box-shadow: none` already). | AC2 visual requirement |
| D6 | Layout API | Extend `computeLayout(model, direction)` with `LayoutDirection = "tb" \| "bt" \| "lr" \| "rl"`. Default `"tb"` preserves current call sites. Pure function; no React/domain deps. | AC3–4 |
| D7 | Layout algorithm | Deterministic layered tree: measure subtree extent on cross-axis; place root(s) at origin side of chosen direction; expand generation-by-generation; reuse existing gap constants (transpose for LR/RL). Same input → same positions (no drift). | AC4, AC7, edge cases |
| D8 | Apply path | New App/workspace handler writes **full** `nodePositions` for all `model.nodes` ids via existing `updateSelectedLayout` / `applyNodeDragStop`-style preference commit (`commit(..., false)`). No domain ops. | AC5 |
| D9 | Control UI | One compact `布局` / `Layout` trigger + existing [`Menu`](../../src/ui/primitives/Menu.tsx) with four items. Mount as overlay inside `.tree-canvas-host` (or RF `Panel` top-left). Not four permanent buttons. | AC3 |
| D10 | Empty / disabled | Hide or disable control when no learning nodes / no `TreeCanvas`. Single-node: all directions → valid stable position. | Edge cases |
| D11 | Drag after layout | Leave PR-038 filters intact. After layout, drag still patches only the dragged id. Re-invoking layout recomputes from current semantic graph (ignores prior manual positions). | AC6–7 |
| D12 | Motion | Prefer **instant** position commit (one preference write → derived RF positions) to avoid canvas/background flash. No CSS transition on node `transform`/`left`/`top` during layout or drag. | AC10; TASK-010 flash regression |
| D13 | Domain / AI | **Zero** semantic mutation from layout. No new graph model. | AC5; architecture rules |
| D14 | Direction persistence | **Do not** persist selected direction as domain or required preference in this task. | Requirement §6 |

---

## Target interaction model

```text
User opens 布局 menu → chooses ← 从右到左
  → computeLayout(model, "rl")
  → preference nodePositions = full map
  → TreeCanvas derives RF nodes; edges re-route; clusters refresh
  → DomainSnapshot unchanged (ids, edges, content, progress, chat)

User drags node A
  → only A moves (PR-038)
  → on stop: nodePositions[A] updated only

User opens 布局 again (any direction)
  → recompute from current TreeViewModel; prior manual positions overwritten
```

Menu labels (must match Requirement):

| Direction | zh-CN | en-US |
| --- | --- | --- |
| tb | ↓ 从上到下 | ↓ Top to bottom |
| bt | ↑ 从下到上 | ↑ Bottom to top |
| lr | → 从左到右 | → Left to right |
| rl | ← 从右到左 | ← Right to left |

---

## Implementation slices (post-approval only)

### Slice 1 — Remove canvas BootstrapSummary (AC1)

**Files:** `App.tsx`, tests/e2e that assert `bootstrap-summary` visibility on canvas, optionally `styles.css` if orphaned.

1. Stop rendering `<BootstrapSummary />` inside `.tree-pane`.
2. Keep bootstrap record generation/persistence; recommended badges on nodes remain.
3. Update UI/e2e expectations that currently require `bootstrap-summary` in the tree pane (`product-workspace`, project bootstrap/lifecycle specs, helpers, visual specs).
4. Do **not** remove Project Root from RF.

### Slice 2 — Flatten node chrome (AC2)

**Files:** `TreeCanvas.tsx`, `LearningNode.tsx`, `styles.css`, handle styles if needed.

1. Move hover state + toolbar host onto a single `.learning-node` root (or merge shell styles into `.learning-node` and drop the extra visual wrapper).
2. Ensure handles remain correctly anchored; focus/hover/selection treatments still apply once.
3. Visual check: one border/radius/background plane per node in light and dark.

### Slice 3 — Directional `computeLayout` (AC4, AC7)

**Files:** `layout.ts`, new unit tests.

1. Add `LayoutDirection` and `computeLayout(model, direction = "tb")`.
2. Implement TB/BT/LR/RL using the same subtree-packing idea (swap main/cross axes; invert main axis for BT/RL).
3. Guarantees: no overlap under fixture trees; stable under repeat; forests packed without crash.
4. Keep `NODE_*` / gap constants unless a direction needs a documented transpose of the same values.

### Slice 4 — Compact layout control + apply (AC3–6)

**Files:** `TreeCanvas.tsx` (or small `LayoutMenu.tsx`), `App.tsx`, `messages.ts`, workspace session if a named `applyAutoLayout` helper clarifies intent.

1. Compact menu trigger `data-testid="canvas-layout-menu"` with four items and stable testids per direction.
2. On select: compute full positions from current `TreeViewModel` + direction; call preference writer; close menu.
3. Wire i18n keys `layout.menu`, `layout.topToBottom`, `layout.bottomToTop`, `layout.leftToRight`, `layout.rightToLeft` (labels per table above).
4. Disable/hide when `model.nodes.length === 0`.

### Slice 5 — Tests + acceptance hardening (AC8–10)

| Evidence | Approach |
| --- | --- |
| Direction matrix | Unit: multi-level fixture → TB/BT/LR/RL; assert monotonic generation axis, no bbox overlap, repeat stability |
| Positions only | Snapshot/graph equality before/after layout (node ids, edge ids, questions, progress fields unchanged) |
| Drag isolation | Extend PR-038-style test: after auto-layout, drag A; B/C coordinates unchanged; preferences only update A |
| Bootstrap gone | UI/e2e: tree pane has no `bootstrap-summary`; Project Root still present (`data-project-root`) |
| Flatten | Lightweight DOM/CSS assertion or component test: no `.learning-node-shell` wrapping a nested bordered `.learning-node` (or equivalent single-surface contract) |
| Flash / theme | Reuse canvas-flash regression + existing theme tests; no new position transitions |
| Persistence | Existing preference-vs-semantic tests; layout write uses `commit(..., false)` |

**Commands before acceptance:** `npm run typecheck`, `npm test`, `npm run build`, relevant e2e for bootstrap/canvas/persistence.

---

## File touch map (expected)

| Area | Paths |
| --- | --- |
| Remove canvas bootstrap | `src/ui/App.tsx`; tests/e2e asserting `bootstrap-summary` |
| Flatten | `src/ui/tree/TreeCanvas.tsx`, `LearningNode.tsx`, `src/ui/styles.css` |
| Layout algorithm | `src/ui/tree/layout.ts`, `to-react-flow.ts` (pass default direction only if needed) |
| Control + apply | `TreeCanvas.tsx` and/or new `LayoutMenu.tsx`, `App.tsx`, maybe `src/workspace/session.ts` helper |
| i18n | `src/ui/i18n/messages.ts` |
| Tests | new layout direction unit tests; PR-038 drag regression extension; bootstrap assertion updates |

**Out of touch:** `src/domain/**`, semantic persistence schema, conversation store, theme recipe palettes, chat redesign, Project Root domain rules.

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Reviewers interpret AC1 as “hide Project Root” (TASK-009) | **Material** | D2 explicit; Plan Review must confirm BootstrapSummary-only removal. If ChatGPT requires Root removal, that is a requirement amendment conflicting with TASK-010. |
| Full position write via merge leaves stale ids for deleted nodes | Low | Harmless to display; optional prune to current `model.nodes` ids when applying layout |
| Layout apply rebuild churn flashes canvas | **Material** | Instant preference write + existing TreeCanvas merge path; no CSS position transitions; reuse flash regression |
| Flatten breaks handle anchoring / toolbar hover | Medium | Keep handles as children of the single card; preserve hover hit area; visual QA light+dark |
| e2e/helpers still require `bootstrap-summary` | Medium | Update in Slice 1; do not leave conflicting assertions |
| LR/RL edge crossings worse than TB | Low | Requirement asks “reduce where reasonably possible”; layered tree packing is sufficient — no force-directed scope |
| Conflict with open UI PRs on `TreeCanvas` / `App` | Low | Rebase/conflict-only on this branch |

### Material risks (summary)

1. **AC1 scope ambiguity (BootstrapSummary vs Project Root)** — Plan binds BootstrapSummary removal only; ChatGPT must confirm or amend.
2. **Canvas flash on bulk position apply** — must reuse TASK-010/PR-038 stability patterns; no animated node translation.
3. **Test debt on `bootstrap-summary`** — multiple UI/e2e specs will fail until updated with Slice 1.

---

## Non-goals (reconfirmed)

- Redesign project metadata editing
- Delete project metadata / bootstrap records from domain or persistence
- Hide or remove Project Root from the graph (unless Plan Review explicitly overrides D2)
- Redesign node conversation
- Alter learning-state semantics
- Free-form / force-directed layout beyond four directional presets
- Multi-select drag product feature
- Merging this work into prior UI PRs

---

## Planning Gate checklist

| # | Item | Status |
| --- | --- | --- |
| 1 | Requirement read; stage was `planning` / `requirement_ready: true` | Done |
| 2 | Canvas project-info audit (`BootstrapSummary` vs Project Root vs shell/sidebar) | Done |
| 3 | Node chrome / shell flatten audit | Done |
| 4 | `computeLayout` / position persist / drag audit | Done — TB-only; preference boundary OK; PR-038 drag intact |
| 5 | Binding decisions D1–D14 recorded | Done (awaiting ChatGPT amend/approve) |
| 6 | Slices + tests + file map | Done |
| 7 | Plan path written | `.coco/plans/PR-040-node-layout-simplification-plan.md` |
| 8 | Requirement → `plan_review` / `next_expected_actor: chatgpt` | This commit |
| 9 | Push to PR #40 only; stop for review | This commit |

---

## Review handoff

If approved with or without amendments, set Requirement `plan_approved: true` / `stage: implementing` / `next_expected_actor: cursor` and implement on **this same branch/PR only** (`task/node-layout-simplification`, PR #40).

Do **not** implement product code until that gate is recorded.
