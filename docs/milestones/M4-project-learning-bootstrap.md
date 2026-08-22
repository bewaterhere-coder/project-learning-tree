# M4 — Project Learning Bootstrap

## Goal

When a learner adds a GitHub (or named) project, do not open an empty canvas that waits for manual question authoring. Run a Project Learning Bootstrap so the first visible tree already contains a small, high-value first layer of project-specific Core Questions.

Coco Project Learning Contract defines how to learn. Learning Tree visualizes, persists, and lets the user operate that process. This milestone does not create a competing methodology inside React.

Independent from M2.6 visual hierarchy.

## Product principle

```text
Repository
→ Project Positioning
→ Learning Value Judgment
→ System Model
→ Guided Question Generation
→ Core Questions (default <= 5)
→ Recommended Current Focus
```

Manual question authoring remains supplemental. It is no longer required to start learning.

## Architecture

```text
UI
 ↓
Workspace (createWorkspaceProject, optional bootstrap record in semantic store)
 ↓
Application (bootstrapLearningProject)
 ↓
Framework (versioned Coco Project Learning Contract)    Domain (createProject, addCoreQuestion, addCriterion)
```

- `src/framework` is the methodology source of truth (`coco-project-learning/v1`).
- Framework does not import Domain, React, GitHub, or network APIs.
- Framework output never mutates `DomainSnapshot`. Application dispatches existing Domain operations.
- Domain `createProject` remains an empty pass. Bootstrap is application orchestration.
- UI must not import `src/framework` or restate exploration budgets.

## Exploration budget (v1)

```text
Core Questions       <= 5
Concurrent Focus     <= 2
Branch Depth         <= 3
Core Mechanisms      <= 3
L3 Implementation    <= 1
```

These are scope-control defaults. Domain still enforces `CORE_QUESTION_LIMIT`.

## Question contract

Every generated core question is materialized as a Learning Node with:

```text
Question
Goal
Target Depth (L1 Know / L2 Understand / L3 Implement)
Definition of Done
Status
```

Default depth intent:

- core mechanism: L2
- near-term engineering use: L3 (at most one)
- peripheral: L1

## Persistence

Bootstrap artifacts (`positioning`, `learningValue`, `systemModel`, recommended focus node IDs) are Workspace semantic state on `ProjectWorkspace.bootstrap`, stored next to `DomainSnapshot` in `plt.workspace.semantic.v1`. They are not UI preferences and not Domain lifecycle.

Missing `bootstrap` remains valid so older semantic stores still hydrate.

## Out of scope

```text
GitHub API / README fetch
LLM-authored questions
Eager full knowledge trees
M2.6 visual-hierarchy changes
Accounts / server infrastructure
Enforcing branch-depth in Domain
```

## Acceptance

1. Creating a learning project produces a non-empty first learning layer automatically.
2. That layer is bounded by the Core Question budget.
3. Questions are project-specific and evidence-derived, not a fixed generic checklist copied verbatim.
4. Expanding or focusing one question does not materialize unrelated branches.
5. Blocking vs Frontier classification lives in the framework: only DoD blockers become blocking children.
6. Generated questions include Goal, Target Depth, and Definition of Done. Completion is not “exhaust all subquestions”.
7. Manual core-question authoring still works when slots remain, but is not required to start.
