---
task_id: TASK-003
title: Project Root, Editable Metadata, and Hierarchical Tree Initialization
repository: bewaterhere-coder/project-learning-tree
task_ref: task/TASK-003-project-root-editable-metadata-tree-init
integration_ref: main
pr:
  number: 20
  head_ref: task/TASK-003-project-root-editable-metadata-tree-init
  base_ref: main
  state: draft
development:
  stage: plan_review
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    merge_verified: false
  next_expected_actor: chatgpt
artifacts:
  plan: ../plans/TASK-003-plan.md
---

# TASK-003 — Project Root, Editable Metadata, and Hierarchical Tree Initialization

## Goal

Make `Add Project` mean “start learning this project”. Adding a GitHub repository such as `https://github.com/Fission-AI/OpenSpec` must immediately create a usable learning tree, not an empty workspace and not a flat row of unrelated first-layer nodes.

Target result:

```text
OpenSpec                  ← Project Root Node
├── Q1                    ← generated Core Question
├── Q2
├── Q3
├── Q4
└── Q5
```

Project metadata must remain editable after creation.

## Current problem

Current bootstrap already creates a Project and generates bounded Core Questions, but the generated questions are first-layer roots. There is no explicit Project Root Node above them. The product therefore cannot express the intended hierarchy `Project → Root Node → generated learning questions`.

Project metadata is also effectively immutable from the product UI after creation. In addition, the visual tree must derive connected edges from semantic parent/child relationships instead of presenting unrelated nodes as a flat layout.

## Expected behavior

### 1. GitHub URL creates a complete initial learning tree

Given:

```text
https://github.com/Fission-AI/OpenSpec
```

The product should:

1. parse repository identity;
2. infer default project name `OpenSpec` when possible;
3. create the Project container;
4. create exactly one Project Root Node representing the project;
5. reuse the existing Project Learning Bootstrap / Repository Evidence / framework adapter to generate the initial Core Questions;
6. create up to the existing configured Core Question budget (normally 5);
7. attach every generated Core Question as a child of the Project Root Node;
8. expose real semantic parent/child relationships;
9. derive visible XYFlow edges from those relationships;
10. apply hierarchical tree layout;
11. select and display the newly created project.

Repository evidence failure must keep the existing fallback behavior: project creation still succeeds with fallback questions/status.

### 2. Project container and Project Root Node are distinct

Do not model this as:

```text
Project + Q1/Q2/Q3/Q4/Q5 all in rootNodeIds
```

Model the learning tree semantically as:

```text
Project
└── projectRootNodeId
    ├── Q1
    ├── Q2
    ├── Q3
    ├── Q4
    └── Q5
```

The Project is the workspace/container. The Project Root Node is a real LearningNode with stable identity.

### 3. Hierarchy must live in Domain semantics

Tree structure cannot be a UI-only coordinate trick.

The canonical Domain state must preserve a stable one-parent/many-children hierarchy using the project’s existing node relationship model where possible. Do not add multi-parent semantics.

Required invariants:

- reload preserves hierarchy;
- persistence preserves hierarchy;
- node dragging changes layout only, never parent/child semantics;
- UI edges can be regenerated from Domain state;
- future AI-created questions can attach to the correct parent;
- one node may have multiple outgoing child edges.

### 4. Visible connected tree

For the initial bootstrap the UI must render connections equivalent to:

```text
Root -> Q1
Root -> Q2
Root -> Q3
Root -> Q4
Root -> Q5
```

Subsequent child generation must continue the hierarchy, e.g. `Q1 -> Q1.1`, `Q1 -> Q1.2`.

Reuse the current dynamic edge routing from TASK-001. Do not introduce manual edge authoring.

### 5. Hierarchical layout

Initial layout must visibly communicate levels:

- Layer 0: Project Root Node
- Layer 1: initial Core Questions
- Layer 2+: descendants

Requirements:

- avoid node overlap;
- preserve semantic hierarchy independently from x/y positions;
- auto-layout newly initialized trees;
- existing saved manual positions should not become the semantic source of truth;
- do not regress the rule that node drag writes layout/preferences rather than semantic state.

### 6. Project metadata is editable after creation

Provide a clear Edit Project flow for at least:

- `name`
- `source` / repository URL
- `description`

Saving edits must preserve:

- Project ID;
- Project Root Node ID;
- descendant node IDs;
- parent/child relationships;
- learning state and criteria;
- conversation state;
- node layout positions;
- progress/history.

### 7. Project rename synchronizes root title

By default the Project Root Node represents the project itself, therefore:

```text
project.name === projectRootNode.title
```

Renaming `OpenSpec` to `OpenSpec Study` must update both the sidebar/project metadata and the existing root node title without deleting/recreating the root or descendants.

### 8. Editing source/description must not implicitly re-bootstrap

Changing `source` or `description` updates metadata only. It must not automatically:

- delete nodes;
- regenerate the first layer;
- reset progress;
- replace existing learning content.

A future explicit “re-analyze/re-bootstrap repository” action may be designed separately; it is out of scope here.

## Persistence boundary

Semantic persistence includes:

- Project metadata;
- Project Root Node identity;
- node hierarchy / parent-child relationships;
- learning nodes and learning state.

Layout/preferences remain separate:

- node x/y;
- viewport;
- sidebar/inspector/chat geometry;
- theme;
- locale.

Do not reintroduce broad `workspace`-change semantic autosave. Semantic writes should remain explicit for semantic mutations such as project creation and metadata edits.

## Architecture boundary

Preserve the existing layers:

```text
framework      -> decides generated learning questions
Domain         -> Project Root / hierarchy semantics and invariants
application    -> bootstrap + metadata-edit use cases
workspace      -> multi-project coordination and persistence
ui             -> Add/Edit Project, edge rendering, hierarchical layout
infrastructure -> repository evidence provider
```

Do not move learning rules into React components. Do not make XYFlow node/edge state the semantic source of truth.

## Acceptance criteria

### A. Add OpenSpec

User creates a project from:

```text
https://github.com/Fission-AI/OpenSpec
```

Pass when:

- project name defaults to `OpenSpec` when repository metadata is available;
- exactly one Project Root Node is visible;
- up to 5 bootstrap Core Questions are generated under it according to the existing exploration budget;
- generated questions are semantic children of the root;
- visible edges connect root to each generated question;
- the canvas displays hierarchical/tree layout rather than a flat row of unrelated roots.

### B. Rename project

Rename `OpenSpec` → `OpenSpec Study`.

Pass when:

- sidebar/project title updates;
- Project Root Node title updates;
- root node ID is unchanged;
- descendant IDs and relationships are unchanged;
- learning state and positions are retained.

### C. Edit description/source

Pass when metadata persists and the existing tree is not regenerated or reset.

### D. Reload

After reload, Project metadata, Project Root Node, generated questions, hierarchy and rendered edges are restored correctly.

### E. Descendant growth

When a later workflow creates children under Q1, they attach semantically to Q1 and render as the next tree level without disturbing unrelated branches.

## Required tests

At minimum cover:

### Domain/Application

- bootstrap creates exactly one Project Root Node;
- generated Core Questions are children of that root;
- bootstrap still respects current exploration/Core Question limits;
- rename preserves root ID and descendant relationships;
- rename updates root title;
- editing description/source preserves the learning tree;
- hierarchy survives semantic serialization/hydration.

### Workspace/Persistence

- `createWorkspaceProject` selects the new project;
- metadata edits trigger semantic persistence;
- node drag/layout changes do not mutate hierarchy or force semantic relationship rewrites.

### UI/E2E

Run the actual flow:

```text
Add Project
→ paste https://github.com/Fission-AI/OpenSpec
→ Create
```

Assert root + generated children + visible edges + hierarchical positions.

Then:

```text
Edit Project
→ rename
→ Save
→ reload
```

Assert sidebar/root synchronization and persistence with children still connected.

## Non-goals

Do not expand this task into:

- new real LLM provider work;
- full repository indexing or RAG;
- conversation redesign;
- manual edge creation;
- multi-parent graph semantics;
- broad UI redesign (TASK-002 owns visual redesign);
- implicit repository re-bootstrap when metadata changes.

## Cursor Gate

Canonical implementation plan: `docs/plans/TASK-003-plan.md`.

Development stage is `plan_review`. Next expected actor: ChatGPT (Plan review).

Cursor must **not** implement product code until Plan review records `plan_approved=true`. Keep all further work on this same task branch and PR.
