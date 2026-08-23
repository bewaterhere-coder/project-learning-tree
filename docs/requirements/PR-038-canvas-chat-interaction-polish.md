# PR-038-canvas-chat-interaction-polish — Canvas & Node Chat Interaction Polish

```yaml
task_id: PR-038-canvas-chat-interaction-polish
title: Canvas & Node Chat Interaction Polish

development:
  stage: accepted
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: true
    completion_verified: false
  next_expected_actor: cursor

artifacts:
  requirement: docs/requirements/PR-038-canvas-chat-interaction-polish.md
  plan: docs/plans/PR-038-canvas-chat-interaction-polish-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  pr_number: 38
  branch: task/canvas-chat-interaction-polish
  base: main
```

## Problem

Current Learning Tree interaction feels mechanically coupled and visually dated in several high-frequency surfaces:

- dragging one learning node can move multiple sibling/related nodes together instead of only the node the user grabbed;
- dialogs, panels and transient UI appear/disappear abruptly without lightweight motion feedback;
- the Node Chat panel has poor information hierarchy: oversized title, oversized vertical close control, unclear mode buttons (`固定到此节点` / `浮动` / `停靠` / `上下文`), and a form-like composer;
- AI-generated follow-up learning actions such as adding child questions are visually too heavy when rendered as normal buttons.

## Goal

Make canvas manipulation predictable and make the Node Chat experience feel like a focused modern AI conversation attached to a learning node, while reducing workflow controls to the minimum visible surface.

## Scope

### 1. Independent node dragging

- Pointer dragging a node moves only that node by default.
- Parent/child/sibling nodes must not move because of relationship, layout grouping, or graph topology.
- Existing edges update visually as the dragged node moves.
- Automatic layout must not re-run as a side effect of ordinary node dragging.
- If a deliberate `重新布局` action exists or is introduced elsewhere, that explicit action may reposition multiple nodes; ordinary dragging may not.
- Multi-node dragging is out of scope unless an existing explicit multi-selection interaction already requires it.
- The dragged node's independent position must remain persisted according to the project's existing UI-preference/persistence boundary and survive reload where node positions currently survive reload.

### 2. Lightweight motion system

Apply restrained transitions to state changes that currently appear abruptly:

- Modal/Dialog open: backdrop fade in; panel fade in with subtle scale from roughly `0.98` to `1`.
- Modal/Dialog close: reverse fade/scale without abrupt disappearance.
- Popover/Dropdown/Context Menu: short opacity + roughly 4–8px positional transition.
- Sidebar/Inspector/Chat panel open/close: smooth opacity/position/size transition instead of instant appearance.
- Toast/transient feedback: short fade and slight vertical motion.
- Node hover/selection/focus and other visual-state changes: short color/border/background/shadow transitions where applicable.
- Do not add positional transition to active node dragging; pointer tracking must remain immediate and non-sticky.

Suggested motion tokens (adapt to existing design-token architecture rather than duplicating values):

- fast: 120–150ms
- normal: 180–220ms
- slow: 250–300ms
- easing: approximately `cubic-bezier(0.2, 0, 0, 1)`

Respect `prefers-reduced-motion` if the existing UI layer supports or can safely support it.

### 3. Node Chat panel redesign

The panel should communicate one thing first: **the user is discussing this learning node with AI**.

#### Header

- Reduce title hierarchy to approximately 15–16px / semibold; no oversized headline treatment.
- Allow at most two lines where practical; long titles should not dominate panel height.
- Replace the current large vertical `关闭对话` control with a small circular `×` icon button in the top-right (roughly 24–28px visual size, with an accessible hit target as needed).
- Close control should be visually quiet by default and gain background/feedback on hover; tooltip/accessible label can say `关闭对话`.
- Keep only genuinely primary controls visible in the header. Pin may remain as a small icon if the current pin behavior is still required.
- `浮动` / `停靠` and similar layout-mode controls must not remain as a row of prominent labeled buttons. If still required, move them behind a compact overflow menu or equivalent low-emphasis control.

#### Context presentation

- Do not expose `上下文` as a prominent button merely to reveal that the current node is context.
- The current node/question is the implicit conversation context.
- If context identity needs to be visible, use muted secondary text such as `正在讨论当前问题` / truncated node title.
- Any advanced context inspection should be secondary/discoverable rather than primary chrome.

#### Conversation body

- Present real conversation messages with clear but restrained user/AI hierarchy.
- Empty state should be concise and conversational, not look like a debug placeholder.
- Avoid unnecessary nested cards and control-heavy surfaces inside the message stream.
- New messages may use a short fade/appearance transition consistent with the motion tokens.

#### Composer

- Redesign the input as a modern conversation composer rather than a narrow old-style form field.
- Target roughly 44px minimum height, 10–12px corner radius, multi-line growth up to a sensible limit.
- Keep send action integrated with the composer (icon or compact action) instead of a large separate rectangular `发送` button.
- Preserve accessible keyboard behavior; if current behavior permits, `Enter` sends and `Shift+Enter` inserts a newline.

### 4. Follow-up learning actions are secondary text actions

After an AI answer, generated proposals such as `添加子问题` must not become large primary buttons/cards.

- Render proposal guidance as muted secondary text below the relevant answer.
- Use small inline text actions such as `添加` / `添加为子问题`.
- No filled button, large outline button, or visually dominant card for each proposal.
- Multiple proposals may appear as compact lines.
- After successful creation, replace the action inline with a quiet `已添加` state rather than opening another large confirmation surface.
- AI answer remains the primary content; learning-workflow actions are subordinate.

## Visual hierarchy

Preferred priority inside Node Chat:

1. node/question title;
2. conversation content;
3. composer;
4. low-emphasis learning/workflow actions.

Internal panel state and layout modes must not compete with conversation content.

## Localization

- In Chinese locale, all visible labels/tooltips introduced or touched by this task should use natural Chinese where localization exists.
- Avoid exposing internal state terminology when a simpler user-facing phrase or icon is sufficient.

## Non-goals

- Do not redesign the Learning Tree domain model.
- Do not add a new conversation state machine.
- Do not introduce new floating/docking semantics unless required to preserve existing behavior.
- Do not implement multi-select node dragging as part of this task.
- Do not add decorative animation that delays direct manipulation.

## Acceptance Criteria

1. Dragging any single node by approximately 100px changes only that node's position; every other node retains the same `x/y` coordinates, while connected edges follow the moved node.
2. Ordinary node drag does not trigger graph-wide/sibling layout movement and does not feel delayed by CSS position transitions.
3. Opening/closing dialogs and the Node Chat panel visibly uses restrained fade/position/scale transitions; no abrupt flash/disappearance remains on the touched surfaces.
4. Reduced-motion behavior is preserved where supported.
5. Node Chat no longer displays the current oversized title and vertical `关闭对话` button; close is represented by a compact top-right circular `×` control with accessible labeling.
6. `固定到此节点` / `浮动` / `停靠` / `上下文` are not presented together as prominent labeled button chrome. Required advanced layout controls, if retained, are visually secondary.
7. Chat title/body/composer typography has a coherent hierarchy; title no longer overwhelms the panel.
8. Composer behaves as a modern chat input and the send action is compact/integrated.
9. AI follow-up proposals such as adding child questions are rendered as low-emphasis text actions, not large buttons/cards, and successful addition can be seen inline.
10. Existing node conversation binding, message persistence, proposal semantics, and node-edge relationships continue to work; this task changes presentation/interaction behavior, not their domain meaning.

## Regression Surface

Verify at minimum:

- node drag and persisted position behavior;
- XYFlow edge updates;
- node selection/focus behavior;
- dialog/popover/panel visibility state;
- chat open/close and pin/binding behavior;
- existing conversation persistence and message sending;
- generated child-question proposal flow;
- dark/light theme readability and Chinese UI labels.

## Requirement Challenge Result

- **User:** primary chat actions are now clearly separated from advanced panel state controls.
- **Product:** redundant/prominent mode controls are explicitly demoted rather than expanded.
- **State model:** no new semantic conversation or node state is introduced.
- **Persistence:** only independent node position behavior must preserve the existing UI-preference persistence boundary.
- **Information architecture:** conversation content is the main surface; workflow proposals become secondary text actions.
- **Engineering:** likely touches XYFlow drag handling, chat panel/component styling, shared motion tokens, proposal rendering, and persistence regression tests, but does not require a domain schema migration.
- **Regression:** node movement, edge rendering, chat binding/persistence, proposal creation, localization, and theme behavior are explicit acceptance surfaces.

No unresolved material product decision remains for planning.

## Cursor Planning Gate

Cursor completed Plan mode on this branch:

1. audited drag persistence (`TreeCanvas` / `applyNodeDragStop` / `nodePositions`) and identified multi-select drag + cluster underlay as the coupling risks;
2. audited motion surfaces (`ConfirmDialog`, `Menu`, Chat/Inspector mount) and existing `--motion-*` tokens;
3. audited Node Chat chrome (`ChatHeader`, composer, context) and proposal cards;
4. wrote `docs/plans/PR-038-canvas-chat-interaction-polish-plan.md` with binding decisions D1–D13, slices, tests, and material risks;
5. advanced this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt`.

## Plan Review — Approved

ChatGPT reviewed the canonical Plan against this Requirement and approved implementation.

Approval notes:

- D1–D13 are accepted.
- Preserve single-node drag semantics; disabling accidental XYFlow multi-select drag is preferred over persisting a group of moved nodes.
- Keep floating/docking/context controls secondary; do not reintroduce them as prominent chrome during implementation.
- Motion must remain restrained and must not add pointer-tracking latency.
- Proposal actions must remain text-level affordances rather than visually returning to button/card treatment.

Implementation is authorized on the existing PR #38 branch only. After implementation, return evidence for acceptance review.

## Implementation Complete

Cursor implemented the approved Plan (D1–D13) on this branch:

1. Independent drag — `multiSelectionKeyCode`/`selectionKeyCode` null; single-node position batch filter; PR-038 drag regressions.
2. Motion — `--motion-slow` / `--motion-ease`, dialog/menu/panel enter-exit, `prefers-reduced-motion`.
3. Node Chat — compact title, circular × close, overflow for float/dock/context, textarea composer.
4. Proposals — muted text actions + inline `已添加` for accepted status.

Verification: `npm run typecheck`, `npm test` (348), `npm run build`.

## Acceptance Review — Changes Required

Acceptance is not approved yet. Two requirement-level gaps were found in the implementation diff:

1. **Dragged-node identity is not guaranteed in multi-position batches.** In `TreeCanvas.tsx`, when XYFlow reports multiple position changes, the filter chooses the current-focus/selected node as `keepId` rather than the actual node being dragged. A user can drag a node that was not already current focus; the defensive path can therefore preserve/move the wrong node and discard the grabbed node's position change. Fix the logic so the gesture target is authoritative (or remove the ambiguous batch filter if disabled multi-selection makes it unnecessary), and add a regression where the dragged node is explicitly **not** the current-focus node while all peers remain unchanged.
2. **Composer does not actually auto-grow.** `MessageComposer.tsx` changed to `textarea rows={1}`, while CSS only sets `min-height`, `max-height`, and `resize: none`. There is no content-height/autosize behavior (`field-sizing` or equivalent JS), so multi-line input stays at one visual height and scrolls instead of growing up to the intended cap. Implement actual auto-grow to the existing sensible maximum and add a focused regression where practical.

Keep the task on the existing PR #38 branch. After fixes, rerun the existing verification suite and return to acceptance review.

## Fix Complete — Acceptance Findings

1. **Drag identity:** `TreeCanvas` now records the gesture target via `onNodeDragStart` and prefers that id (then `dragging: true` changes, then the first position id) when filtering multi-position batches — never current-focus/selected. Regression: drag non-focus `q1` while a batch also moves focused `q2`; only `q1` moves/persists.
2. **Composer auto-grow:** `syncComposerHeight` + `useLayoutEffect` grow the textarea up to 160px; CSS adds `field-sizing: content` as progressive enhancement. Regressions cover helper cap/growth and Shift+Enter growth in Chat.

Verification: `npm run typecheck`, `npm test`, `npm run build`.

## Acceptance Review — Approved

Acceptance passes after the fixing round.

Verified against the implementation diff and dedicated regressions:

1. Drag gesture target is now authoritative via `onNodeDragStart`; the regression explicitly covers dragging non-focus `q1` while focused `q2` is present in the same position batch, and only the dragged node changes/persists.
2. Composer now has real content-driven auto-grow via `syncComposerHeight` + `useLayoutEffect`, capped at 160px, with Shift+Enter and cap regressions.
3. The previously reviewed chat hierarchy, compact close control, secondary overflow controls, motion tokens/reduced-motion behavior, and proposal text actions remain in scope and implemented.
4. Cursor reports `npm run typecheck`, `npm test`, and `npm run build` passing. No PR-triggered GitHub Actions workflow is configured for the current head, so there is no independent CI receipt to add.

`acceptance_approved=true`. Completion remains unverified because PR #38 is currently reported by GitHub as not mergeable against the latest `main`; integration conflict resolution/rebase is still required before merge.
