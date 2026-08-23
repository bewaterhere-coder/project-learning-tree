# PR-040-node-layout-simplification — Canvas Node Layout Simplification

```yaml
task_id: PR-040-node-layout-simplification
title: Canvas Node Layout Simplification

development:
  stage: done
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: true
    completion_verified: true
  next_expected_actor: none
  accepted_head: b8f45fe95bf77df93b96dbb5e4f285101e09fb7e
  finalization:
    status: integrated
    canonical_state: verified
    plan_execution_state: done
    acceptance_evidence: verified
    transport_preconditions: verified
    integration_receipt: verified
    merge_commit: 5f677ad518e22806eef937ae20b8b479fe07d2f9

artifacts:
  requirement: .coco/tasks/PR-040-node-layout-simplification.md
  plan: .coco/plans/PR-040-node-layout-simplification-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  pr_number: 40
  branch: task/node-layout-simplification
```

## Problem

The canvas currently contains project-information presentation that competes with the actual learning tree, while node visuals contain unnecessary nested layers. The graph also lacks a fast way to restore a clean tree arrangement after manual editing.

The canvas should be reduced to its core job: show learning nodes, relationships, and lightweight graph controls.

## Goal

1. Remove project-information presentation from the canvas.
2. Make each learning node a single visual/card layer.
3. Add one-click automatic layout presets in four directions.
4. Preserve independent manual node dragging after any automatic layout.
5. Keep semantic graph data unchanged when layout is applied.

## Product / Interaction Requirements

### 1. Canvas contains only graph-oriented content

Remove the project-information block/card/header currently rendered inside the canvas area.

The canvas may contain:
- learning nodes;
- edges / connection handles;
- graph navigation controls already required by the product;
- the new compact layout control.

Project metadata itself is not deleted from the product/domain. This task only removes its presentation from the canvas. Existing project-detail or sidebar surfaces may continue to own that information.

### 2. Flatten node visual hierarchy

A node must render as one card/layer rather than an outer node container plus a visually separate inner content card.

The single node surface owns, as applicable:
- title / question text;
- progress or completion information;
- child-count information;
- chat entry;
- selection / focus treatment;
- hover treatment;
- connection handles;
- drag target.

Do not preserve a second decorative shell that makes the node look like two stacked boxes.

The semantic node model does not need to change merely to achieve this visual simplification.

### 3. Add compact automatic-layout control

Add one compact `布局` / Layout entry rather than four large permanent buttons.

The menu must expose at least:
- `↓ 从上到下`
- `↑ 从下到上`
- `→ 从左到右`
- `← 从右到左`

For English locale, use equivalent concise labels.

### 4. Automatic layout behavior

Applying a layout preset must:
- calculate positions from the current graph/tree relationships;
- place the root/start side at the logical origin of the selected direction;
- expand descendants layer by layer;
- maintain reasonable spacing between sibling and generation levels;
- avoid node overlap;
- reduce unnecessary edge crossings where reasonably possible;
- update node coordinates only.

Applying layout must NOT:
- create/delete nodes;
- create/delete/change semantic edges;
- change node content;
- change learning progress/state;
- change conversation state;
- change project semantic data.

### 5. Manual movement remains independent

After automatic layout:
- every node remains independently draggable;
- dragging one node must not move sibling, parent, child, or the entire graph as a group;
- manual drag changes only that node's UI position according to the existing workspace/preference ownership rules.

When the user invokes automatic layout again, positions are recalculated from the current semantic graph regardless of previous manual positions.

### 6. Persistence / state boundary

Layout direction does not need to become domain-semantic state unless existing architecture already models it as a UI preference.

Node positions remain presentation/workspace state and must not mutate `DomainSnapshot` semantic relationships.

Do not introduce a new semantic graph model for this feature.

## Visual Requirements

- Keep the control visually lightweight and consistent with the current toolbar/chrome.
- The layout menu must not dominate the canvas.
- Node flattening should reduce borders, shells, and redundant padding rather than simply removing one DOM wrapper while preserving the same two-layer appearance.
- Existing light/dark themes must remain legible.
- Transitions used during layout should feel controlled and should not introduce canvas/background flashing.

## Edge Cases

- Empty project / zero nodes: layout action should be disabled, hidden, or safely no-op without errors.
- Single node: applying any direction keeps a valid stable position.
- Disconnected nodes, if currently supported: layout must not crash; place them predictably without overlap or preserve a documented existing behavior.
- Repeatedly applying the same layout should produce stable positioning rather than drift.
- Switching between the four directions must preserve the same graph relationships.

## Non-goals

This task does not:
- redesign project metadata editing;
- remove project metadata from persistence/domain;
- redesign node conversation behavior;
- alter learning-state semantics;
- add free-form graph layout algorithms beyond the four requested directional tree presets;
- merge this requirement into any prior UI PR because code areas are similar.

## Acceptance Criteria

1. No project-information card/block is visible inside the main graph canvas.
2. A learning node visually presents as one card/layer; there is no obvious outer-card + inner-card nesting.
3. A compact layout control exposes all four directions: top-to-bottom, bottom-to-top, left-to-right, right-to-left.
4. Each layout direction arranges a multi-level learning tree in the expected direction with no node overlap under representative fixture/data.
5. Layout changes positions only; node/edge identities, counts, content, and semantic relationships remain unchanged.
6. After layout, dragging one node moves only that node.
7. Re-running layout restores a deterministic automatic arrangement from the current graph.
8. Existing project switching, node selection, node chat entry, edge rendering, theme, and persistence behavior continue to work.
9. Relevant unit/component/E2E coverage is added or updated for layout direction and regression-sensitive node dragging/state boundaries.
10. No canvas/background flash or group-node movement regression is introduced.

## Regression Surface

Pay particular attention to:
- XYFlow node position updates and drag handlers;
- any custom node wrapper / selection shell;
- edge handle positioning after node flattening;
- project switching and restored node positions;
- semantic persistence versus UI preference persistence;
- chat entry / node focus interactions;
- light/dark theme styles;
- previous fixes for independent node dragging and canvas flashing.

## Requirement Challenge Result

- **Information architecture:** project metadata is redundant on the canvas and is intentionally moved out of this surface rather than deleted from the product.
- **State model:** layout is presentation state; no semantic-node/edge mutation is authorized.
- **Interaction:** automatic layout and manual drag are complementary; one-click sorting must not lock nodes into a layout system.
- **Engineering:** implementation should respect the existing `DomainSnapshot` semantic boundary and XYFlow rendering boundary.
- **Regression:** node drag isolation, edge handles, persistence separation, theme behavior, and canvas flashing are explicit acceptance surfaces.

No unresolved material product decision remains for this scope.

## Cursor Planning Gate

Cursor completed Plan mode on this branch:

1. audited canvas project-info (`BootstrapSummary` in `.tree-pane` vs TASK-010 Project Root vs shell/sidebar metadata);
2. audited node chrome double-layer (`.learning-node-shell` + `.learning-node`) and PR-038 drag/persistence boundaries;
3. audited `computeLayout` (TB-only) and preference `nodePositions` write path;
4. wrote `.coco/plans/PR-040-node-layout-simplification-plan.md` with binding decisions D1–D14, slices, tests, and material risks;
5. advanced this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt`.

**Material risk called out for Plan Review:** D1 removes `BootstrapSummary` from the canvas only and **keeps** Project Root on the graph (TASK-010). If review requires hiding Project Root instead, that is an explicit requirement amendment.

## G2 Plan Review — Approved

ChatGPT G2 Plan Review approved the Plan on PR #40.

Binding confirmation:
- D1/D2 accepted as written: remove `BootstrapSummary` / project-information presentation from the canvas; retain the Project Root learning node.
- Canonical Task Gate synchronized to `plan_approved: true`, `stage: implementation`, `next_expected_actor: cursor` before product implementation.

## Acceptance Review — Changes Required

Acceptance blocked on stale E2E: `e2e/specs/project-bootstrap.spec.ts` still asserted `bootstrap-recommended` after `BootstrapSummary` was unmounted from the canvas.

Canonical Task moved to `stage: fixing` / `acceptance_approved: false` / `next_expected_actor: cursor`.

## Acceptance Fix — Complete

Updated `e2e/specs/project-bootstrap.spec.ts` to the new product truth:

- assert `bootstrap-summary` / `bootstrap-recommended` are absent from the canvas;
- verify recommended entry via `[data-node-id][data-recommended='true']` learning nodes;
- click a recommended canvas node for focus / chat / inspector.

`BootstrapSummary` was not restored.

E2E evidence on head `b8f45fe95bf77df93b96dbb5e4f285101e09fb7e`: Playwright **11 passed** (`project-bootstrap`, `project-lifecycle`, `project-root-canvas-stability`, `persistence-boundary`, `critical-interaction`).

## Acceptance Review — Approved

G3 Acceptance approved by ChatGPT.

| Field | Value |
| --- | --- |
| Accepted head | `b8f45fe95bf77df93b96dbb5e4f285101e09fb7e` |
| Decision | `acceptance_approved: true` |
| Finding | Stale `bootstrap-recommended` E2E assertion — resolved |
| Evidence | Targeted Playwright suite **11 passed** on the accepted head |

## Merge Finalization — Ready for Merge

Canonical workflow metadata synchronized after G3 acceptance:

| Check | State |
| --- | --- |
| Task stage / gates | `accepted` / `acceptance_approved: true` / `completion_verified: false` |
| Accepted head recorded | `b8f45fe95bf77df93b96dbb5e4f285101e09fb7e` |
| Plan execution metadata | `accepted` / finalization-complete (design content unchanged) |
| Acceptance evidence | Verified (fix + E2E receipt on accepted head) |
| Transport | PR #40 / `task/node-layout-simplification` |
| Finalization status | `ready_for_merge` |

No further product-code work was required before merge.

## Post-Merge Completion Reconciliation

The accepted implementation was squash-merged through PR #40.

```yaml
reconciliation:
  task_id: PR-040-node-layout-simplification
  cause: workflow_state_mismatch
  original_integration_ref: PR-40
  merge_commit: 5f677ad518e22806eef937ae20b8b479fe07d2f9
  implementation_replayed: false
  repaired_artifacts:
    - .coco/tasks/PR-040-node-layout-simplification.md
    - .coco/plans/PR-040-node-layout-simplification-plan.md
```

The verified merge receipt closes the task: `stage: done`, `completion_verified: true`.
