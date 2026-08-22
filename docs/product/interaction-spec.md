# Product Interaction Spec

Status: Frozen for M1.

## Workspace

The MVP has four functional regions:

1. Learning Tree — hierarchy, lifecycle state, derived blocking state, Active Stack, and Current Focus.
2. Focus Panel — the currently focused node's learning conversation.
3. Node Inspector — goal, depth, Definition of Done, evidence, summary, lifecycle, and derived state.
4. Learning Frontier — pass-scoped adjacent questions that are relevant but deliberately not materialized into the tree.

## Core interaction semantics

M1 freezes the following rules:

1. Multiple unresolved Blocking Children may exist for one parent, but only one branch may occupy the current Active Stack at a time.
2. `Blocked` is a derived condition, not a stored lifecycle enum value.
3. Closed nodes may be reopened only by an explicit `Reopen` action with a required reason.
4. Definition of Done is represented by structured Criteria with Evidence, not boolean flags alone.
5. Frontier belongs to the Learning Pass; each Frontier item retains `sourceNodeId`.
6. Focused and Active are distinct concepts. Viewing another node does not change the Active Stack.
7. Parked is a materialized Learning Node that has been deliberately paused; Frontier is an unmaterialized candidate question.

## Node lifecycle

Persisted lifecycle:

```text
Open
  ↓ activate
Active
  ├─ park → Parked
  └─ convergence passed → Closed

Parked
  ↓ resume
Active

Closed
  ↓ explicit reopen(reason)
Open or Active, according to the domain command
```

`Blocked` is derived:

```text
isBlocked(node) = node has one or more unresolved blocking children
```

A node can therefore have lifecycle `Active` while also being derived as `Blocked`. The active branch is represented separately by the Active Stack.

## Active Stack vs Current Focus

The Learning Pass maintains an Active Stack representing the single learning path currently being worked through.

Example:

```text
Q2
└── Q2.1
    └── Q2.1.1
```

If `Q2.1.1` is the current active leaf, the Active Stack is:

```text
[Q2, Q2.1, Q2.1.1]
```

Only one blocking branch can be in this stack at a time, even if Q2 has several unresolved Blocking Children.

`Current Focus` is a UI/navigation concern. A user may inspect Q5 while Q2.1.1 remains the active learning leaf. Merely viewing Q5 must not mutate lifecycle state or the Active Stack.

## 1. Create project

User supplies a project name and optional source, initially a GitHub repository URL or a manually described subject.

System creates a Learning Project and a first Learning Pass.

## 2. Establish Core Questions

System may propose at most five Core Questions. The user can accept, edit, delete, or manually add questions before starting.

The system must not generate a complete question tree.

## 3. Activate or focus a node

Two actions are distinct:

### Focus Node

- changes Current Focus only;
- opens that node's conversation and inspector;
- does not modify lifecycle;
- does not modify the Active Stack.

### Activate Node

- explicitly places an eligible node onto the Active Stack;
- lifecycle becomes `Active` when required;
- the node normally also becomes Current Focus;
- activation must obey blocking and stack invariants.

## 4. Learn inside the node

Conversation belongs to the focused Learning Node. AI may answer, cite evidence, propose understanding updates, and suggest newly discovered questions.

New questions must be classified before entering the tree.

## 5. Blocking Question Gate

When AI or user identifies a new question, evaluate:

> Can the current learning node reach its Definition of Done without resolving this question now?

If no:

- classify as Blocking;
- offer Create Blocking Child;
- materialize the child as a formal Learning Node;
- multiple unresolved blocking children are allowed;
- only an explicitly activated child may extend the Active Stack;
- the parent becomes derived `Blocked` while any required Blocking Child remains unresolved.

If yes:

- do not create a tree child automatically;
- add the candidate to Frontier or discard it.

## 6. Learning Frontier

Frontier belongs to the Learning Pass.

A Frontier item is not a Learning Node. It must retain enough provenance to explain where it came from, including at minimum:

```text
id
question
description? / reason?
sourceNodeId
createdAt
```

A Frontier item can later be materialized as a root/core node or child only through an explicit promotion action or renewed blocking evaluation.

## 7. Parked Nodes

A Parked item is already a formal Learning Node in the tree.

Parking means:

- preserve the node, its conversation, DoD, evidence, summary, and relationships;
- remove it from active work;
- lifecycle becomes `Parked`;
- it may later be resumed explicitly.

Do not use Parked for questions that have never been materialized. Those belong in Frontier.

## 8. Definition of Done and Evidence

DoD is structured rather than boolean-only.

A Criterion should be able to express:

- what understanding or result is required;
- whether it is required or optional;
- its satisfaction state;
- evidence references supporting satisfaction;
- optional rationale or notes.

A Criterion is not considered satisfied merely because a checkbox was toggled if its evidence requirements are unmet.

## 9. Convergence Gate

Closing a node is a domain action, not a visual toggle.

Minimum checks:

- all required DoD Criteria are satisfied;
- required Evidence is present;
- all required Blocking Children are resolved;
- a concise summary can explain the answer at the intended Target Depth.

If checks fail, closure is rejected and the UI should expose the missing conditions.

## 10. Close and return

When a blocking child closes:

- remove it from the Active Stack when applicable;
- its parent becomes unblocked only when no unresolved required Blocking Children remain;
- return Current Focus to the parent by default when it is the next active stack node.

When a root/non-blocking node closes, the user may activate another eligible node.

## 11. Reopen

Closed nodes may be reopened, but never implicitly.

`Reopen` requires:

- explicit user or authorized domain action;
- a non-empty reason;
- preservation of prior summary, evidence, and closure history;
- a recorded reopen event suitable for later audit/history.

Reopening must not silently delete previous evidence or learning history.

## 12. Resume

After reopening the app, restore:

- active project and pass;
- Active Stack;
- Current Focus independently;
- tree lifecycle state;
- data needed to derive blocking state;
- per-node conversations;
- pass-scoped Frontier with `sourceNodeId`;
- DoD Criteria, Evidence, summaries, and reopen history.

Resume should not regenerate questions or replay AI actions.

## M1 product semantics

The seven previously open lifecycle questions are resolved and frozen for M1. Future changes to these semantics should be treated as explicit product/domain changes rather than implementation details.
