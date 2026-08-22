---
task_id: TASK-001
title: Learning Node Content, Direct Chat, and Dynamic Multi-Edge Routing
development:
  stage: done
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: true
    merge_verified: true
  next_expected_actor: none
artifacts:
  plan: ../plans/TASK-001-plan.md
  pr: https://github.com/bewaterhere-coder/project-learning-tree/pull/18
---

# TASK-001 — Learning Node Content, Direct Chat, and Dynamic Multi-Edge Routing

## Goal

Upgrade the Learning Tree graph so each Learning Node is a readable learning unit, provides a direct node-bound conversation entry, and supports clear multi-edge rendering whose visual attachment adapts to node position.

## Expected behavior

### Readable Learning Node

Each materialized Learning Node must show enough information to understand the question without opening another panel:

- question/title;
- question detail/goal or equivalent short description;
- relevant state cues;
- direct Chat entry.

Long detail text may be visually truncated. Full conversation history, evidence, DoD, and learning recap do not belong inside the graph node.

### Direct Node Chat

- Node body click keeps the existing behavior: Focus Node + open Inspector; it must not open Chat.
- Node Chat action opens Conversation and binds it to that Node.
- Node Chat may update Current Focus as required for follow-focus binding, but must **not** open Inspector/Contextual Workspace as an additional side effect.
- Chat interaction must not accidentally trigger node dragging, panning, or the node-body click handler.

### Multiple visible links, tree semantics preserved

The current semantic hierarchy remains a tree:

- at most one semantic parent (`parentId`);
- many semantic children (`childIds`);
- Blocking / Active Stack / receded state remain flags on existing parent→child relationships;
- Frontier is not a materialized graph edge.

The UI must support all legitimate simultaneous graph links allowed by that model, especially one incoming parent edge plus multiple outgoing child edges. It must not impose a one-in/one-out rendering restriction.

Multi-parent domain semantics are out of scope and require a separate Product/Domain decision.

### Dynamic edge attachment

Visual attachment is derived from current node geometry, not semantic state.

Expected directional behavior:

```text
target right of source  → source.right  → target.left
target left of source   → source.left   → target.right
target below source     → source.bottom → target.top
target above source     → source.top    → target.bottom
```

For diagonal placement, use the dominant axis; ties may prefer vertical to match the default tree layout.

Dragging nodes must update attachment/routing from live node positions rather than stale persisted positions.

Multiple edges using one side should remain distinguishable where practical without introducing a heavy routing subsystem unless evidence shows it is necessary.

## Architecture constraints

Preserve:

- `DomainSnapshot` as semantic source of truth;
- `@xyflow/react` graph state/rendering as derived view state;
- existing Focus semantics;
- Conversation ownership, identity, pinning and persistence;
- project switching and per-project pin behavior;
- Blocking / Frontier / Learning Loop semantics;
- semantic persistence boundaries;
- existing semantic edge metadata.

Visual `sourceHandle` / `targetHandle` values must remain derived UI state and must not become persisted domain truth.

Do not redesign Workspace ownership, Domain architecture, or introduce Elk/Dagre/custom pathfinding without evidence.

## Approved Plan

Canonical implementation plan: `docs/plans/TASK-001-plan.md`.

Plan review resolved two blockers:

1. multi-link support is explicitly rendering support within the existing one-parent/many-children tree domain, not implicit multi-parent semantics;
2. Node Chat uses node focus + Chat binding without `focusAndOpenInspector`, so Chat does not open Inspector.

## Acceptance criteria

### Node rendering

- Node visibly communicates more than title-only content when detail exists.
- Long detail does not break layout.
- Every eligible materialized node has a visible direct Chat action.

### Chat

- Node Chat opens Conversation and binds to the clicked node.
- Node Chat does not open Inspector when Inspector was closed.
- Node Chat does not cause unintended drag/pan/body-click behavior.
- Node body click still focuses and opens Inspector without opening Chat.

### Routing

- Right, left, above, and below placements select sensible attachment sides.
- Dragging across those relative positions updates attachment from live positions.
- Routing state is not persisted into semantic DomainSnapshot.

### Multiple links

- One node can visibly maintain multiple outgoing child edges and one incoming + multiple outgoing edges.
- Multiple edges remain attached after movement.
- No multi-parent semantic relationship is introduced.

### Regression

Existing behavior remains valid for project switching, Focus, per-project pinning, node dragging, semantic persistence, Conversation persistence, Blocking / Frontier semantics, and Learning Loop behavior.

Relevant automated tests must remain green and new tests must cover the material behavior introduced by this task.

## Completion Evidence

Acceptance review passed for PR #18 with repository-visible evidence:

- implementation matches the approved plan and acceptance criteria;
- GitHub Actions CI run #54 completed successfully;
- `check` passed typecheck, unit tests, and build;
- `e2e` passed the Playwright acceptance suite;
- PR #18 merged successfully into `main`;
- merge commit: `e1a775ba2c9905d82332fb9f1c0c1922a639253c`;
- `main` was re-read after merge before `merge_verified` was set.

TASK-001 is complete.
