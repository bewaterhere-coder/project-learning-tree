# TASK-010 — Light Mode Canvas Cursor Visibility

```yaml
task_id: TASK-010
title: Light Mode Canvas Cursor Visibility
related_to:
  - TASK-009
relation: same-canvas-ui

development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: cursor

artifacts:
  requirement: docs/requirements/TASK-010-light-mode-canvas-cursor-visibility.md
  plan: docs/plans/TASK-010-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-010-light-mode-canvas-cursor-visibility
```

## 1. Problem

In light mode, the mouse pointer is difficult to see when it moves over the learning canvas. On a large bright canvas, the user can lose track of the pointer position, especially before panning, selecting a node, or starting another interaction.

This is a direct usability defect: the primary workspace is the canvas, so pointer location must remain immediately perceptible in the light theme.

## 2. Goal

Make the pointer clearly visible and semantically correct across canvas interaction states in light mode, without introducing unnecessary custom cursor UI or changing unrelated interaction behavior.

Expected result:

> When the pointer enters the light canvas, the user can immediately identify its position and understand whether the current surface can be panned, clicked, edited, or resized.

## 3. Scope

### 3.1 Light-mode cursor visibility

Audit the current canvas/theme/CSS cursor behavior and fix the source of poor pointer contrast in light mode.

Prefer native platform cursors and normal CSS cursor semantics when they provide sufficient visibility. Do not introduce a custom cursor asset unless the native cursor remains demonstrably insufficient on supported platforms.

### 3.2 Interaction-state cursor semantics

Ensure cursor state matches the active interaction surface:

- empty/pannable canvas: `grab` where panning is available;
- active canvas panning: `grabbing`;
- clickable node controls/actions: `pointer`;
- text input/editing surfaces: `text`;
- resize handles: the appropriate resize cursor;
- other existing interactive surfaces: preserve their correct semantic cursor.

Do not force one global cursor over the entire application.

### 3.3 Theme behavior

The fix must work with the existing theme system.

If a custom cursor is truly required after inspection:

- light mode must use a high-contrast cursor treatment;
- dark mode must remain legible;
- hotspot must align with the visible pointer tip;
- cursor assets must not create regressions in DPI/scaling or browser behavior.

A custom SVG/image cursor is a fallback, not the default implementation target.

## 4. Non-goals

This task does not authorize:

- redesigning the canvas visual system;
- changing node selection semantics;
- changing pan/zoom behavior;
- replacing React Flow;
- creating a decorative cursor-following effect;
- adding cursor animations;
- changing unrelated theme colors;
- folding this requirement into TASK-009 or another active PR.

## 5. Implementation Guidance

Before changing code, inspect the current cursor behavior across the canvas root, React Flow pane/viewport, nodes, controls, text fields, handles, resize surfaces, and theme-level CSS.

Choose the smallest implementation that fixes the actual source of the problem.

Do not paper over the issue with a broad `cursor` rule that breaks more specific interaction states.

If React Flow already applies appropriate cursor states, preserve them and only override the light-theme case that causes insufficient visibility or incorrect inheritance.

## 6. Acceptance Criteria

TASK-010 is accepted when all of the following are true:

1. In light mode, moving the pointer across a large empty canvas does not cause the pointer to visually disappear or become difficult to locate.
2. The empty/pannable canvas communicates panning with the correct cursor state when applicable.
3. While actively panning, the cursor visibly changes to the active dragging state.
4. Node actions and other clickable controls still use an appropriate pointer cursor.
5. Text inputs/editable fields still use a text cursor.
6. Resize handles, if present, retain their correct resize cursors.
7. Dark mode remains usable and does not regress because of the light-mode fix.
8. Existing canvas selection, node dragging, pan/zoom, chat, inspector, and node interaction behavior remain unchanged apart from cursor presentation.
9. The implementation uses native/CSS cursor behavior unless there is concrete evidence that a custom cursor is necessary.
10. Relevant automated checks pass, and the light-mode cursor behavior is manually verified in the browser.

## 7. Regression Surface

Verify at minimum:

- light theme canvas;
- dark theme canvas;
- canvas pan/drag state;
- node hover/click/drag behavior;
- node action buttons;
- text editing/input surfaces;
- resize handles if present;
- browser zoom / normal display scaling where practical.

## 8. Requirement Challenge Result

The issue is local, reversible, and does not change product semantics, persistence, domain data, or architecture. No material product decision is unresolved.

The requirement is intentionally kept lightweight. The implementation should first fix native cursor contrast/state behavior and only escalate to custom cursor assets if inspection proves that necessary.
