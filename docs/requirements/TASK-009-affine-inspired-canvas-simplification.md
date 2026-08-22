# TASK-009 — AFFiNE-inspired Canvas & Interaction Simplification

```yaml
task_id: TASK-009
title: AFFiNE-inspired Canvas & Interaction Simplification

development:
  stage: acceptance_review
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: chatgpt

artifacts:
  requirement: docs/requirements/TASK-009-affine-inspired-canvas-simplification.md
  plan: docs/plans/TASK-009-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-009-affine-inspired-canvas-simplification
```

## 1. Background

The Learning Tree product has accumulated too much UI and interaction machinery for a conceptually simple product: a spatial learning canvas where question nodes are the primary content objects and AI conversation expands learning.

Recent product revisions already removed or challenged several layers that do not contribute to the core learning loop, including redundant project nodes, explicit "start learning" state, unnecessary navigation actions, and oversized detail-page actions that duplicate what can happen directly on a question node.

The remaining problem is broader: the product is still being designed feature-by-feature rather than from one coherent canvas interaction model. This causes repeated work on node chrome, panel behavior, selection, hover actions, theme treatment, detail surfaces, and information hierarchy.

AFFiNE is a useful reference because its Edgeless model treats the canvas as the primary workspace and lets content objects remain the center of interaction rather than forcing the user through many modal/page/state transitions.

TASK-009 therefore performs an AFFiNE-inspired simplification of the existing Learning Tree UI and interaction architecture.

This is an independent task and PR. Do not reuse TASK-008 or another task branch/PR, even where files overlap.

## 2. Product Goal

The product should feel like a focused AI learning canvas rather than a conventional project-management application.

Target mental model:

```text
Project
└── Learning Canvas
    ├── Question Node
    ├── Question Node
    └── Question Node
```

A Question Node is the primary object. Most learning actions should happen directly from that object or in a contextual side surface bound to it.

The desired interaction principle is:

> Canvas first. Object is content. Actions happen in context.

Do not copy AFFiNE feature-for-feature. Use it as a reference for interaction architecture, spatial hierarchy, object-centric controls, and visual restraint.

## 3. Reference Study Requirement

Before implementation, Cursor must inspect the current official AFFiNE implementation and its editor foundation where relevant.

Primary references:

- `toeverything/AFFiNE`
- BlockSuite / AFFiNE Edgeless implementation used by the current upstream project

Study only what is necessary for this task. Do not attempt to understand or port the entire repository.

At minimum inspect how AFFiNE handles:

1. Edgeless canvas as the dominant workspace;
2. selection and focused-object affordances;
3. contextual / floating object actions;
4. side or contextual panels;
5. block/object visual hierarchy;
6. toolbar density and placement;
7. canvas chrome and background treatment;
8. object vs document/detail boundaries;
9. how editing and direct manipulation avoid unnecessary navigation states;
10. design-token / reusable UI patterns relevant to consistent surfaces.

The Plan must explicitly separate:

- patterns worth adopting;
- patterns that do not fit Learning Tree;
- patterns already supported by React Flow and should therefore not be reimplemented;
- patterns that would require a framework migration and are therefore out of scope.

## 4. No Framework Migration

TASK-009 does **not** authorize replacing React Flow with AFFiNE, BlockSuite, tldraw, or another editor/canvas framework.

The default implementation direction is:

```text
AFFiNE interaction principles
        +
existing Learning Tree domain model
        +
React Flow native capabilities
        ↓
simpler Learning Tree UI
```

A Plan that proposes replacing the canvas framework must be rejected unless it proves that the current stack cannot satisfy a binding requirement. Framework preference alone is not sufficient.

## 5. Target Information Architecture

### 5.1 Project level

The project is context for the learning canvas, not a visible graph node.

Project-level UI may expose:

- project name;
- repository/source;
- short project description;
- archive/delete/restore or other existing project management actions where already supported.

Do not reintroduce a Project Root node into the graph merely to represent project metadata.

### 5.2 Question Node

The Question Node should be the main learning object.

A normal node should prioritize:

- question/title;
- concise supporting text only when useful;
- child-question count;
- completion/progress indicator;
- clear selected state.

Actions should not permanently dominate the node. Prefer contextual/hover/selected affordances for secondary actions.

Expected direct actions include, where supported by current product semantics:

- chat about this question;
- add a child question;
- more/context actions.

Do not add a separate "Start Learning" action or learning-state ceremony. Asking or opening the question is already part of learning.

### 5.3 Contextual Inspector

Selecting a Question Node may expose a compact contextual Inspector.

The question-detail surface should focus on durable learning information, especially:

- completion / definition-of-done criteria;
- notes / learning reflection /心得.

Do not add redundant actions such as:

- "聊聊这个问题" as a large detail-page CTA when chat is already directly available from the node;
- "添加子问题" as a detail-page requirement when it is already a node-context action;
- "返回上一个问题" navigation that duplicates canvas navigation;
- "开始学习" state controls.

The Inspector is supplementary. It must not visually compete with the canvas as the primary workspace.

### 5.4 Chat

Chat should be a contextual panel bound to a Question Node.

Opening Chat should be explicit from the node/context action.

Do not turn question selection itself into an implicit Chat-open action if current interaction contracts already separate focus from chat open.

Chat should visually belong to the selected/bound question without forcing a route/page transition away from the canvas.

## 6. Canvas Interaction Simplification

Cursor must audit the current implementation for custom code that duplicates React Flow capabilities or creates avoidable UI state.

At minimum inspect:

- node selection;
- node hover state;
- drag behavior;
- viewport/pan/zoom;
- handles and edge routing;
- node toolbar/actions;
- resize behavior if present;
- contextual menus;
- focus / keyboard behavior;
- canvas controls;
- selection-to-panel binding;
- derived edge rendering;
- layout-specific UI state.

For every custom mechanism, classify it as:

```text
KEEP        required by Learning Tree semantics
SIMPLIFY    useful but overbuilt
REPLACE     React Flow already provides sufficient behavior
REMOVE      redundant / unused / product concept no longer exists
```

The Plan must include this inventory before implementation.

## 7. Visual Direction

Use AFFiNE as a reference for restraint rather than visual cloning.

Desired qualities:

- canvas has visual priority;
- low-noise application chrome;
- fewer permanently visible controls;
- clear but restrained node selection;
- contextual controls appear close to the selected object;
- panels feel secondary to content;
- consistent radius, border, elevation, spacing, and typography hierarchy;
- edges support hierarchy but do not dominate it;
- large empty surfaces remain calm rather than filled with decorative UI;
- node information density is enough to understand the question without opening another page.

Avoid adding decorative complexity merely to look like AFFiNE.

## 8. Chinese-first UI

When the active locale is Chinese, all product copy that can reasonably be Chinese should render in Chinese.

Do not introduce English-only labels into the redesigned canvas, node actions, Inspector, menus, or settings surfaces.

Technical terms may remain English only where translation would reduce clarity or where the product already treats the term as a proper technical identifier.

## 9. Interaction Rules to Preserve

TASK-009 is a UI/interaction simplification, not a rewrite of learning semantics.

Preserve established domain behavior unless the Requirement explicitly changes it.

In particular:

- parent/child question relationships remain semantic data;
- graph edges remain derived from semantic relationships;
- project edits must not destroy learning state;
- question progress/completion semantics remain intact;
- Chat persistence/binding semantics remain intact unless a UI-only adaptation is necessary;
- UI-only changes must not trigger semantic workspace writes;
- theme/color-scheme preferences remain UI preferences;
- archived/deleted project behavior from prior tasks remains intact.

## 10. Reduce State and Code

A successful implementation should remove complexity, not merely restyle it.

The Plan must identify:

- obsolete UI state;
- redundant components;
- duplicated interaction state;
- dead selectors/styles;
- legacy detail actions;
- unnecessary wrappers around React Flow nodes;
- custom canvas behavior that can be deleted;
- places where a single contextual action can replace multiple persistent controls.

For each proposed deletion, note whether it is:

- visual-only;
- interaction-only;
- state cleanup;
- component deletion;
- CSS deletion;
- test cleanup/update.

Net code reduction is desirable but not an absolute acceptance metric. Architectural simplification is binding.

## 11. React Flow-first Implementation

Prefer documented/native React Flow mechanisms where they satisfy the product requirement.

Examples may include:

- NodeToolbar or equivalent contextual node controls;
- standard selection state;
- standard handles and connection geometry;
- viewport and control primitives;
- derived node/edge rendering;
- documented keyboard/focus patterns.

Do not write a new internal mini-framework around React Flow simply to emulate AFFiNE.

## 12. Responsive Panel Behavior

The Plan must define a simple panel model for:

- no contextual panel;
- Inspector open;
- Chat open;
- transitions between Inspector and Chat;
- small viewport behavior.

Avoid nested right-side surfaces or multiple competing panels for the same node.

If current implementation already supports resizable/pinned behavior that remains useful, preserve it only where it does not reintroduce interaction complexity.

## 13. Accessibility

The simplified interaction must retain practical accessibility:

- visible selected and keyboard focus states;
- controls reachable without precision hover where keyboard access is expected;
- sufficient target sizes for icon actions;
- meaningful labels/tooltips for icon-only actions;
- no color-only encoding for critical completion state;
- no loss of contrast under supported theme recipes.

## 14. Testing Requirements

Update or add automated coverage for at least:

1. question node selection remains deterministic;
2. node direct actions bind to the correct question;
3. Chat opening does not require a separate "start learning" state;
4. Inspector displays the intended compact durable information only;
5. removed/redundant detail actions do not reappear;
6. parent/child semantic relationships and derived edges are preserved;
7. project switching preserves the correct project/node context;
8. UI-only selection/panel/theme interactions do not mutate semantic workspace persistence;
9. Chinese locale renders the new controls in Chinese where applicable;
10. keyboard/focus behavior remains usable;
11. supported Theme Recipes remain visually coherent after the component simplification;
12. existing relevant E2E flows still pass or are intentionally updated to the new interaction model.

## 15. Visual Acceptance Evidence

Use the existing Playwright headed/visual acceptance infrastructure.

Produce screenshots that let ChatGPT review the actual product, including at minimum:

- project with a non-trivial question tree;
- default canvas with no node selected;
- selected Question Node with contextual actions;
- compact Inspector for a selected question;
- Chat open and bound to a question;
- a node with child-count and progress information;
- representative light and dark/theme-recipe states sufficient to prove the redesign did not break TASK-007/008 visual semantics.

The screenshots should be product-scale views, not isolated component demos only.

## 16. Out of Scope

Do not use TASK-009 to:

- migrate away from React Flow;
- import or vendor AFFiNE/BlockSuite as the application framework;
- copy AFFiNE code without license/provenance review;
- add collaborative editing;
- add document/database/slides features;
- add a general-purpose whiteboard;
- redesign the learning domain model;
- redesign AI provider configuration;
- add unrelated new learning states;
- rebuild persistence architecture;
- add new Theme Recipe families;
- merge TASK-008 into this task.

TASK-008 remains an independent task/PR even if TASK-009 touches nearby UI/styles.

## 17. Conflict / Dependency Awareness

TASK-009 is created while TASK-008 may still be active.

Cursor must inspect the current repository and active TASK-008 changes for conflict awareness, but this does **not** authorize task or PR reuse.

The Plan must call out likely overlaps, especially around:

- `src/ui/styles.css`;
- theme semantic tokens;
- node foreground/background styling;
- Inspector/Chat surfaces;
- screenshot fixtures.

Prefer architectural changes that minimize needless conflict, but do not weaken TASK-009 merely to avoid touching the correct files.

## 18. Acceptance Criteria

TASK-009 is acceptable when:

- the canvas is visibly and structurally the primary workspace;
- Question Nodes act as the primary learning objects;
- node information hierarchy is understandable without opening a separate detail page;
- chat and add-child actions are contextual/direct rather than duplicated through large detail-page controls;
- the Inspector is compact and focused on completion criteria and learning notes/心得;
- "Start Learning" and equivalent unnecessary learning-state ceremony are absent;
- redundant navigation/actions identified in this Requirement are absent;
- permanent chrome/control density is reduced;
- selected/hover/contextual actions are clear and restrained;
- React Flow native mechanisms are preferred where sufficient;
- obsolete custom interaction/state/components/styles are removed or simplified;
- no new canvas/editor framework is introduced;
- learning semantics, persistence boundaries, project switching, chat binding, and derived edges remain correct;
- Chinese UI remains Chinese-first;
- existing Theme Recipe behavior remains coherent;
- automated tests pass;
- visual evidence demonstrates the complete interaction rather than isolated styling;
- `npm run typecheck`, `npm test`, `npm run build`, and relevant E2E/visual checks pass.

## 19. Cursor Planning Gate

Cursor must begin in **Plan mode**.

Before implementation:

1. read this Requirement;
2. inspect current Learning Tree UI/interaction architecture and existing project interaction specs;
3. inspect the current official `toeverything/AFFiNE` Edgeless implementation and relevant BlockSuite code/documentation using Minimum Sufficient Context;
4. produce a concise AFFiNE reference matrix: observed pattern → Learning Tree applicability → adopt/reject reason;
5. audit current Learning Tree canvas/UI code and classify custom mechanisms as KEEP / SIMPLIFY / REPLACE / REMOVE;
6. identify all UI state/components/styles that can be deleted or collapsed;
7. define the target Node / Inspector / Chat / canvas interaction model;
8. identify native React Flow primitives that replace current custom behavior;
9. document interaction and code overlap with active TASK-008 without reusing its branch/PR;
10. define migration steps that preserve persisted semantic data and existing project/question/chat state;
11. define automated and visual acceptance evidence;
12. write `docs/plans/TASK-009-plan.md` on this exact branch;
13. update this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt` when the Plan is ready;
14. commit and push Plan + Requirement gate update to this same branch/PR;
15. stop for ChatGPT review.

**Do not implement product code until ChatGPT reviews and approves the Plan.**

Do not create another Task, branch, or PR for this requirement.
