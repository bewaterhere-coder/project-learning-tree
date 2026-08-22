---
task_id: TASK-003
title: Project Root, Editable Metadata, and Hierarchical Tree Initialization
status: implementation
requirement: ../requirements/TASK-003-project-root-editable-metadata-tree-init.md
---

# TASK-003 Plan — Project Root, Editable Metadata, Hierarchical Tree Init

This is the canonical implementation plan for TASK-003. It records code evidence for the requirement’s planning surface and the smallest change that satisfies the acceptance criteria.

**Gate:** `implementation` — Plan approved (`plan_approved=true`). Product implementation in progress on this branch.

## Review revisions (PR review 5000617595)

Three blocking findings addressed in this revision:

1. **Project Root / Active Stack** — Defined as ordinary sole-root parent semantics. Activating a Core Question puts `[projectRoot, Qi]` on the Active Stack. Sibling switch, park, and close follow existing domain rules. Narrow close rule for the Project Root only (all direct children closed) so unchanged `completePass` stays meaningful. Concrete Given/When/Then tests listed below.

2. **Scope discipline** — **Out of TASK-003:** changing `completePass` semantics; retargeting Frontier `placement.kind === "root"`. Those public contracts stay as today. Only hierarchy/init/metadata/migration work that the Requirement demands remains in scope (plus the narrow Project Root close guard required by sole-root + existing `completePass`).

3. **Migration** — Deterministic Project Root ID; semantic migration is idempotent and persists the migrated snapshot; preference reconciliation is a **separate** workspace/preferences step (semantic parse must not mutate layout).

Also added the requested regression matrix: activate under Project Root, Q1→Q2 switch, close/park with Project Root, legacy migration → reload → stable Root ID.

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
- existing `completePass` and Frontier `placement: root` contracts

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
- [`promoteFrontierItem`](../../src/domain/operations.ts) with `placement.kind === "root"` still appends another pass root — **leave this contract unchanged** in TASK-003.
- [`completePass`](../../src/domain/operations.ts) requires every id in `rootNodeIds` to be `closed` and `activeStack` empty — **leave this contract unchanged** in TASK-003.
- Active-stack integrity ([`src/domain/stack.ts`](../../src/domain/stack.ts)): `activateNode` uses `pathFromRoot` → full ancestor chain; every stack member must be `active` (bijection).

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
- Default ids from [`defaultPorts`](../../src/domain/ports.ts) are time/random — **unsafe** for migrate-on-every-hydrate without persistence.

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

Add an explicit pointer on the pass:

```ts
// LearningPass
projectRootNodeId?: NodeId; // new projects always set; must be ∈ rootNodeIds
```

Why a field (not “the only root” convention alone):

- stable rename target;
- migration marker for legacy flat stores;
- distinguishes structural root from additional roots if Frontier promote-as-root still creates them (existing contract, out of scope to redefine).

Do **not** add multi-parent semantics. Do **not** store hierarchy in XYFlow.

**Title field:** keep using `LearningNode.question` as the Project Root display title. Sync rule:

```text
project.name === projectRoot.question
```

### B. Active Stack / lifecycle invariant (Project Root)

Project Root is a **normal sole pass root**, not a parallel lifecycle type.

Evidence: [`activateNode`](../../src/domain/operations.ts) → [`pathFromRoot`](../../src/domain/stack.ts) → [`applyNewStack`](../../src/domain/operations.ts). Activating a descendant activates every ancestor on the path.

| Action | Resulting stack / lifecycle |
| --- | --- |
| Activate generated Core Question Q1 | `activeStack = [projectRoot, Q1]`; both `active` |
| Switch Q1 → Q2 via `activateNode(Q2)` | `activeStack = [projectRoot, Q2]`; Q1 returns to `open`; Project Root stays `active` (same sibling-switch rule as today under any parent) |
| Park Q1 (leaf) | Q1 → `parked`; stack pops to `[projectRoot]`; Project Root remains `active` |
| Park Project Root when it is the leaf (`stack = [projectRoot]`) | Project Root → `parked`; `activeStack = []` |
| Close prepared Q1 (leaf) | Q1 → `closed`; stack pops to `[projectRoot]`; Project Root remains `active` |
| Close Project Root (only when allowed — see B′) | Project Root → `closed`; `activeStack = []` |
| Focus / `returnToParent` | Focus only; stack unchanged (existing rule) |

How users “leave” the Project Root on the stack:

- activate another Core Question (sibling switch), or
- park the Project Root when it is the leaf, or
- close the Project Root when convergence allows.

No special “structural inactive root” flag. No change to active↔stack bijection.

### B′. Narrow close guard (required by sole-root + unchanged `completePass`)

`completePass` stays **exactly** as today: all `rootNodeIds` closed + empty `activeStack`.

With a sole Project Root that means the learner must eventually close the Project Root. Convergence today does **not** require non-blocking children closed, so an empty-DoD Project Root could close while Core Questions remain open — incorrect for this product shape.

**In-scope, narrowly required rule:** when closing `projectRootNodeId`, fail unless every **direct child** is `closed`. Implement in `evaluateNodeConvergence` / `closeNode` path only for that node id (e.g. new error `ProjectRootChildrenOpen`). Do **not** change `completePass` itself.

Project Root authoring defaults: fixed orientation goal + empty DoD (plus the children-closed guard above). No special criterion set in this task.

### B″. Explicitly out of scope (unchanged contracts)

| Contract | TASK-003 stance |
| --- | --- |
| `completePass` | **Unchanged.** No child-closed rewrite of the pass API. |
| Frontier `placement.kind === "root"` | **Unchanged** public domain command. May still append an additional pass root. Bootstrap/init path must still create exactly one Project Root; UI/learning-loop callers should prefer child placement under Project Root or a Core Question. Redefining `root` → child-of-project-root is a separate Domain decision. |

### C. Domain operations (in scope)

| Op | Behavior |
| --- | --- |
| `createProject` | Unchanged empty pass (M4 invariant: bootstrap orchestrates) |
| **`ensureProjectRoot`** (new) | If `projectRootNodeId` missing: create open LearningNode with deterministic id strategy for **new** creates via ports (bootstrap) or stable derived id (migration — see I); `question = project.name`; fixed orientation goal; empty DoD; set `rootNodeIds = [id]` (or prepend/replace per migration); set `projectRootNodeId = id`. Idempotent if already set and node exists |
| **`addCoreQuestion`** (change) | Require project root (`ProjectRootRequired` if missing). Create **child** under root via `attachChild` (not a new pass root). Emit `CoreQuestionAdded`. Enforce `CORE_QUESTION_LIMIT` against **`projectRoot.childIds.length`** |
| **`updateProjectMetadata`** (new) | Update `name` / `source` / `description` on `LearningProject`. On name change: set `nodes[projectRootNodeId].question = name`. Never delete nodes, never re-run bootstrap, never rewrite parent/child |
| Close / park / activate / createChild / blocking / frontier | Existing semantics, plus B′ close guard for Project Root only |

Events: add `ProjectMetadataUpdated` (optional `ProjectRootEnsured`) if useful for tests; keep `CoreQuestionAdded`.

### D. `LearningProject.description`

Add optional `description?: string` on `LearningProject`.

- Create: persist create-form description onto the project (still also passed as evidence hint).
- Edit: metadata-only; does not re-bootstrap.
- Semantic parse: accept optional string; older snapshots without it remain valid.

### E. Bootstrap orchestration

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

### F. Empty first layer & authoring selectors

| Helper | New meaning |
| --- | --- |
| `isEmptyFirstLayer` | no project root **or** project root has `childIds.length === 0` |
| `selectCoreQuestionAuthoring` | `remaining = CORE_QUESTION_LIMIT - projectRoot.childIds.length` (0 if no root) |

Empty-project UI ([`App.tsx`](../../src/ui/App.tsx) + `CoreQuestionForm`) still offers supplemental core questions; each goes under the Project Root.

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

Keep `SEMANTIC_VERSION = 1`. Do **not** wipe stores.

#### I.1 Deterministic Project Root identity

Legacy wrap must not call time/random `ports.id()` on every hydrate.

```text
migratedProjectRootId(projectId) := `plt:project-root:${projectId}`
```

Stable across reloads; disjoint from default `id-${Date.now()}-…` ids. Bootstrap for **new** projects may still use `ports.id()` once, then persist `projectRootNodeId` in the snapshot (no re-derive needed).

#### I.2 Semantic migration (idempotent)

Run in the workspace semantic load path **after** structural parse, as an explicit `migrateSnapshotHierarchy(snapshot) → { snapshot, migrated: boolean }` helper (application or workspace module — not a silent side effect inside JSON parse that also touches preferences).

For each project snapshot:

| Case | Action |
| --- | --- |
| `projectRootNodeId` set and ∈ `rootNodeIds` and node exists | No-op (`migrated: false`) |
| `rootNodeIds.length === 0` | No-op; later `ensureProjectRoot` / bootstrap can create |
| Missing usable project root; one or more flat roots | Create Project Root with id `plt:project-root:${project.id}`, `question = project.name`; reparent each former root as non-blocking child (**preserve former node ids**, criteria, evidence, conversations, thread ids); set `rootNodeIds = [newRoot, …any non-reparented roots if ever needed]` → for this migration, former roots all become children so `rootNodeIds = [newRoot]`; set `projectRootNodeId = newRoot`; `migrated: true` |

If any project `migrated: true`, **write the migrated semantic workspace back** to `plt.workspace.semantic.v1` in the same load turn so the next reload is a no-op and Root ID stays stable.

Semantic parse/migration must **not** read or write `nodePositions` / preferences.

#### I.3 Preference reconciliation (separate layer)

When semantic migration reports `migrated: true` for a projectId, the workspace load coordinator (preferences layer) clears **that project’s** `layout.nodePositions` only, then saves preferences. Rationale: old flat coordinates would pin former roots and overlap the new Root; auto-layout should apply. Viewport/chrome/theme/locale unchanged.

This is not part of semantic JSON parsing.

Demo fixtures ([`src/fixtures/demo-tree.ts`](../../src/fixtures/demo-tree.ts)) and domain tests that call `addCoreQuestion` on an empty pass must `ensureProjectRoot` first (or use a shared fixture helper).

### J. Persistence boundary (unchanged contract)

Semantic: project metadata (incl. description), `projectRootNodeId`, hierarchy, learning nodes/state, bootstrap record.

Preferences: x/y, viewport, chrome, theme, locale.

Metadata edits and bootstrap create → explicit semantic save. Drag → layout only. Migration: semantic write-back + optional preferences position clear as I.2 / I.3.

## Layering

| Layer | Change |
| --- | --- |
| Domain | `projectRootNodeId`; `description?`; `ensureProjectRoot`; `addCoreQuestion` under root; `updateProjectMetadata`; Project Root close guard (B′); **no** `completePass` / Frontier root contract changes |
| Application | bootstrap order; `isEmptyFirstLayer` / core-question selector; `migrateSnapshotHierarchy`; metadata use case |
| Framework | none required (optional: reuse `parseGitHubSource` for UI name derive via application) |
| Workspace | `updateWorkspaceProjectMetadata`; semantic load → migrate → persist if changed; **separate** preference position clear when migrated; select new project on create (already true) |
| UI | create name-from-URL; Edit Project; root testid; e2e OpenSpec-style flow |
| Infrastructure | unchanged evidence provider |

## Implementation order (after `plan_approved=true`)

1. **Domain types + ops** — `description`, `projectRootNodeId`, `ensureProjectRoot`, rewrite `addCoreQuestion`, `updateProjectMetadata`, Project Root close guard; domain unit tests including Active Stack cases.
2. **Application bootstrap + selectors** — root-first bootstrap; empty/authoring selectors; name derivation helper.
3. **Migration** — deterministic id helper; semantic migrate + write-back; preference reconciliation hook.
4. **Workspace metadata update** — session helper + semantic commit path from App.
5. **UI** — create name-from-source; Edit Project; root testid; e2e OpenSpec-style flow.
6. **Fixture / test updates** — demo-tree, bootstrap, project-authoring, persistence, e2e.

## Tests to add / update after approval

### Domain / Application — hierarchy & metadata

- Bootstrap creates exactly one Project Root; `rootNodeIds.length === 1`; Core Questions are its children; count ≤ limit; recommended focus points at children.
- `addCoreQuestion` does not grow `rootNodeIds`; enforces limit on root `childIds`.
- Rename via `updateProjectMetadata` updates `project.name` and root `question`; root id and descendant ids/relations unchanged.
- Edit source/description does not change node set / parent-child / bootstrap questions.
- Hierarchy round-trips through clone/serialize helpers.

### Domain — Active Stack / park / close under Project Root (required)

**Activate generated Core Question under Project Root**

- Given bootstrap (or fixture) with Project Root R and children Q1…Qn  
- When `activateNode(Q1)`  
- Then `activeStack === [R, Q1]`, both lifecycles `active`, other Qi remain `open`

**Switch Q1 → Q2**

- Given stack `[R, Q1]`  
- When `activateNode(Q2)`  
- Then `activeStack === [R, Q2]`, Q1 is `open`, R stays `active`

**Close / park behavior with Project Root**

- Park Q1 (leaf): Q1 `parked`, `activeStack === [R]`, R still `active`  
- Park R when leaf: R `parked`, `activeStack === []`  
- Close prepared Q1 (leaf): Q1 `closed`, `activeStack === [R]`  
- Close R while any direct child still open: **fails** (`ProjectRootChildrenOpen` or equivalent); snapshot unchanged  
- Close R when all direct children `closed` and R convergence otherwise ok: R `closed`, `activeStack === []`  
- `completePass` still uses existing rules (all roots closed + empty stack) — covered as regression, not a rewritten API

### Workspace / Persistence — migration stability (required)

**Legacy migration → reload → Root ID remains stable**

- Given a stored semantic v1 workspace with flat multi-root snapshot (no `projectRootNodeId`)  
- When load #1 runs migration  
- Then one Project Root appears with id `plt:project-root:${projectId}`, former roots are children with ids preserved, semantic store is written back  
- When load #2 runs  
- Then `migrated: false` / no structural rewrite; **same** `projectRootNodeId`; children still attached  
- Preferences: after load #1 migration, that project’s `nodePositions` cleared via preferences reconciliation (not via semantic parse); semantic payload never contains `nodePositions`

Also:

- `createWorkspaceProject` selects the new project (existing) and persists hierarchy.
- Metadata edit triggers semantic save; layout preferences untouched on metadata-only edits.
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

**Regression (must stay green):** child-authoring, blocking-children, frontier-and-parking (including Frontier `placement: root` still appending a pass root), semantic-persistence, persistence-boundary e2e, multi-project, edge-routing, learning-loop, import-boundary, activation-and-focus.

## Non-goals

- New LLM provider / RAG / full repo indexing
- Conversation redesign
- Manual edge authoring / multi-parent graphs
- TASK-002 visual redesign
- Implicit re-bootstrap when source/description change
- Changing Coco contract methodology constants (Domain `CORE_QUESTION_LIMIT` remains the operational cap)
- Redefining Frontier `placement.kind === "root"`
- Rewriting `completePass` acceptance rules (beyond relying on existing API + B′ close guard)

**Gate:** `acceptance` — implementation complete on this branch; awaiting ChatGPT acceptance review (`acceptance_approved=true`).

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Canonical plan written | this file |
| Plan approved | true |
| Implementation | complete on this branch |
| Acceptance approved | false — awaiting ChatGPT |
| Next expected actor | chatgpt (acceptance review) |

## Decisions locked for re-review

These replace the previous open blocking questions:

1. **Active Stack** — Project Root is a normal sole root on the path; see table in B.
2. **`completePass` / Frontier root** — unchanged public contracts; out of TASK-003 except B′ Project Root close guard.
3. **Migration** — deterministic `plt:project-root:${projectId}`; semantic write-back for idempotence; preferences position clear coordinated separately.
4. **Project Root goal/DoD** — fixed orientation goal + empty DoD + children-must-be-closed on close.
