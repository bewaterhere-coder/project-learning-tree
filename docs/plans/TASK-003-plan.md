---
task_id: TASK-003
title: Project Root, Editable Metadata, and Hierarchical Tree Initialization
status: plan_review
requirement: ../requirements/TASK-003-project-root-editable-metadata-tree-init.md
---

# TASK-003 Plan — Project Root, Editable Metadata, Hierarchical Tree Init

This is the canonical implementation plan for TASK-003. It records code evidence for the requirement’s planning surface and the smallest change that satisfies the acceptance criteria.

**Gate:** `plan_review` — awaiting ChatGPT Plan review (`plan_approved=true`).

Implementation of product code is forbidden until that gate is recorded after Plan review. Writing this file is not Done for the task.

## Goal

Make `Add Project` produce a usable hierarchical learning tree:

```text
Project (container)
└── Project Root Node          ← sole pass root; question mirrors project.name
    ├── Core Question 1
    ├── …
    └── Core Question ≤5
```

Preserve:

- `DomainSnapshot` as semantic source of truth
- one-parent / many-children tree (no multi-parent)
- XYFlow as derived view; TASK-001 dynamic edge routing
- drag → `WorkspaceLayout.nodePositions` only
- Coco / framework adapter as question generator (no new LLM work)
- explicit semantic writes (no broad workspace-change autosave)
- existing evidence fallback behavior

## Current-state findings

```text
UI ProjectSidebar
  → App.createWorkspaceProject
  → workspace/session.createWorkspaceProject
  → application/bootstrap.bootstrapLearningProject
       → domain.createProject          (empty roots)
       → framework evidence + questions
       → domain.addCoreQuestion × N    (each becomes a pass root)
  → selectTreeViewModel → toReactFlow → TreeCanvas
```

### 1. Domain hierarchy / root semantics

| Type | Path | Hierarchy today |
| --- | --- | --- |
| `LearningProject` | [`src/domain/types.ts`](../../src/domain/types.ts) | `id`, `name`, `source?`, `passIds` — **no** `description`, **no** root pointer |
| `LearningPass` | same | `rootNodeIds: NodeId[]` — flat list of first-layer roots |
| `LearningNode` | same | `parentId?`, `childIds`, `blockingChildIds`; display text is **`question`** (no `title` field) |

Evidence:

- [`createProject`](../../src/domain/operations.ts) leaves `rootNodeIds: []` and `nodes: {}`.
- [`addCoreQuestion`](../../src/domain/operations.ts) appends a new node with **no** `parentId` to `rootNodeIds`, capped by `CORE_QUESTION_LIMIT` against **`rootNodeIds.length`**.
- [`createChild`](../../src/domain/operations.ts) / [`createBlockingChild`](../../src/domain/operations.ts) already implement the required parent→child attachment.
- [`promoteFrontierItem`](../../src/domain/operations.ts) with `placement.kind === "root"` still appends another pass root.
- [`completePass`](../../src/domain/operations.ts) requires every id in `rootNodeIds` to be `closed`.
- Active-stack integrity ([`src/domain/stack.ts`](../../src/domain/stack.ts)) already assumes paths start at a pass root.

There is **no** Project Root Node concept. Bootstrap tests assert flat roots (`parentId` undefined) in [`tests/application/bootstrap.test.ts`](../../tests/application/bootstrap.test.ts).

### 2. Metadata editing

| Surface | Editable today? |
| --- | --- |
| Project create form ([`ProjectSidebar`](../../src/ui/sidebar/ProjectSidebar.tsx)) | name / source / description at create only |
| Project after create | **No** rename / edit source / edit description |
| Node text | Inspector is read-only; domain only has [`setNodeSummary`](../../src/domain/operations.ts) for summary |
| Create-time `description` | Passed as `EvidenceInput` hint into framework only; **not** stored on `LearningProject` |

No `updateProject*` domain op, no Edit Project UI, no UiCommand for metadata.

Requirement wording `projectRootNode.title` maps to domain field **`LearningNode.question`**.

### 3. Bootstrap / initialization

[`bootstrapLearningProject`](../../src/application/bootstrap.ts):

1. `createProject({ name, source })`
2. load evidence (GitHub provider or fallback)
3. `runProjectLearningBootstrap` → slice to `min(EXPLORATION_BUDGET.coreQuestions, CORE_QUESTION_LIMIT)`
4. loop `addCoreQuestion` (+ criteria)

Result: N sibling roots, **no edges**, horizontal multi-root layout via [`computeLayout`](../../src/ui/tree/layout.ts) (`ROOT_GAP` between roots).

[`isEmptyFirstLayer`](../../src/application/bootstrap.ts) = `rootNodeIds.length === 0`.  
[`selectCoreQuestionAuthoring`](../../src/application/selectors/core-question-authoring.ts) remaining slots = `CORE_QUESTION_LIMIT - rootNodeIds.length`.

Default name from GitHub URL is **not** implemented: create UI requires a typed name; [`parseGitHubSource`](../../src/framework/evidence.ts) exists but is unused for name fill.

### 4. Semantic persistence

- Key / version: `plt.workspace.semantic.v1` / `SEMANTIC_VERSION = 1` ([`defaults.ts`](../../src/workspace/defaults.ts), [`semantic.ts`](../../src/workspace/persistence/semantic.ts)).
- Stores project snapshots (including `parentId` / `childIds` / `rootNodeIds`) + bootstrap records. Layout lives in preferences (`plt.workspace.layout.v2`).
- Wrong version → empty workspace. Same version: light structural parse, **no** hierarchy migration.
- Explicit semantic writes on create/select/archive/domain success; drag is `semantic: false`.

### 5. XYFlow edges and layout

Already sufficient **once** Core Questions are semantic children of one root:

- [`selectTreeViewModel`](../../src/application/selectors/tree-view-model.ts) walks `rootNodeIds` and emits edges from `childIds`.
- [`computeLayout`](../../src/ui/tree/layout.ts) places layer 0 at `y=0`, children below (`VERTICAL_GAP`).
- [`toReactFlow`](../../src/ui/tree/to-react-flow.ts) + TASK-001 [`edge-routing.ts`](../../src/ui/tree/edge-routing.ts) derive handles from live geometry.
- [`defaultProjectLayout`](../../src/workspace/defaults.ts) starts with **empty** `nodePositions`, so new trees auto-layout.
- Drag → [`applyNodeDragStop`](../../src/workspace/session.ts) layout only.

No new layout engine or manual edge authoring is required.

### 6. UI gaps

- No Edit Project flow in sidebar menus.
- No visual distinction required beyond hierarchy (TASK-002 owns redesign).
- E2E [`project-bootstrap.spec.ts`](../../e2e/specs/project-bootstrap.spec.ts) asserts ≤5 nodes and no empty state; it does **not** assert a Project Root or edges.

## Design decisions

### A. Project Root is a real LearningNode; sole pass root

Reuse the existing relationship model:

```text
pass.rootNodeIds = [projectRootNodeId]
projectRoot.childIds = [Q1, Q2, …]
Qi.parentId = projectRootNodeId
```

Add an explicit pointer on the pass (not a second graph):

```ts
// LearningPass
projectRootNodeId?: NodeId; // new projects always set; must be ∈ rootNodeIds
```

Why a field (not “the only root” convention alone):

- stable rename target;
- migration marker for legacy flat stores;
- distinguishes “empty project with structural root” from “no tree yet” during transition.

Do **not** add multi-parent semantics. Do **not** store hierarchy in XYFlow.

**Title field:** keep using `LearningNode.question` as the Project Root display title. Sync rule:

```text
project.name === projectRoot.question
```

### B. Domain operations

| Op | Behavior |
| --- | --- |
| `createProject` | Unchanged empty pass (M4 invariant: bootstrap orchestrates) |
| **`ensureProjectRoot`** (new) | If `projectRootNodeId` missing: create open LearningNode with `question = project.name`, stable goal (e.g. “Orient learning for this project”), empty DoD; set `rootNodeIds = [id]`, `projectRootNodeId = id`. If present, no-op / idempotent |
| **`addCoreQuestion`** (change) | Require project root (callers ensure it, or op fails `ProjectRootRequired`). Create child under root via `attachChild` (**not** a new pass root). Emit `CoreQuestionAdded`. Enforce `CORE_QUESTION_LIMIT` against **`projectRoot.childIds.length`** |
| **`updateProjectMetadata`** (new) | Update `name` / `source` / `description` on `LearningProject`. On name change: also set `nodes[projectRootNodeId].question = name`. Never delete nodes, never re-run bootstrap, never rewrite parent/child |
| `createChild` / blocking / frontier promote-as-child | Unchanged |
| Frontier `placement.kind === "root"` | **Retarget:** promote under Project Root as a non-blocking child when `projectRootNodeId` is set; only append a new pass root if no project root exists (legacy). Do not silently create a second pass root on new projects |

Events: add `ProjectMetadataUpdated` (and optionally `ProjectRootEnsured`) if useful for tests; keep `CoreQuestionAdded`.

### C. `LearningProject.description`

Add optional `description?: string` on `LearningProject`.

- Create: persist create-form description onto the project (still also passed as evidence hint).
- Edit: metadata-only; does not re-bootstrap.
- Semantic parse: accept optional string; older snapshots without it remain valid.

### D. Bootstrap orchestration

[`bootstrapLearningProject`](../../src/application/bootstrap.ts) becomes:

```text
createProject
→ ensureProjectRoot
→ load evidence / runProjectLearningBootstrap (unchanged)
→ for each generated question: addCoreQuestion (+ criteria)  // children of root
→ recommendedFocusNodeIds still map to Core Question node ids (not the Project Root)
```

Fallback evidence path unchanged: project + root + fallback questions still succeed.

Name resolution (acceptance A):

1. If input `name` is non-blank after trim → use it.
2. Else if `parseGitHubSource(source)` → use `repo` (e.g. `OpenSpec` from the OpenSpec URL).
3. Else fail `ProjectNameRequired` as today.

UI: allow Create with source-only when the URL/owner-repo parses; prefill/derive name accordingly. Keep manual name override.

### E. Empty first layer & authoring selectors

| Helper | New meaning |
| --- | --- |
| `isEmptyFirstLayer` | no project root **or** project root has `childIds.length === 0` |
| `selectCoreQuestionAuthoring` | `remaining = CORE_QUESTION_LIMIT - projectRoot.childIds.length` (0 if no root) |

Empty-project UI ([`App.tsx`](../../src/ui/App.tsx) + `CoreQuestionForm`) still offers supplemental core questions; each goes under the Project Root.

### F. Pass completion vs Project Root

With a single structural root, today’s `completePass` (“all roots closed”) would force closing the Project Root. Convergence does **not** require non-blocking children closed, so a Project Root with empty DoD could close while Core Questions remain open — wrong product outcome.

**Decision for this task:**

- Keep Project Root as a normal LearningNode (focusable, chat-capable).
- Change [`completePass`](../../src/domain/operations.ts): when `projectRootNodeId` is set, require every **direct child** of the Project Root to be `closed` (and active stack empty). Do **not** require the Project Root itself to be closed.
- Legacy snapshots without `projectRootNodeId` keep the old “all `rootNodeIds` closed” rule.

Closing individual Core Questions / descendants stays unchanged. No requirement to invent special non-closable lifecycle for the root in this task.

### G. Edit Project flow (application + workspace + UI)

Application/workspace:

```text
updateWorkspaceProjectMetadata(workspace, { name, source?, description? })
  → domain.updateProjectMetadata on selected (or targeted) project snapshot
  → preserve projectId, projectRootNodeId, descendants, conversations, layout
  → clear lastError; caller commits with semantic: true
```

UI ([`ProjectSidebar`](../../src/ui/sidebar/ProjectSidebar.tsx)):

- Per-project menu: **Edit project**
- Form fields: name, source, description (reuse create field chrome / i18n keys + edit-specific strings)
- Save → metadata update + semantic persistence
- Cancel / Escape dismisses without mutation

No implicit repository re-analysis.

### H. Hierarchical layout

No new algorithm. After semantic children exist:

- auto-layout places Root at layer 0 and Core Questions at layer 1;
- edges Root→Qi appear via existing selectors;
- TASK-001 routing kept;
- new projects keep empty `nodePositions` so auto-layout applies;
- drag still writes preferences only.

Optional tiny UI cue (non-blocking): `data-project-root="true"` on the root LearningNode for tests / mild styling — not a TASK-002 redesign.

### I. Migration / backward compatibility

Keep `SEMANTIC_VERSION = 1`. Migrate **inside** snapshot hydrate (application or semantic parse helper), not via a version bump wipe.

For each stored project snapshot missing a usable `projectRootNodeId`:

| Case | Action |
| --- | --- |
| `rootNodeIds.length === 0` | Leave empty; next bootstrap/ensure can create root |
| One or more flat roots | `ensure`-style wrap: create Project Root (`question = project.name`), reparent each former root as a non-blocking child (preserve their node ids, criteria, evidence, conversations), set `rootNodeIds = [newRoot]`, set `projectRootNodeId` |
| Already has `projectRootNodeId` ∈ `rootNodeIds` | No structural change; ensure `description` optional field tolerance |

Layout after migration: **clear that project’s `nodePositions`** when reparenting occurred so hierarchical auto-layout applies (old flat coordinates would otherwise pin a misleading row). Viewport/chrome preferences stay.

Demo fixtures ([`src/fixtures/demo-tree.ts`](../../src/fixtures/demo-tree.ts)) and domain tests that call `addCoreQuestion` on an empty pass must `ensureProjectRoot` first (or use a shared fixture helper).

### J. Persistence boundary (unchanged contract)

Semantic: project metadata (incl. description), `projectRootNodeId`, hierarchy, learning nodes/state, bootstrap record.

Preferences: x/y, viewport, chrome, theme, locale.

Metadata edits and bootstrap create → explicit semantic save. Drag → layout only.

## Layering

| Layer | Change |
| --- | --- |
| Domain | `projectRootNodeId`; `description?`; `ensureProjectRoot`; `addCoreQuestion` under root; `updateProjectMetadata`; `completePass` child-closed rule; frontier root placement retarget |
| Application | bootstrap order; `isEmptyFirstLayer` / core-question selector; optional hydrate migration helper; metadata use case |
| Framework | none required (optional: export/reuse `parseGitHubSource` for UI name derive via application) |
| Workspace | `updateWorkspaceProjectMetadata`; semantic parse accepts new fields; migrate-on-load; select new project on create (already true) |
| UI | create name-from-URL; Edit Project; testids for root/edges; i18n |
| Infrastructure | unchanged evidence provider |

## Implementation order (after `plan_approved=true`)

1. **Domain types + ops** — `description`, `projectRootNodeId`, `ensureProjectRoot`, rewrite `addCoreQuestion`, `updateProjectMetadata`, `completePass`, frontier root retarget; domain unit tests.
2. **Application bootstrap + selectors** — root-first bootstrap; empty/authoring selectors; name derivation helper.
3. **Migration + semantic parse** — hydrate wrap for legacy flat roots; clear positions when reparented.
4. **Workspace metadata update** — session helper + semantic commit path from App.
5. **UI** — create name-from-source; Edit Project; root testid; e2e OpenSpec-style flow.
6. **Fixture / test updates** — demo-tree, bootstrap, project-authoring, persistence, e2e.

## Tests to add / update after approval

### Domain / Application

- Bootstrap creates exactly one Project Root; `rootNodeIds.length === 1`; Core Questions are its children; count ≤ limit; recommended focus points at children.
- `addCoreQuestion` does not grow `rootNodeIds`; enforces limit on root `childIds`.
- Rename via `updateProjectMetadata` updates `project.name` and root `question`; root id and descendant ids/relations unchanged.
- Edit source/description does not change node set / parent-child / bootstrap questions.
- Hierarchy round-trips through clone/serialize helpers.
- `completePass` with project root: blocked while a Core Question child is open; succeeds when all direct children closed even if root stays open.
- Migration: flat multi-root snapshot → one root + former roots as children; ids preserved.

### Workspace / Persistence

- `createWorkspaceProject` selects the new project (existing) and persists hierarchy.
- Metadata edit triggers semantic save; layout preferences untouched except migration position clear.
- Node drag does not rewrite parent/child (existing layout-only tests stay green).

### UI / E2E

```text
Add Project → paste https://github.com/Fission-AI/OpenSpec → Create
```

Assert: default name `OpenSpec` (from URL/metadata path), one project-root node, ≤5 children, visible edges, hierarchical y positions (root above children).

```text
Edit Project → rename → Save → reload
```

Assert: sidebar + root title sync; children still connected; ids stable.

Update [`tests/application/bootstrap.test.ts`](../../tests/application/bootstrap.test.ts) (today asserts flat roots), [`tests/domain/project-authoring.test.ts`](../../tests/domain/project-authoring.test.ts), [`e2e/specs/project-bootstrap.spec.ts`](../../e2e/specs/project-bootstrap.spec.ts), demo fixtures.

**Regression (must stay green):** child-authoring, blocking-children, frontier-and-parking, semantic-persistence, persistence-boundary e2e, multi-project, edge-routing, learning-loop, import-boundary.

## Non-goals

- New LLM provider / RAG / full repo indexing
- Conversation redesign
- Manual edge authoring / multi-parent graphs
- TASK-002 visual redesign
- Implicit re-bootstrap when source/description change
- Changing Coco contract methodology constants (Domain `CORE_QUESTION_LIMIT` remains the operational cap)

## Planning gate

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Canonical plan written | this file |
| Plan approved | false — awaiting ChatGPT review |
| Implementation | blocked until `plan_approved=true` |
| Next expected actor | chatgpt (Plan review) |

## Blocking questions for ChatGPT review

1. **`completePass` rule** — Approve “all Project Root **children** closed” (recommended) vs requiring the Project Root node itself closed vs requiring all descendants closed?
2. **Frontier `placement: root`** — Approve retarget-under-Project-Root (recommended) vs keeping a true second pass root for promoted frontier items?
3. **Migration position clear** — Approve clearing `nodePositions` for reparented legacy projects (recommended) vs leaving flat coordinates?
4. **Project Root goal / DoD** — Accept a fixed orientation goal + empty DoD for the structural root, or require a specific criterion set in this task?
