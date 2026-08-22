# M1 — Domain Engine

## Goal

Implement and test the Learning Tree state machine without React, storage, LLMs, GitHub APIs, browser dependencies, or M2+ UI concerns.

The M1 product semantics are frozen by:

- `docs/product/interaction-spec.md`
- `docs/product/domain-model.md`

## Deliverables

- Domain entities and value objects
- LearningPass Active Stack
- Independent Current Focus semantics
- Derived blocking state
- Structured Criterion + Evidence DoD model
- Pass-scoped Frontier with `sourceNodeId`
- Explicit reopen history
- Explicit domain operations
- Invariant enforcement
- Deterministic unit tests
- Minimal public API for later application/UI layers

## Required scenarios

### Activation and focus

1. Activate an eligible Open node and place it on the Active Stack.
2. Focus another node for inspection without mutating the Active Stack or lifecycle.
3. Reject invalid Active Stack paths.

### Blocking children

4. Create a Blocking Child from an Active node.
5. Allow multiple unresolved Blocking Children under one parent.
6. Derive parent `Blocked` while any required Blocking Child remains unresolved.
7. Activate only one blocking branch on the Active Stack at a time.
8. Close one Blocking Child while another remains unresolved and confirm the parent remains derived `Blocked`.
9. Resolve the final Blocking Child and confirm the parent becomes derived unblocked.

### Frontier and parking

10. Move a non-blocking candidate to the pass-scoped Frontier without creating a Learning Node.
11. Preserve `sourceNodeId` on every Frontier item.
12. Explicitly promote/materialize a Frontier item before it becomes a Learning Node.
13. Park a materialized node and preserve its conversation, DoD, evidence, summary, and relationships.
14. Resume a Parked node explicitly.

### Definition of Done and convergence

15. Reject node closure when a required Criterion is unsatisfied.
16. Reject node closure when an evidence-required Criterion lacks qualifying Evidence.
17. Reject node closure while required Blocking Children remain unresolved.
18. Close a node when DoD, Evidence, blocking requirements, and summary requirements are satisfied.

### Reopen

19. Reject implicit reopening of a Closed node.
20. Reject explicit reopen when reason is empty.
21. Reopen a Closed node with a reason and preserve prior evidence, summary, conversation, and learning history.
22. Record a ReopenEvent.

### General integrity

23. Reject invalid lifecycle transitions.
24. Confirm `Blocked` is derived rather than stored as a lifecycle enum value.
25. Confirm AI/provider output cannot directly mutate domain state.

## Required domain semantics

- Multiple Blocking Children are allowed.
- Only one blocking branch may occupy the Active Stack at a time.
- `Blocked` is derived state.
- Closed nodes can reopen only explicitly with a reason.
- DoD uses structured Criterion + Evidence.
- Frontier belongs to the Learning Pass and retains `sourceNodeId`.
- Focus and Active are separate concepts.
- Viewing/focusing a node does not change Active state.
- Parked is a materialized paused node.
- Frontier is an unmaterialized candidate question.

## Constraints

- Zero React imports.
- Zero storage imports.
- Zero LLM/provider imports.
- Zero GitHub/network imports.
- Zero browser-only dependencies in Domain.
- No M2+ UI implementation.
- Tests express product behavior rather than implementation details.
- LLMs may propose actions in later milestones, but Domain remains the authority for state transitions.

## Exit criteria

M1 is complete only when:

1. all documented invariants pass deterministic unit tests;
2. all 25 required scenarios above are covered;
3. the Domain layer runs independently in Node;
4. no unresolved product question remains that changes M1 state semantics;
5. implementation matches the frozen Interaction Spec and Domain Model without introducing undocumented lifecycle behavior.
