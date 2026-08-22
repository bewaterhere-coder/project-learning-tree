---
task_id: TASK-001
title: Learning Node Content, Direct Chat, and Dynamic Multi-Edge Routing
development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    merge_verified: false
  next_expected_actor: human
artifacts:
  plan: ../plans/TASK-001-plan.md
  pr: https://github.com/bewaterhere-coder/project-learning-tree/pull/17
---

# TASK-001 — Learning Node Content, Direct Chat, and Dynamic Multi-Edge Routing

## Goal

Upgrade the Learning Tree graph so that each Learning Node is a readable learning unit, provides a direct node-bound conversation entry, and supports clear multi-edge relationships whose visual attachment adapts to node position.

The graph should communicate what each question is about without forcing the user to open a separate panel, while preserving the existing principle that conversation belongs to a Learning Node and that graph rendering is not the semantic source of truth.

## Problem

The current graph experience is too structurally sparse:

- nodes can feel like empty/title-only graph shells instead of meaningful question units;
- entering a conversation is not direct enough from the node itself;
- edge attachment can look wrong when nodes move relative to each other;
- a node must be able to participate in multiple relationships without a one-in/one-out visual or data-model assumption.

## Expected Behavior

### 1. A Node is a readable question unit

Each normal Learning Node must directly show enough information for the user to understand what it represents.

At minimum, render:

- question/title;
- question detail or short description/summary;
- relevant state information when useful;
- a direct Chat entry.

Long detail text may be visually truncated to preserve scanability, but the node must not collapse to a title-only shell when detail exists.

### 2. Direct Chat entry on every eligible Node

Each eligible Learning Node must expose a visible Chat icon/action.

Interaction contract:

```text
click node body
→ Focus Node

click node Chat action
→ Open Conversation Panel
→ bind Conversation to that Node
```

`Focus` and `Open Chat` remain separate actions.

Focusing or selecting a node alone must not automatically open Chat.

The Chat action must not accidentally trigger unintended node drag, selection, or graph interaction.

### 3. Node and Conversation responsibilities remain separate

Node responsibility:

> Quickly communicate what this learning question is about.

Conversation responsibility:

> Explore the question deeply.

Do not render full conversation history inside the graph node.

### 4. One Node supports multiple relationships

The graph and UI must not assume that one node has only one incoming and one outgoing relationship.

A node may have multiple incoming and outgoing edges, including relationships already supported by the domain such as child, parent, blocking, frontier, or other semantic relationships.

UI handle structure must not restrict domain relationship cardinality.

### 5. Edge attachment adapts to relative node position

Edge rendering must not globally force all connections through fixed left/right handles.

The visual attachment side should be derived from current source/target positions.

Expected directional behavior:

```text
target right of source  → source.right  → target.left
target left of source   → source.left   → target.right
target below source     → source.bottom → target.top
target above source     → source.top    → target.bottom
```

For diagonal placement, choose a sensible primary direction based on relative geometry.

### 6. Edge routing updates after node movement

When a node is dragged and its relative position changes, the edge attachment/routing should update accordingly.

Example:

```text
Before:
A → B

After B moves above A:
B
↑
A
```

The edge should use a top/bottom relationship rather than continuing to visually force a stale left/right attachment.

### 7. Multiple edges remain readable

Multiple edges may use the same side of a node.

Avoid, where practical:

- all edges collapsing into the exact same visual path;
- all connections occupying one indistinguishable pixel location;
- routes unnecessarily crossing through node content.

The implementation may use XYFlow-compatible techniques such as multiple handles, handle offsets, custom edges, Bezier/smooth routing, or another minimal routing strategy consistent with the existing architecture.

Connector mechanics must remain visually secondary to the learning content.

## Architecture Constraints

Preserve the current project boundaries and contracts:

- `DomainSnapshot` remains the semantic source of truth;
- `@xyflow/react` graph state/rendering is not domain truth;
- Focus semantics remain separate from Chat opening;
- existing Conversation ownership and persistence remain intact;
- existing project switching and per-project pin behavior remain intact;
- Blocking / Frontier / Learning Loop semantics remain intact;
- existing semantic edge metadata must be preserved;
- do not redesign Workspace ownership or the domain architecture for this task.

Reference project constraints:

- `.coco/project.md`
- `AGENTS.md`
- `docs/product/interaction-spec.md`
- `docs/product/domain-model.md`

## Routing / Persistence Constraint

Visual routing is derived presentation state.

Prefer:

```text
Semantic Edge
+
Node Positions
→ Derived Handle / Edge Routing
```

Do not make layout-derived `sourceHandle` / `targetHandle` values into permanent domain truth merely to solve rendering.

If the current XYFlow integration requires handle identifiers at render time, derive them from current layout or maintain them in view state rather than changing semantic relationship meaning.

## Scope

In scope:

- Learning Node presentation;
- node detail/summary rendering;
- direct node Chat action;
- Conversation binding from the node Chat action;
- dynamic edge attachment/routing;
- multiple-edge rendering support;
- relevant tests and regression coverage.

## Non-Goals

Do not use this task to:

- redesign the entire Learning Tree UI;
- add new learning-domain relationship types unless required by an existing contract;
- move Conversation ownership into Node components;
- persist graph routing as semantic domain data;
- add future milestone functionality unrelated to this requirement;
- introduce a heavy graph-layout or routing subsystem without evidence it is necessary.

## Planning Questions Requiring Code Evidence

Cursor should inspect the current implementation and determine:

1. which component currently owns Learning Node rendering;
2. how node data maps from `DomainSnapshot` into XYFlow node data;
3. how Focus and Conversation open/binding are currently wired;
4. how handles and edges are currently constructed;
5. whether multiple edges are already supported semantically and only need rendering changes;
6. the smallest robust way to derive source/target attachment sides after node movement;
7. whether multiple handle offsets or custom edge routing are needed for readable same-side multi-edges;
8. which existing tests protect Focus, pin, project switching, persistence, and Conversation behavior.

## Acceptance Criteria

### Node rendering

- Every normal Learning Node with detail content visibly communicates more than only its title.
- Long content does not break node layout.
- Each eligible Node has a visible direct Chat action.

### Chat interaction

- Clicking the node Chat action opens Conversation.
- Conversation binds to the clicked Node.
- Clicking Chat does not produce unintended graph drag/selection behavior.
- Focusing/clicking the Node body alone still does not automatically open Chat.

### Edge routing

Representative relative placements render with sensible attachment sides:

- target right of source;
- target left of source;
- target above source;
- target below source.

Dragging nodes across those relative positions causes routing/attachment to update.

### Multiple edges

- One Node can visibly maintain multiple incoming/outgoing relationships.
- Multiple edges remain attached after node movement.
- The implementation does not impose a one-in/one-out domain restriction.

### Regression

Existing behavior remains valid for:

- project switching;
- Focus;
- per-project pin behavior;
- node dragging;
- semantic persistence;
- Conversation persistence;
- Blocking / Frontier semantics;
- Learning Loop behavior.

Relevant existing automated tests must continue to pass, and new tests must cover the material behavior introduced here.

## Definition of Done

This task is not Done when the Plan is written.

Current Gate is `planning`. The canonical plan is in `docs/plans/TASK-001-plan.md` and is awaiting Plan review.

Implementation is forbidden until `plan_approved=true` is recorded after Plan review.
