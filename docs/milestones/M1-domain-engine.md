# M1 — Domain Engine

## Goal

Implement and test the Learning Tree state machine without React, storage, LLMs, GitHub APIs, or browser dependencies.

## Deliverables

- Domain entities and value objects
- Explicit domain operations
- Invariant enforcement
- Deterministic unit tests
- Minimal public API for later application/UI layers

## Required scenarios

1. Activate an Open node.
2. Create a Blocking Child from an Active node.
3. Parent becomes blocked and child becomes Current Focus.
4. Close the blocking child after convergence succeeds.
5. Return to and reactivate the parent.
6. Move a non-blocking question to Frontier without creating a tree node.
7. Reject node closure when DoD is incomplete.
8. Close a node when DoD and blocking requirements are satisfied.
9. Reject invalid state transitions.

## Constraints

- Zero React imports.
- Zero storage imports.
- Zero LLM/provider imports.
- Zero GitHub/network imports.
- No M2+ UI implementation.
- Tests express product behavior rather than implementation details.

## Exit criteria

M1 is complete only when all documented invariants and required scenarios pass unit tests and unresolved product questions affecting state semantics are explicitly resolved.
