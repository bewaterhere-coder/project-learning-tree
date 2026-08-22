# Domain Model

Status: Frozen for M1 implementation.

## Aggregates

### LearningProject

Owns project identity and one or more Learning Passes.

### LearningPass

Represents one bounded learning attempt. It owns:

- tree membership and root node references;
- one Active Stack;
- Current Focus as an independent navigation pointer;
- pass-scoped Frontier items;
- pass completion state.

### LearningNode

A first-class, materialized learning question.

Working M1 shape:

```ts
type NodeLifecycle = "open" | "active" | "closed" | "parked";

type LearningDepth = "L1" | "L2" | "L3";

interface LearningNode {
  id: string;
  parentId?: string;

  question: string;
  goal: string;

  lifecycle: NodeLifecycle;
  targetDepth: LearningDepth;

  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;

  childIds: string[];
  blockingChildIds: string[];

  conversationThreadId: string;
  reopenHistory: ReopenEvent[];
}
```

`blocked` is intentionally absent from `NodeLifecycle`.

Blocking is derived from unresolved required Blocking Children.

## LearningPass state

```ts
interface LearningPass {
  id: string;
  projectId: string;

  rootNodeIds: string[];
  activeStack: string[];
  currentFocusNodeId?: string;

  frontier: FrontierItem[];
}
```

### Active Stack

The Active Stack is the single currently worked learning path.

Example:

```text
[Q2, Q2.1, Q2.1.1]
```

Multiple Blocking Children may exist under Q2, but only one child branch may extend the Active Stack at a time.

### Current Focus

`currentFocusNodeId` is separate from the Active Stack.

Focusing a node is navigation. It must not implicitly activate, park, close, reopen, or otherwise mutate lifecycle state.

## Value objects

### Criterion

A structured Definition of Done item.

```ts
interface Criterion {
  id: string;
  description: string;
  required: boolean;
  status: "unsatisfied" | "satisfied";
  evidenceIds: string[];
  evidenceRequired: boolean;
  notes?: string;
}
```

A required Criterion with `evidenceRequired: true` cannot be considered convergence-complete without qualifying Evidence.

### Evidence

```ts
interface Evidence {
  id: string;
  type: string;
  reference: string;
  note?: string;
}
```

The exact evidence taxonomy may evolve after M1, but M1 must support Criteria referencing Evidence explicitly.

### FrontierItem

A pass-scoped, unmaterialized candidate question.

```ts
interface FrontierItem {
  id: string;
  question: string;
  sourceNodeId: string;
  reason?: string;
  createdAt: string;
}
```

A Frontier item is not a Learning Node until an explicit materialization/promotion command succeeds.

### ReopenEvent

```ts
interface ReopenEvent {
  id: string;
  reason: string;
  reopenedAt: string;
}
```

Reopen must preserve prior learning history.

## Derived state

### Blocked

```text
isBlocked(node)
  = exists unresolved required blocking child
```

`Blocked` is computed and must not be persisted as the primary lifecycle value.

This prevents lifecycle divergence such as a node remaining stored as `blocked` after its final blocker has been resolved.

## Domain commands

M1 should expose explicit operations equivalent to:

```text
focusNode
activateNode
createBlockingChild
activateBlockingChild
moveCandidateToFrontier
promoteFrontierItem
parkNode
resumeParkedNode
evaluateConvergence
closeNode
reopenNode
returnToParent
completePass
```

Names may vary if semantics remain exact.

## Core invariants

1. A Learning Pass has at most one Active Stack.
2. An Active Stack represents exactly one branch/path through the tree.
3. Multiple unresolved Blocking Children may exist for one parent.
4. Only one Blocking Child branch may extend the Active Stack at any moment.
5. `Blocked` is derived, never stored as the main lifecycle enum.
6. Current Focus is independent from lifecycle and the Active Stack.
7. Focusing a node alone cannot mutate domain lifecycle state.
8. A Closed node cannot be part of the Active Stack.
9. A Closed node may reopen only through an explicit command with a non-empty reason.
10. Reopen preserves previous evidence, summary, conversation, and closure/reopen history.
11. A node cannot close while required Blocking Children remain unresolved.
12. A node cannot close while required DoD Criteria are unsatisfied.
13. Evidence-required Criteria cannot converge without referenced Evidence.
14. Frontier belongs to a Learning Pass and every Frontier item retains `sourceNodeId`.
15. Frontier items are not tree nodes until explicitly materialized.
16. Parked represents a materialized node paused from active work; Frontier represents an unmaterialized candidate.
17. AI output cannot bypass domain validation or mutate domain state directly.
18. Domain objects do not depend on UI, persistence, browser, LLM, GitHub, or network concerns.

## Architecture boundary

```text
src/domain
    ↑
src/application
    ↑
src/infrastructure   src/ui
```

The Domain layer must be runnable and fully testable in Node without a browser.
