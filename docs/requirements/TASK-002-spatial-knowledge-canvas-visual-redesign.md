---
task_id: TASK-002
title: Spatial Knowledge Canvas Visual Redesign
repository: bewaterhere-coder/project-learning-tree
task_ref: task/TASK-002-spatial-knowledge-canvas-visual-redesign
integration_ref: main
development:
  stage: acceptance
  gates:
    requirement_ready: true
    plan_approved: true
    acceptance_approved: false
    merge_verified: false
  next_expected_actor: chatgpt
artifacts:
  plan: ../plans/TASK-002-plan.md
  pr: https://github.com/bewaterhere-coder/project-learning-tree/pull/19
---

# TASK-002 — Spatial Knowledge Canvas Visual Redesign

## Goal

Redesign the current Learning Tree presentation layer so the product reads as a **Spatial Knowledge Workspace / Learning Knowledge Canvas**, not a React Flow / workflow-diagram application.

The user-provided reference image is a visual-direction reference only. Do not pixel-copy its brand or exact UI. Extract its spatial hierarchy: **Canvas → knowledge regions/clusters → nodes → content → weak relationships/edges**.

The desired first impression is:

> “这是我的学习知识空间。”

not:

> “这是一个 React Flow 做的学习树工具。”

## Existing decisions to preserve

Read first:

- `docs/design/Learning-Tree-UI-Reference-Study.md`
- `docs/product/interaction-spec.md`
- current `src/ui/`
- current TreeCanvas / LearningNode / Workspace Shell / Details / Conversation implementation
- current visual / e2e tests

Do not reopen or break existing accepted decisions:

- Tree Canvas remains Primary.
- Focus and Active Stack remain distinct semantics.
- Details / Chat remain the contextual right-workspace architecture already implemented.
- Domain Engine and semantic hierarchy remain authoritative.
- Persistence boundary remains unchanged.
- Multi-project architecture remains unchanged.
- Localization remains supported.
- Light/dark theme remains supported.
- `workspace.shell.colorScheme` remains theme source of truth.
- Existing Node Conversation / Learning Loop behavior remains intact.
- Existing semantic parent/child links remain authoritative; no arbitrary manual graph model.

This task is primarily a **presentation-layer redesign**.

## Problem statement

Current UI still exhibits several workflow-editor characteristics:

1. Nodes read as standard React Flow cards rather than knowledge objects.
2. Edges/handles are visually too close to a graph editor.
3. Header/sidebar/context panel compete with the canvas.
4. Status is expressed too directly through labels, borders, rails and badges.
5. Populated workspace has insufficient spatial hierarchy.
6. Zoomed-out view does not yet read clearly as a learning map.

The redesign should make the canvas feel like a knowledge landscape while retaining Learning Tree’s domain semantics.

## Required behavior and visual direction

### 1. Canvas-first hierarchy

Visual priority should be:

```text
Canvas
>>>>>>>>>>>>>>>>>>>>>
Header
Sidebar
Contextual workspace
Controls
```

The tree must visibly own the application. Peripheral chrome should recede.

### 2. Learning Node redesign

A canvas node is the compact spatial representation of a knowledge object.

Do not use the default visual grammar of a workflow card such as:

```text
Question
ACTIVE
Blocked 2
```

with equally loud status labels.

Prefer:

- soft neutral paper-like surface;
- subtle or nearly invisible border;
- no persistent heavy shadow;
- question as the dominant text;
- minimal state information;
- contextual affordances only when needed.

#### Node visual levels

Support at least these perceptual levels:

**Primary / Current learning node**
- Current Focus and/or important Active Stack node.
- Slightly larger or stronger hierarchy is acceptable.
- Focus uses selected-blue semantics.
- Active uses learning-teal semantics.
- If Focus + Active coexist, distinguish them without stacking thick border + rail + shadow + badge.

Suggested grammar:
- Focus → subtle blue halo / thin accent.
- Active → small teal indicator or low-intensity surface tint.

**Normal learning node**
- quiet surface;
- question first;
- optional tiny metadata;
- elevation appears mainly on hover.

**Closed / Parked / background node**
- remain visible;
- lower emphasis via opacity, typography and surface treatment;
- do not hide closed nodes by default.

### 3. Node information density

Canvas-node principle:

> Address + Meaning + Minimal State

Prioritize:

1. Question
2. Minimal learning-state indication
3. Blocked indicator only when meaningful
4. Chat affordance

Avoid persistent large lifecycle labels such as OPEN / ACTIVE / PARKED / CLOSED. Prefer semantic treatment through small icons, surfaces or restrained indicators.

### 4. Node Chat affordance

Each node must expose a lightweight chat entry using the current Node Conversation implementation.

Requirements:

- Use a chat icon consistent with the current icon system.
- Prefer hover-revealed placement at a node corner.
- Do not create a large permanent button.
- Clicking the chat affordance opens the conversation for that node.
- It must not interfere with node focus, drag, or edge interaction.

### 5. Edge redesign

Edges should communicate relationship without making the product look like a DAG editor.

Desired edge treatment:

- approximately 1–1.25px visual weight;
- low contrast;
- neutral color;
- smooth curves;
- arrowheads removed visually if direction is not required by product semantics;
- if direction must remain visible, arrowheads must be extremely restrained.

Priority:

```text
Node >>> Edge
```

Selected-node-related edges may become slightly more visible, but all unrelated edges should remain quiet.

### 6. Dynamic edge connection geometry

Nodes may have multiple incoming/outgoing links.

Do not force all links through one fixed side.

Choose logical source/target sides according to relative node position, e.g.:

```text
target to the right  → source.right  / target.left
target to the left   → source.left   / target.right
target below         → source.bottom / target.top
target above         → source.top    / target.bottom
```

Support logical handles on:

- top
- right
- bottom
- left

Handles should be invisible at rest and appear only when required by hover/selection/connection interaction. Do not leave React Flow handle circles permanently visible.

### 7. Knowledge Cluster / Learning Section visual language

The reference demonstrates an important spatial property: knowledge belongs to regions rather than every card floating in an identical plane.

Create or prepare a visual grouping language for major learning branches / sections without introducing a new heavy domain model unless existing structure already provides enough information.

A group may use:

- extremely subtle tinted background;
- no strong enclosing border;
- small title near upper-left;
- generous interior padding;
- low-saturation colors such as soft blue/teal/amber/violet.

It must feel like a **canvas region**, not a Trello column/card.

If safe automatic grouping cannot be derived from current semantic structure without domain changes, document the limitation in the Plan and implement only presentation primitives that do not invent semantics.

### 8. Canvas background

Remove obvious “React Flow demo grid” feeling.

Target a quiet light neutral canvas using the existing token system. The exact token values must work in both light and dark themes.

Background may be:

- no grid; or
- extremely faint dots that disappear perceptually at normal working distance.

The background pattern must never become a visual feature.

### 9. Header

Reduce chrome.

Header should mainly expose:

- project context/title;
- breadcrumb where already required;
- minimal actions.

Avoid strong borders, boxed controls and visually heavy containers.

### 10. Project Sidebar

The sidebar is navigation, not a collection of cards.

Prefer:

- compact rows;
- subtle selected background;
- stronger selected text;
- reduced borders/shadows/padding.

The selected project should not read as a separate bordered card.

### 11. Contextual workspace (Details / Chat)

Preserve the existing contextual-right-workspace architecture.

Visually it should feel like an extension of the knowledge canvas, not an independent admin panel or floating modal.

Prefer:

```text
Canvas | subtle divider | Context
```

Reduce:

- heavy shadow;
- nested boxed sections;
- repeated borders;
- card-inside-card composition.

Use typography, spacing and subtle section separators to establish hierarchy.

### 12. Typography

Improve hierarchy for both Chinese and English.

Guideline ranges (adapt through current tokens rather than hard-coding blindly):

- node question: ~14–16px, medium/semi-bold;
- secondary text: ~11–12px, muted;
- cluster title: ~12–14px, semi-bold;
- header: ~13–14px.

Avoid excessive ALL CAPS, tiny gray labels and badge typography.

### 13. Spatial density

Do not force every branch into an equally spaced spreadsheet-like grid.

The canvas should be able to read as:

- dense knowledge areas;
- open areas;
- branches;
- grouped regions.

Keep structural tree clarity, but make the spatial composition less mechanically uniform where safe within the current layout system.

### 14. Zoom semantic readability

Verify at approximately:

- 25%
- 50%
- 75%
- 100%
- 125%

Expected perception:

**Zoomed out**
- understand overall learning structure;
- recognize major branches/clusters;
- see current learning location;
- full text readability is not required.

**Medium zoom**
- question titles readable;
- Active structure and branch relationships visible.

**Zoomed in**
- node metadata and contextual actions available;
- chat affordance accessible.

If implementation cost is reasonable, use zoom-aware progressive disclosure. Do not introduce a large new state system purely for zoom behavior.

### 15. Interaction-state polish

Verify stable presentation for node states:

- idle
- hover
- focus
- active
- focus + active
- blocked
- parked
- closed
- dragging

Verify edge states:

- idle
- related to selected/focused node
- hover if supported

No layout jumps should occur when contextual actions appear.

## Non-goals / explicit prohibitions

Do not:

- pixel-copy the reference product;
- add a large palette of saturated colors;
- add glassmorphism, neon or decorative gradients;
- turn every surface into a rounded SaaS card;
- add shadows everywhere;
- encode every state as a badge;
- turn Learning Tree into a generic mind-map editor;
- turn Learning Tree into a freeform whiteboard;
- add arbitrary manual edges;
- change Domain Engine to satisfy visual presentation;
- rewrite working Conversation architecture;
- reopen accepted product-design decisions;
- merge this task directly to `main`.

## Suggested implementation order

1. refine design tokens where necessary;
2. keep solid quiet canvas background;
3. redesign LearningNode hierarchy and hover chat affordance;
4. quiet Edge / Handle presentation while preserving TASK-001 routing;
5. recede Header;
6. recede Sidebar;
7. refine Contextual workspace and Chat presentation;
8. evaluate root-derived presentation-only cluster underlays only if the result still reads too much like a workflow diagram;
9. optional zoom-aware progressive disclosure only if justified by headed review;
10. update visual regression evidence/tests.

Avoid a full UI rewrite unless code evidence proves it necessary.

## Approved Plan Review Decisions

Plan review is complete. Implementation is authorized on the same task branch and PR.

1. Use a **solid quiet canvas**; do not reintroduce dots by default.
2. Keep Knowledge Cluster work inside TASK-002, but implement it only if node/edge/chrome quieting still fails the knowledge-landscape visual target.
3. `minZoom=0.4` may remain; use 40% as the practical zoomed-out verification baseline.
4. Preserve the blocking tick but **soften** its visual treatment.

## Acceptance criteria

The task is acceptable when all of the following are true:

1. At first glance the product reads as a learning/knowledge canvas rather than a React Flow demo/editor.
2. Canvas has clearly higher visual priority than header/sidebar/context panel.
3. Nodes read as knowledge objects with question-first hierarchy and restrained status treatment.
4. Focus and Active remain semantically distinguishable without excessive decoration.
5. Closed/Parked nodes remain visible but recede appropriately.
6. Node Chat affordance is available and uses existing conversation behavior without breaking focus/drag.
7. Edges are materially quieter than nodes.
8. Multi-edge nodes route through sensible top/right/bottom/left sides according to relative geometry.
9. Permanent visible React Flow handles are removed or visually suppressed at rest.
10. Canvas background no longer has obvious demo-grid prominence.
11. Sidebar/header/contextual workspace visually recede.
12. Both light and dark themes remain coherent.
13. Chinese and English UI remain readable.
14. Existing semantic model, Domain Engine, persistence and conversation behavior are not regressed.
15. Representative zoom levels remain usable and the zoomed-out view reads as a learning map.
16. Existing automated tests pass or any intentional snapshot updates are explained and reviewed.

## Verification required

Run the repository’s existing relevant checks, including at minimum when available:

```bash
npm test
npm run test:e2e
```

Also run existing visual / Playwright verification and headed review workflow if defined by the repository.

Visual evidence should cover at least:

- light theme;
- dark theme;
- populated workspace;
- sufficiently large tree;
- focused node;
- active node;
- blocked node;
- closed node;
- Node Chat opened;
- node with multiple incoming/outgoing edges;
- node drag;
- zoomed-out overview;
- zoomed-in node interaction.

## Cursor Gate

Plan review approved (`plan_approved=true`). Implementation completed on
`task/TASK-002-spatial-knowledge-canvas-visual-redesign` / PR #19.

**Acceptance handoff:** `development.stage: acceptance`, `next_expected_actor: chatgpt`,
`acceptance_approved: false`. Please run **ChatGPT Acceptance Review TASK-002**.
Do not self-approve acceptance. Do not merge PR #19 until acceptance is recorded.