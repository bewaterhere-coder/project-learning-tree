# PR-042 — Canvas & AI Panel Interaction Usability

task_id: PR-042-canvas-chat-layout-usability
title: Canvas & AI Panel Interaction Usability

development:
  stage: acceptance
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: chatgpt

artifacts:
  requirement: docs/requirements/PR-042-canvas-chat-layout-usability.md
  plan: docs/plans/PR-042-canvas-chat-layout-usability-plan.md

transport:
  type: github-pr
  pr_number: 42
  branch: task/canvas-chat-layout-usability
  base: main

## Problem

Several current UI interactions are semantically unclear or inefficient for long-form AI-assisted learning: state controls expose labels such as “浮动 / 停靠 / 上下文” without clearly communicating the action, the AI conversation area is too constrained for long replies, learning nodes still render with an unnecessary outer title/wrapper, there is no one-click way to recover a full-tree view, and nodes can remain overlapped after drag.

## Goal

Make the canvas and AI panel easier to understand and operate without changing the underlying learning-domain semantics.

## Requirements

### 1. State controls use action labels

Controls describe what clicking will do, not merely repeat current state.

- When the AI panel is floating, show `停靠` as the available action.
- When the AI panel is docked, show `浮动` as the available action.
- When context is currently visible/enabled, show `隐藏上下文`.
- When context is currently hidden/disabled, show `显示上下文`.
- Do not show mutually exclusive state labels together in a way that leaves the action ambiguous.

### 2. AI conversation panel is resizable

Long AI replies must be readable without forcing the user into a small fixed viewport.

- Floating mode supports resizing width and height by drag.
- Prefer a familiar in-app panel interaction comparable to VS Code split/panel resizing.
- Docked mode supports resizing the panel through its divider.
- Enforce sensible minimum dimensions.
- Do not allow the panel to resize beyond the usable application viewport.
- Conversation content reflows and remains scrollable while resizing.
- Panel resize must not accidentally trigger canvas/node drag interactions.

### 3. Remove redundant node outer title/wrapper

A learning question renders as one visual node container.

- Remove the extra title/wrapper currently shown outside the node body.
- Put the question title inside the node's primary visual container.
- Preserve useful node metadata such as progress / child-question information inside that same container.
- Do not introduce a second card/frame around the node.

### 4. Add one-click “显示全部” viewport action

Add a canvas control that restores a useful global view of the current project tree.

Expected behavior:

- Compute bounds for all currently rendered learning nodes.
- Fit the viewport to those bounds.
- Center the tree with reasonable padding.
- Keep all nodes visible when practical within the current viewport.
- This is a viewport operation only; it must not rewrite semantic node positions or domain state.

Implementation may use the existing XYFlow/React Flow fit-view capability where appropriate.

### 5. Nodes must not remain overlapped after drag

Dragging may temporarily pass over other nodes, but the final dropped layout must be collision-free.

Behavior:

1. User drags a node freely.
2. On drop, detect overlap against other rendered nodes.
3. If there is no overlap, keep the dropped position.
4. If overlap exists, move only the dragged node to the nearest valid non-overlapping position.
5. The correction should feel visually stable; use a short transition/settling behavior if appropriate.

Constraints:

- Do not block the pointer from passing over other nodes during drag.
- Do not globally relayout the tree after every drop.
- Do not move unrelated nodes merely to resolve the dragged node's collision.
- Manual layout remains authoritative except for the final no-overlap invariant.

### 6. Keep collision resolution separate from explicit auto-layout

Collision resolution is a safety constraint, not a tree-layout command.

- Explicit auto-layout/reorder may reposition many nodes when the user asks for it.
- Collision correction only resolves the newly dropped node's illegal overlap.
- Do not couple the two behaviors.

## Non-goals

- No change to learning-domain state semantics.
- No new node lifecycle/status model.
- No global auto-layout on every drag.
- No redesign of AI response generation behavior in this task.
- No persistence migration unless existing UI-position persistence requires a minimal compatible update.

## Acceptance Criteria

1. Floating panel exposes `停靠`.
2. Docked panel exposes `浮动`.
3. Context enabled exposes `隐藏上下文`; context disabled exposes `显示上下文`.
4. Floating AI panel can be resized in both dimensions and remains usable at min/max bounds.
5. Docked AI panel size can be adjusted through its divider.
6. AI content remains readable/scrollable during and after resize.
7. Learning node renders as a single visual container with its title inside; redundant outer title/wrapper is gone.
8. A visible canvas action can fit all current nodes into view with padding.
9. Dropping a node in a non-overlapping position preserves that position.
10. Dropping a node overlapping another node automatically settles the dragged node into a nearby valid position.
11. Collision correction does not move unrelated nodes or trigger whole-tree auto-layout.
12. Existing zoom, pan, edge rendering, node dragging, chat open/close, pin/follow behavior, and project switching continue to work.

## Regression Surface

- XYFlow node drag/drop handlers and viewport state.
- Node position persistence/preferences.
- Floating/docked chat layout and resize behavior.
- Chat pointer-event boundaries vs canvas pointer events.
- Node visual component structure and edge anchor/measurement behavior after wrapper removal.
- Existing fit/zoom controls and project switching.

## Requirement Challenge

- Product: action-oriented labels remove the current ambiguity without adding more state controls.
- Interaction: resize must not steal or leak drag gestures into the canvas.
- Layout: overlap correction must preserve user-authored layout rather than becoming implicit auto-layout.
- Architecture: viewport fitting and collision correction remain UI/layout concerns; semantic `DomainSnapshot` must not become a graph-layout source of truth.
- Regression: removing node wrappers may affect XYFlow measurements/handles and therefore requires edge/anchor verification.

## Workflow Policy

This task is now authorized for implementation on the existing branch / PR only.

1. Read this canonical requirement and the approved plan before implementation.
2. Implement on `task/canvas-chat-layout-usability` / PR #42 only.
3. Do not create another task, branch, or PR for this requirement.
4. Preserve the approved architecture and regression boundaries.
5. When implementation evidence and required checks are complete, move the task to `acceptance` / `next_expected_actor: chatgpt` and stop.

## Cursor Planning Gate

Cursor completed Plan mode on this branch:

1. audited chat overflow placement/context labels (`ChatHeader` / `messages.ts`) — dual state nouns, not exclusive actions;
2. audited floating/docked resize (`ChatPanel` / `chatWidth` only; no `chatHeight`; floating has no resize handles);
3. audited node chrome after PR-040 — single `.learning-node` card; residual dead `.learning-node-shell` CSS and external `knowledge-cluster-title`;
4. audited canvas chrome — `LayoutMenu` auto-layout only; no `fitView` / “显示全部”;
5. audited drag-stop persistence vs auto-layout separation — single-id preference write; no drop collision pass;
6. wrote `docs/plans/PR-042-canvas-chat-layout-usability-plan.md` with binding decisions D1–D17, slices, tests, and material risks;
7. advanced this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt`.

## Plan Review — Approved with binding amendments

Plan approved for implementation with the following two clarifications, which override any conflicting shorthand in the Plan:

1. **Collision geometry must match real rendered nodes.** D13 must not assume `NODE_WIDTH × NODE_HEIGHT` if Learning Nodes can have variable measured dimensions. Prefer current XYFlow measured/rendered width and height for the dragged node and peers. Fixed constants are acceptable only if implementation verifies that all relevant Learning Nodes are actually fixed to those dimensions. The acceptance invariant is visual non-overlap, not mathematical non-overlap against stale nominal boxes.
2. **AC7 is a visual outcome, not a CSS-cleanup proxy.** The current `knowledge-cluster-title` is a plausible source of the apparent external title and may be removed as planned, but implementation must verify the rendered result. Dead `.learning-node-shell` cleanup alone does not satisfy AC7. After the change, the visible Learning Question must have one primary node container with its title inside and no redundant title/card layer outside it.

All other decisions D1–D17 are approved.

## Cursor Implementation Gate

Cursor completed implementation on this same branch / PR #42:

1. exclusive overflow action labels for placement (`浮动` / `停靠`) and context (`显示上下文` / `隐藏上下文`);
2. floating panel width+height resize handles with viewport clamps; docked divider retained; `chatHeight` preference persistence; scrollable message body;
3. AC7 visual cleanup — removed external knowledge-cluster titles and dead shell CSS; question remains inside the single `.learning-node` container;
4. canvas `显示全部` / Show all control calling XYFlow `fitView` on learning nodes only (viewport-only);
5. drop collision correction using measured/rendered node geometry with nominal fallback, moving only the dragged node;
6. unit/UI coverage including `resolve-drag-collision`, cluster regions, chat height preferences, and `tests/ui/pr-042-canvas-chat-layout.test.tsx`;
7. advanced this Requirement to `stage: acceptance` / `next_expected_actor: chatgpt`.

Awaiting ChatGPT acceptance review (`acceptance_approved=true`).
