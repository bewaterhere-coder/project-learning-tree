# Product Interaction Spec

Status: Draft — resolve before M1 implementation.

## Workspace

The MVP has four functional regions:

1. Learning Tree — hierarchy, node state, and Current Focus.
2. Focus Panel — the active node's learning conversation.
3. Node Inspector — goal, depth, Definition of Done, evidence, summary, status.
4. Learning Frontier — adjacent questions deliberately excluded from the current blocking path.

## Node lifecycle

```text
Open
  ↓ activate
Active
  ├─ discover blocking child → Blocked
  ├─ park → Parked
  └─ convergence passed → Closed

Blocked
  ↓ blocking child resolved
Active
```

## 1. Create project

User supplies a project name and optional source, initially a GitHub repository URL or a manually described subject.

System creates a Learning Project and a first Learning Pass.

## 2. Establish Core Questions

System may propose at most five Core Questions. The user can accept, edit, delete, or manually add questions before starting.

The system must not generate a complete question tree.

## 3. Focus a node

When a user focuses an Open node:

- node becomes Active;
- it becomes Current Focus;
- its conversation thread opens;
- Node Inspector shows Goal, Target Depth, DoD, Evidence, and Summary.

Only one node should be Current Focus in MVP.

## 4. Learn inside the node

Conversation is scoped to the active node. AI may answer, cite evidence, update proposed understanding, and suggest newly discovered questions.

New questions must be classified before entering the tree.

## 5. Blocking Question Gate

When AI or user identifies a new question, evaluate:

> Can the current node reach its Definition of Done without resolving this question now?

If no:

- classify as Blocking;
- offer Create Blocking Child;
- parent becomes Blocked after child activation;
- child becomes Active and Current Focus.

If yes:

- do not create a child automatically;
- send it to Frontier or discard it.

## 6. Learning Frontier

Frontier contains relevant questions that are not required for the current node's DoD.

A Frontier item can later be promoted to a root/core node or a child only through an explicit user action or renewed blocking evaluation.

## 7. Convergence Gate

Closing a node is a domain action, not a visual toggle.

Minimum checks:

- required DoD criteria are satisfied;
- required blocking children are resolved;
- sufficient evidence exists for the node's intended depth;
- a concise summary can explain the answer at that depth.

If checks fail, the node remains Active and the UI should show missing conditions.

## 8. Close and return

When a blocking child closes:

- return focus to the blocked parent by default;
- parent becomes Active again if no unresolved blocking children remain.

When a non-blocking/root node closes:

- user may choose the next Open node.

## 9. Resume

After reopening the app, restore:

- active project and pass;
- Current Focus;
- tree state;
- per-node conversations;
- Frontier;
- DoD/evidence/summary.

Resume should not regenerate questions or replay AI actions.

## Open product questions

These should be resolved before M1 is treated as frozen:

1. Can multiple blocking children exist simultaneously, or must they be resolved serially?
2. Is `Blocked` stored as a node state or derived from unresolved blocking children?
3. Can Closed nodes be reopened in MVP?
4. Are DoD criteria boolean only, or can they carry evidence requirements?
5. Does Frontier belong to the project, pass, or source node?
6. When a user manually switches away from an Active node, does it remain Active or become Open/Parked?
7. What is the exact distinction between Parked and Frontier?
