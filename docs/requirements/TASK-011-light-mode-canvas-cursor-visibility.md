# TASK-011 — Light Mode Canvas Cursor Visibility

```yaml
task_id: TASK-011
title: Light Mode Canvas Cursor Visibility
related_to:
  - TASK-009
  - TASK-010
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
  requirement: docs/requirements/TASK-011-light-mode-canvas-cursor-visibility.md
  plan: docs/plans/TASK-011-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-011-light-mode-canvas-cursor-visibility
```

## 1. Problem

In light mode, the mouse pointer is difficult to see when it moves over the learning canvas. On a large bright canvas, the user can lose track of the pointer position, especially before panning, selecting a node, or starting another interaction.

This is a direct usability defect because the canvas is the primary workspace and pointer location must remain immediately perceptible.

## 2. Goal

Make the pointer clearly visible and semantically correct across canvas interaction states in light mode, without introducing unnecessary custom cursor UI or changing unrelated interaction behavior.

Expected result:

> When the pointer enters the light canvas, the user can immediately identify its position and understand whether the current surface can be panned, clicked, edited, or resized.

## 3. Scope

### 3.1 Light-mode cursor visibility

Audit the current canvas/theme/CSS cursor behavior and fix the source of poor pointer visibility in light mode.

Prefer native platform cursors and normal CSS cursor semantics when they provide sufficient visibility. Do not introduce a custom cursor asset unless the native cursor remains demonstrably insufficient on supported platforms.

### 3.2 Interaction-state cursor semantics

Ensure cursor state matches the active interaction surface:

- empty/pannable canvas: `grab` where panning is available;
- active canvas panning: `grabbing`;
- clickable node controls/actions: `pointer`;
- text input/editing surfaces: `text`;
- resize handles: appropriate resize cursor;
- preserve correct semantic cursors on other existing interactive surfaces.

Do not force one global cursor over the entire application.

### 3.3 Theme behavior

The fix must work with the existing theme system and must not regress dark mode.

If a custom cursor is truly required after inspection:

- light mode must use a high-contrast treatment;
- dark mode must remain legible;
- hotspot must align with the visible pointer tip;
- cursor assets must not create DPI/scaling or browser regressions.

A custom SVG/image cursor is a fallback, not the default implementation target.

## 4. Non-goals

This task does not authorize:

- redesigning the canvas visual system;
- changing node layout or edge routing;
- changing selection/focus product semantics;
- replacing React Flow;
- adding decorative pointer effects, trails, halos, or animation;
- broad theme refactoring unrelated to cursor visibility.

## 5. Implementation Guidance

Cursor should first inspect the current implementation and determine whether the issue comes from application CSS, React Flow classes, theme overrides, browser/native cursor behavior, or another interaction layer.

Prefer the smallest robust fix. Use existing theme tokens/classes where possible. Avoid `!important` unless the cascade genuinely requires it and the Plan documents why.

## 6. Acceptance Criteria

1. In light mode, the pointer position is immediately visible over empty canvas space.
2. Empty pannable canvas exposes `grab` where panning is enabled.
3. During active panning, cursor changes to `grabbing`.
4. Clickable node actions expose `pointer` without overriding text/edit/resize states.
5. Text editing surfaces continue to expose `text`.
6. Resize handles keep the appropriate resize cursor.
7. Dark mode behavior is not degraded.
8. Existing node selection, drag, pan, zoom, chat, inspector, and edge behavior remain functionally unchanged.
9. The implementation does not introduce a custom cursor asset unless inspection shows native CSS cursors are insufficient.

## 7. Regression Surface

Verify at minimum:

- light and dark themes;
- empty canvas pan interaction;
- node hover/select/drag;
- node contextual actions;
- text inputs/editing surfaces;
- resize handles if present;
- browser zoom / normal DPI behavior;
- existing React Flow interaction classes and overrides.

## 8. Planning Gate

Cursor must first produce `docs/plans/TASK-011-plan.md` and commit it to this task branch.

Do not implement production code until the Plan is reviewed and `plan_approved=true`.
