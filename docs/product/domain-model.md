# Domain Model

Status: Initial model; validate against Interaction Spec before implementation.

## Aggregates

### LearningProject

Owns project identity and one or more Learning Passes.

### LearningPass

Represents one bounded learning attempt with a tree, Current Focus, and Frontier.

### LearningNode

A first-class learning question.

Suggested fields:

```ts
interface LearningNode {
  id: string;
  parentId?: string;
  question: string;
  goal: string;
  status: "open" | "active" | "blocked" | "closed" | "parked";
  targetDepth: "L1" | "L2" | "L3";
  blocking: boolean;
  definitionOfDone: Criterion[];
  evidence: Evidence[];
  summary?: string;
  childIds: string[];
  conversationThreadId: string;
}
```

This is a working shape, not a frozen storage schema.

## Candidate value objects

- NodeId
- LearningDepth
- Criterion
- Evidence
- FrontierItem
- NodeSummary

## Domain commands

M1 should converge on explicit operations such as:

```text
activateNode
createBlockingChild
resolveBlockingChild
moveToFrontier
parkNode
evaluateConvergence
closeNode
returnToParent
completePass
```

## Core invariants

1. One Current Focus per Learning Pass in MVP.
2. A Closed node cannot be Current Focus.
3. A node cannot close while required blocking children remain unresolved.
4. Creating and activating a Blocking Child blocks its parent.
5. Resolving the final Blocking Child may reactivate its parent.
6. Frontier items are not tree nodes until promoted.
7. AI output cannot bypass domain validation.
8. Domain objects do not depend on UI, persistence, or network concerns.

## Architecture boundary

```text
src/domain
    ↑
src/application
    ↑
src/infrastructure   src/ui
```

Domain should be runnable and fully testable in Node without a browser.
