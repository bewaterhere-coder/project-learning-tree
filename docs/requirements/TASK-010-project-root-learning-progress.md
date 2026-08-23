# TASK-010 — Project Root Learning Progress & Canvas Interaction Stability

```yaml
task_id: TASK-010
title: Project Root Learning Progress & Canvas Interaction Stability

development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: cursor

artifacts:
  requirement: docs/requirements/TASK-010-project-root-learning-progress.md
  plan: docs/plans/TASK-010-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-010-project-root-learning-progress
  pr: 32
```

## 1. Background

The current Learning Tree implementation still conflates project-level semantics with question-node semantics and has an interaction defect where clicking or dragging nodes can cause the canvas/background to visibly flash.

There are three related product problems:

1. creating a new project does not consistently produce one project root plus a set of initial learning-question nodes;
2. a project root should not behave like a question node and should not expose chat actions;
3. node interaction must not cause the canvas/background to flash or remount visually.

These issues should be fixed together because they all depend on clarifying node roles and stabilizing canvas rendering behavior.

## 2. Decision Override / Relation to TASK-009

TASK-009 previously established that a Project should not be represented as a visible graph root node.

TASK-010 intentionally changes that product decision.

For the Learning Tree graph, the project itself is now represented by a dedicated **Project Root Node** that anchors the learning tree.

This is a forward product decision, not a retroactive correction to TASK-009. Do not modify TASK-009 history or acceptance evidence. TASK-010 supersedes only the specific prior rule that prohibited a visible project root node.

The Project Root Node is not a generic container node and must not inherit Question Node behavior by default.

## 3. Product Goal

The graph should communicate the learning model directly:

```text
Project Root
├── Initial Question 1
├── Initial Question 2
├── Initial Question 3
├── Initial Question 4
└── Initial Question N
```

The user should immediately understand:

- what project they are learning;
- what the current overall learning progress is;
- which questions form the initial learning entry points;
- that conversation happens on question nodes, not on the project root.

## 4. Node Type Semantics

The implementation must explicitly distinguish at least these graph roles:

```text
Project Root Node
Question Node
```

Do not rely on visual convention alone. The Plan must identify where this distinction lives in the domain/view model and how behavior is derived from node type.

### 4.1 Project Root Node

The Project Root represents the learning project itself.

Required semantics:

- exactly one Project Root exists for each project learning tree;
- it is the root/anchor of the project's initial graph;
- it does not expose chat;
- it must not display "聊聊这个问题" or an equivalent question-chat affordance;
- it must not be treated as a learning question;
- it may expose project-level information and lightweight project-level actions only when already supported by product semantics;
- selecting/focusing it must not implicitly create or bind a Question conversation.

Required primary content:

- project name;
- learning progress summary.

Recommended compact presentation:

```text
OpenSpec
学习进度 5 / 18 · 28%
```

The exact visual treatment is design-owned, but it must remain compact and clearly different in role from Question Nodes.

Do not turn the Project Root into a large dashboard card.

### 4.2 Question Node

Question Nodes remain the primary learning/conversation objects.

Question Nodes may support:

- chat about this question;
- child-question creation/expansion;
- question completion/progress state;
- question details/notes/learning criteria where already supported;
- contextual actions appropriate to Question semantics.

Project Root behavior must not leak into Question Nodes, and Question-only actions must not leak into Project Root.

## 5. New Project Initialization

Creating a new project must create a valid initial learning tree, not just a project record or a disconnected set of question nodes.

Required invariant:

```text
1 Project Root
+
N initial learning questions
+
root -> initial question edges
```

For any successfully initialized project:

- there is exactly one Project Root Node;
- there is at least one initial Question Node when initial-question generation succeeds;
- each initial Question Node is connected as a child of the Project Root;
- initial Question Nodes are not sibling roots without a parent;
- the Project Root must persist and restore with the project;
- switching projects restores the correct root and its tree;
- archived/restored project behavior must preserve this topology unless an existing migration rule explicitly says otherwise.

The Plan must inspect the current project-creation path and identify why this invariant is not currently guaranteed.

## 6. Initial Question Generation

This task does not require redesigning the learning-framework algorithm itself.

However, the implementation must ensure that whatever current mechanism produces the initial learning questions is wired into the tree topology correctly.

The desired lifecycle is conceptually:

```text
create project
↓
create Project Root Node
↓
resolve/generate initial learning questions
↓
create Question Nodes
↓
connect Project Root -> each initial Question Node
↓
persist one coherent project tree
```

If initial question generation is asynchronous, partial, or recoverable, the Plan must describe the valid intermediate state and how duplicate roots/questions/edges are prevented.

Do not add a second parallel project-init pipeline solely for this task if the current one can be corrected.

## 7. Project Learning Progress

The Project Root must display learning progress derived from the project's Question Nodes.

At minimum the Plan must define:

- numerator: what counts as completed;
- denominator: which Question Nodes count toward total progress;
- whether archived/removed/non-learning nodes count;
- how progress updates when questions are added, completed, reopened, or removed;
- whether percentage is persisted or derived.

Preferred rule:

> project progress is derived from current question state rather than stored as an independently mutable source of truth.

If the existing domain already has an authoritative progress calculation, reuse it.

Do not create duplicate competing progress state.

## 8. Canvas / Background Flashing Bug

There is a visible UI defect where clicking a node and/or dragging a node causes the background/canvas to flash.

This task must diagnose and fix the underlying cause, not mask it with a transition delay.

Required behavior:

- pointer down on a node does not flash the canvas background;
- selecting/focusing a node does not flash the canvas background;
- starting a node drag does not flash the canvas background;
- moving a node does not repeatedly flash/repaint the background in a visually disruptive way;
- ending a drag does not flash the canvas background;
- opening contextual node UI does not remount or theme-toggle the canvas;
- selection styling should update only the minimum relevant surfaces.

Cursor must inspect at least these possible causes before choosing a fix:

- React Flow/container remounts caused by changing keys;
- conditional rendering of the canvas/root container;
- theme/background class changes coupled to focus/selection state;
- transient state that replaces the full node/edge/canvas tree;
- CSS active/focus styles applied to canvas ancestors;
- node drag callbacks triggering semantic workspace reconstruction;
- expensive derived state that changes canvas-level structure on every pointer/drag event;
- persistence writes or reloads incorrectly coupled to interaction state.

The Plan must state the identified cause with evidence before implementation.

Do not solve the issue by disabling node selection or drag.

## 9. Data / Migration Expectations

The Plan must inspect current persisted project/tree data and determine whether existing projects need migration.

Requirements:

- do not silently destroy existing Question Nodes;
- do not create duplicate Project Root Nodes on every load;
- if an existing project has no Project Root, create or derive one through an idempotent migration/normalization path;
- if an existing project already has a valid Project Root under the new schema, preserve it;
- do not reinterpret arbitrary Question Nodes as project roots based only on graph position;
- migration must be deterministic and testable.

If the current data model already has a project-level entity that can map cleanly to a graph root representation, prefer reuse over duplicate semantic state.

## 10. UI Constraints

Keep the Project Root visually lightweight.

Required visual hierarchy:

```text
Project Root = project identity + overall progress
Question Node = learning content + question actions
```

Avoid adding unnecessary controls to the Project Root.

Specifically out of scope unless already required elsewhere:

- chat button on Project Root;
- large project detail panel inside the node;
- "Start Learning" workflow state;
- duplicate project navigation controls;
- project dashboard metrics unrelated to learning progress;
- new analytics system.

## 11. Planning Requirements

Before implementation, Cursor must inspect the current repository and produce `docs/plans/TASK-010-plan.md`.

The Plan must include:

1. current project-creation flow;
2. current node/domain type model;
3. current initial-question creation flow;
4. current graph edge/topology construction;
5. current persistence/restore behavior;
6. current project progress source(s), if any;
7. root-node migration strategy for existing data;
8. background-flash reproduction path and root-cause evidence;
9. files/modules expected to change;
10. test plan;
11. risks and compatibility impact;
12. explicit confirmation that TASK-009's no-project-root rule is superseded only for this task's forward behavior.

The Plan should prefer the smallest coherent domain change that establishes explicit Project Root vs Question Node semantics.

## 12. Acceptance Criteria

### A. New project topology

- [ ] Creating a new project produces exactly one Project Root Node.
- [ ] Initial generated learning questions are represented as Question Nodes.
- [ ] Every initial Question Node is connected to the Project Root.
- [ ] New-project initialization does not produce multiple disconnected root-level question nodes.
- [ ] Reloading the project preserves the same topology without duplicate roots or edges.

### B. Project Root behavior

- [ ] Project Root displays project identity/name.
- [ ] Project Root displays derived learning progress.
- [ ] Project Root has no chat affordance.
- [ ] Opening/selecting Project Root does not create or bind a Question chat.
- [ ] Question-only controls do not appear on Project Root.

### C. Question behavior

- [ ] Question Nodes retain their current supported chat interaction.
- [ ] Question Nodes can remain parents of child questions.
- [ ] Existing question detail/progress semantics are not accidentally replaced by project-level semantics.

### D. Progress

- [ ] Project progress is calculated from authoritative Question state.
- [ ] Completing/reopening a Question updates Project Root progress correctly.
- [ ] Adding/removing valid Question Nodes updates the denominator according to the documented rule.
- [ ] No duplicate mutable project-progress state is introduced without explicit justification.

### E. Existing-project compatibility

- [ ] Existing projects without a Project Root are normalized/migrated idempotently.
- [ ] Existing question content is preserved.
- [ ] Repeated load/migration cannot create duplicate Project Root Nodes.

### F. Interaction stability

- [ ] Clicking a node does not cause canvas/background flashing.
- [ ] Selecting/focusing a node does not cause canvas/background flashing.
- [ ] Drag start, drag movement, and drag end do not cause canvas/background flashing.
- [ ] The fix preserves node selection and dragging behavior.
- [ ] Root cause is documented in the Plan and covered by an appropriate regression test where feasible.

### G. Verification

- [ ] Relevant unit/domain tests pass.
- [ ] Relevant component/integration tests pass.
- [ ] Playwright/E2E coverage verifies new-project topology and Project Root behavior where the existing test architecture supports it.
- [ ] A headed/manual acceptance path is documented for visually confirming the background-flash fix.

## 13. Out of Scope

TASK-010 does not authorize:

- replacing React Flow;
- redesigning the whole Learning Tree UI;
- changing the AI learning-framework question-generation strategy beyond what is necessary to wire initial questions into the correct root topology;
- adding chat to Project Root;
- adding a project dashboard;
- broad persistence rewrites unrelated to the topology/migration need;
- implementing before Plan approval.

## 14. Development Gate

Current gate: **Requirement Ready → Planning**.

Cursor is authorized to:

- inspect the repository;
- reproduce/diagnose the flashing defect;
- write/update `docs/plans/TASK-010-plan.md`;
- update this Task artifact to Plan Ready / plan review state when the Plan is complete;
- commit and push planning artifacts to the existing TASK-010 branch / PR.

Cursor is **not** authorized to implement production code yet.

Implementation begins only after ChatGPT reviews and approves the Plan.
