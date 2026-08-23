---
task_id: TASK-010
title: Project Root Learning Progress & Canvas Interaction Stability
status: acceptance_review
requirement: ../requirements/TASK-010-project-root-learning-progress.md
pr: 32
branch: task/TASK-010-project-root-learning-progress
---

# TASK-010 Plan — Project Root Learning Progress & Canvas Interaction Stability

This is the canonical implementation plan for TASK-010. It records Planning Gate evidence (project-init / domain audit + canvas flash reproduction) and the smallest coherent change set that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `acceptance_review` — implementation complete on PR #32; awaiting ChatGPT Acceptance Review (`acceptance_approved` still false).

**Hard constraints:**

- Plan approved — production implementation authorized on PR #32 only.
- Do **not** modify TASK-009 history, acceptance evidence, or Decision B wording in TASK-009 **durable docs** (`docs/requirements/TASK-009-*`, `docs/plans/TASK-009-plan.md`, milestone acceptance write-ups).
- TASK-010 **forward-supersedes** the product rule that prohibited a visible Project Root on the Learning Tree graph.
- Prefer reuse of Domain / Persistence / React Flow — no parallel project-init, progress, or canvas systems.
- Do **not** mask background flash with CSS delays/transitions; do **not** disable node selection or drag.
- Project Root must not become a dashboard; no chat on Project Root.
- **Project Root is not a Question.** Reusing `LearningNode` storage shape is an implementation detail only — never expose Root to Question lifecycle / convergence / Active Stack / conversation semantics.

---

## Review revisions (PR #32 Plan Review)

Blocking findings addressed in this revision:

### Finding 1 — Project Root stays outside Question lifecycle

**Removed / replaced** prior Plan language that:

- allowed `closeNode` on Project Root when children are closed (`ProjectRootChildrenOpen` as a Root close gate);
- treated Question Active Stack as `[ProjectRoot, …, Qi]`.

**Binding Root role:**

> Project Root = **project identity + structural root + derived learning progress**

| Rule | Binding |
| --- | --- |
| Start learning / activate | **Forbidden** on Root |
| Complete / close / reopen | **Forbidden** on Root |
| Question convergence | Root **does not participate** |
| Conversation target | Root **is not** a conversation target |
| Question Active Stack | Root **never** appears on the stack |
| Question-only actions | All must **exclude** Root (domain + UI) |
| Storage | May reuse `LearningNode` shape + `projectRootNodeId` pointer |

### Finding 2 — Superseded assertions must leave the active suite

TASK-009 durable docs stay historical. **Active** automated tests that still encode “no Project Root / flat question roots / `projectRootNodeId === undefined`” must be **updated or replaced** during TASK-010 implementation so CI expresses the new product truth. Git history + TASK-009 docs preserve the old evidence — not conflicting live assertions.

---

## Goal

Make the Learning Tree graph communicate:

```text
Project Root          ← project identity + derived learning progress (no chat, no Question lifecycle)
├── Initial Question 1
├── Initial Question 2
├── …
└── Initial Question N
```

And stop canvas/background flashing on node click, select, and drag by fixing controlled React Flow tree churn — not by disabling interaction.

---

## Explicit confirmation: TASK-009 Decision B superseded (forward only)

| Artifact | Prior rule | TASK-010 |
| --- | --- | --- |
| TASK-009 Requirement § “project is context… not a visible graph node” | No Project Root on canvas | **Superseded going forward** by TASK-010 §2 / §4 |
| TASK-009 Plan Decision B | Domain KEEP; must not render Project Root | Forward product override: **render** a dedicated Project Root with distinct role |
| TASK-005 flatten (shipped) | Project is container; flat question roots; load migration **deletes** Project Root | TASK-010 restores rooted topology + inverts migration |

**Do not edit** TASK-009 durable requirement/plan/acceptance documentation. **Do update** any **currently running** test/e2e that asserts the superseded “no Project Root” / flat-root product behavior (see Test strategy § Finding 2).

---

## Current-state findings

### 1. Project-creation flow (today)

```text
ProjectSidebar (GitHub URL only)
  → App.onCreateProject
  → workspace/session.createWorkspaceProject
  → application/bootstrap.bootstrapLearningProject
       → domain.createProject          // empty pass; no Project Root
       → evidence + runProjectLearningBootstrap
       → domain.addCoreQuestion × N    // flat roots; no parentId
  → selectTreeViewModel → toReactFlow → TreeCanvas
```

Evidence:

- [`bootstrapLearningProject`](../../src/application/bootstrap.ts) (~78–146): `createProject` then `addCoreQuestion` only — **no** `ensureProjectRoot`.
- [`createProject`](../../src/domain/operations.ts) (~195–225): `rootNodeIds: []`, no `projectRootNodeId`.
- [`addCoreQuestion`](../../src/domain/operations.ts) (~247–267): appends open node with **no** `parentId` to `rootNodeIds`; limit vs `rootNodeIds.length`.
- Bootstrap / e2e / several unit suites still lock flat topology (examples below under Finding 2 inventory).

**Why `1 Root + N Questions + Root→Question edges` is not formed:** not a flaky race — **by design after TASK-005 flatten**. Bootstrap never creates a root; `addCoreQuestion` is flat; load migration **removes** any legacy root.

### 2. Node / domain type model (today)

| Type | Path | Role today |
| --- | --- | --- |
| `LearningProject` | [`types.ts`](../../src/domain/types.ts) | Project identity (`name`, `source`, `description`) — **not** a graph node |
| `LearningPass` | same | `rootNodeIds` + optional vestigial `projectRootNodeId?` |
| `LearningNode` | same | Single shape for all nodes; **no** `kind` / `role` / `isProjectRoot` field |
| View | [`tree-view-model.ts`](../../src/application/selectors/tree-view-model.ts) | No Project Root flag; edges only from `childIds` |

Vestigial TASK-003 leftovers (unused by create path): `projectRootNodeId`, `migratedProjectRootId`, `PROJECT_ROOT_ORIENTATION_GOAL`, `EnsureProjectRoot` / `ProjectRootEnsured` types, error kinds `ProjectRootRequired` / `ProjectRootChildrenOpen`, i18n strings.

**Semantic boundary (target):**

| Role | Domain identity | Conversation | Progress display | Graph | Question lifecycle |
| --- | --- | --- | --- | --- | --- |
| **Project Root** | `pass.projectRootNodeId` === node id; sole `rootNodeIds` entry | **Forbidden** | Project-level derived progress | Visible compact node | **Excluded** (no activate/close/converge/stack) |
| **Question** | Every other `LearningNode` | Primary conversation object | Own lifecycle + optional child progress | Visible learning node | Full question ops |

Smallest coherent distinction: restore the **pointer convention** (`projectRootNodeId`) + view-model `isProjectRoot` derived from it + domain helper `isProjectRootNode(snapshot, id)` for **hard action guards**. Do **not** invent a second node store. Reusing `LearningNode` fields (`question` holding project name, etc.) is storage convenience only.

### 3. Initial-question creation flow

Still correct as a **question generator**; wrong as **topology wiring**:

1. Evidence load (async) → `runProjectLearningBootstrap` → ≤ `CORE_QUESTION_LIMIT` guided questions.
2. Each question → `addCoreQuestion` + criteria.
3. On success only, `createWorkspaceProject` appends the project to the workspace.

**Intermediate state:** bootstrap failure does not persist a half-created project in session (project is added only after `ok`). No second init pipeline needed — correct by inserting `ensureProjectRoot` and changing `addCoreQuestion` attachment.

### 4. Graph edge / topology construction

```text
DomainSnapshot.pass.rootNodeIds  → forest roots (sole Project Root after TASK-010)
LearningNode.childIds            → TreeEdgeView / RF edges
```

Today after create: `N` sibling roots, **0** Root→Question edges. Edges appear only after `createChild` under a question.

Layout ([`layout.ts`](../../src/ui/tree/layout.ts)): places each `rootNodeIds` entry as a forest root. After restore: **one** structural root → single-root layout with children beneath.

### 5. Persistence / restore

| Layer | Key | Notes |
| --- | --- | --- |
| Semantic | `plt.workspace.semantic.v1` | `DomainSnapshot` + bootstrap record |
| Preferences | layout v2 | viewport, `nodePositions`, chrome — **not** DomainSnapshot |

[`loadSemanticWorkspaceWithMigration`](../../src/workspace/persistence/semantic.ts) runs [`migrateSnapshotHierarchy`](../../src/application/hierarchy-migration.ts) on every load and **rewrites** semantic storage when migrated.

**Current migration direction (inverse of TASK-010 need):** Project Root → flat (deletes root node, promotes children to `rootNodeIds`, clears pointer). Idempotent when already flat.

### 6. Progress sources (today)

| Source | Location | Formula | Persisted? |
| --- | --- | --- | --- |
| Project summary | [`selectProjectSummary`](../../src/application/selectors/project-summary.ts) | `closed / all nodes` | No — derived |
| Node child progress | [`selectTreeViewModel`](../../src/application/selectors/tree-view-model.ts) | `closed children / childIds` | No — derived |
| Sidebar bar | [`ProjectSidebar`](../../src/ui/sidebar/ProjectSidebar.tsx) | uses `completionLevel` | No |

No independently mutable project-progress field exists. **Reuse derived selectors**; specialize Project Root display and align `selectProjectSummary` so a Project Root node does not distort totals.

### 7. Why new projects lack stable Project Root topology (summary)

1. Bootstrap never calls `ensureProjectRoot`.
2. `addCoreQuestion` appends flat roots.
3. Hydration migration **deletes** any legacy Project Root and persists the flatten.
4. Canvas has nothing to “unhide” — there is no root in the snapshot.

---

## Target domain / init design

### Lifecycle (project init — structural, not Question learning)

```text
create project
  → createProject
  → ensureProjectRoot          // rootNodeIds=[R], projectRootNodeId=R, question=project.name
  → resolve/generate questions
  → addCoreQuestion × N        // attach under R; edges R→Qi  (structural children, not “Root learning”)
  → persist one coherent snapshot
```

### Project Root formal semantics (binding)

```text
Project Root = project identity + structural root + derived learning progress
```

| Capability | Project Root | Question |
| --- | --- | --- |
| Visible graph node | Yes (compact) | Yes |
| Holds project name (display) | Yes (`question` field as label storage) | Learning question text |
| Derived project progress UI | Yes | Own child progress only |
| `activateNode` / start learning | **Reject** | Allowed |
| Appear on Question Active Stack | **Never** | Yes |
| `closeNode` / complete / reopen | **Reject** | Allowed when convergence holds |
| `evaluateNodeConvergence` / close gates | **N/A — skip / reject** | Yes |
| Chat / conversation bind | **Forbidden** | Primary |
| Add child question / core question attach | Structural parent only (ops attach **under** Root) | Learning authoring |
| Park / resume / blocking-child activate **as target** | **Reject** | Allowed per existing rules |

**Storage note:** Root may remain a `LearningNode` with a lifecycle field present in the type. Product rule: **no question-only transition may mutate Root lifecycle**. Prefer leaving Root in a stable non-learning storage state (e.g. permanently `open` with no UI/ops path that changes it) rather than inventing a parallel store. Do **not** treat Root `lifecycle === "closed"` as project completion.

### Domain ops (smallest restore)

| Op | Change |
| --- | --- |
| `isProjectRootNode(snapshot, id)` | Thin helper used by all guards |
| `ensureProjectRoot` | Create/reuse sole Project Root; set `projectRootNodeId`; `question = project.name`; `goal = PROJECT_ROOT_ORIENTATION_GOAL`; **does not** put Root on Active Stack |
| `addCoreQuestion` | Require Project Root; `attachChild` under root; limit against **root `childIds` length** (not `rootNodeIds.length`) |
| `updateProjectMetadata` | Keep; sync `project.name` → Project Root `question` when root exists |
| `activateNode` | If target is Project Root → **fail** (e.g. `InvalidLifecycleTransition` / dedicated `NotALearningQuestion`). If target is Question → Active Stack = **question-only path** (see below) |
| `closeNode` / `reopenNode` | If target is Project Root → **fail**. No children-closed “Root may close” rule. Drop any plan to reuse `ProjectRootChildrenOpen` as a Root completion gate (error kind may remain unused or be reserved for other structural checks — **not** as “Root is closable when children closed”) |
| Convergence | `evaluateNodeConvergence` / close preflight **short-circuit**: Project Root is not a convergence subject |
| Park / resume / activateBlockingChild (as target) | Reject Project Root |
| `createChild` | Parent may be Project Root **only** as structural attachment of a new Question (same as core questions); the new node is a Question; Root does not become an Active Stack member |

### Question Active Stack semantics (binding)

Structural parent chain may be `R → … → Qi`, but **Question Active Stack never includes `R`**.

```text
structuralPath = pathFromRoot(snapshot, Qi)           // may start at Project Root
learningPath   = structuralPath.filter(id ≠ projectRootNodeId)
activateNode(Qi) → applyNewStack(learningPath)        // e.g. [Qi] or [Qa, Qb, Qi]
```

Invariants to enforce in `validateActiveStack` / activate helpers:

1. No stack entry equals `projectRootNodeId`.
2. Every stack entry is a learning Question (`!isProjectRootNode`).
3. Stack is a single parent–child chain among Questions.
4. `stack[0]` is a **direct child of Project Root** (top-level learning entry), not the Project Root itself.
5. Stack members remain subject to existing lifecycle rules (`active`, etc.) — Root is simply absent.

This replaces the prior Plan’s `[ProjectRoot, …, Qi]` design.

### Progress (authoritative, derived) — unchanged intent

```text
learningQuestions = nodes where id ≠ projectRootNodeId
numerator   = count(learningQuestions where lifecycle === "closed")
denominator = learningQuestions.length
percent     = denominator === 0 ? 0 : round(100 * numerator / denominator)
```

Rules:

- Archived/removed projects are out of the live snapshot (no special progress math).
- Non-learning decorative RF clusters are **not** domain nodes — excluded automatically.
- Project Root itself is **excluded** from numerator/denominator.
- Child Question nodes under Questions **do** count (whole-tree learning questions).
- Percentage is **derived**, never a separately writable source of truth.
- Project Root UI shows compact copy like: `{name}` + `学习进度 {n} / {d} · {p}%` (locale via i18n).
- Align `selectProjectSummary.completionLevel` to the same formula (`n/d`).
- Question-node child progress (`completedChildCount` / `childCount`) unchanged.
- Project progress is **not** gated on closing the Project Root (Root never closes).

### Chat / action boundary

- Project Root toolbar: **no** chat, **no** complete, **no** question-only affordances; omit `onOpenChatForNode` / complete / add-child-as-question-chrome when `isProjectRoot` (add-child may exist only if product already treats “add top-level question” as a Root structural action — default Plan: keep authoring entry points that already exist for questions; do not invent Root dashboard actions).
- Selecting/focusing Project Root: may set `currentFocusNodeId` for selection chrome, but must **not** open chat or bind a question conversation.
- `openChatForNode(rootId)` must no-op / be unreachable from UI; application/session helpers reject Root as conversation target.
- Question Nodes retain chat / add-child / complete / inspector (current TASK-009 chrome).

### UI presentation

- Compact Project Root chrome (name + progress) — clearly distinct from Question cards; **not** a dashboard.
- Prefer same RF `learningNode` type with `data.isProjectRoot` styling variant (smallest change). Optional separate RF node type only if shared chrome becomes messy — default to one type + flag.
- Reintroduce `data-project-root="true"` for tests.
- Root must not show “聊聊这个问题” or equivalent.

---

## Migration / normalization strategy

Replace flatten migration with **idempotent ensure-root normalization** in [`hierarchy-migration.ts`](../../src/application/hierarchy-migration.ts) (same call site in semantic hydrate).

| Incoming snapshot | Action | `migrated` |
| --- | --- | --- |
| Valid `projectRootNodeId` ∈ `rootNodeIds`, node exists, sole structural root, children are questions | Preserve | `false` |
| Flat: no usable `projectRootNodeId`, `rootNodeIds` are question nodes | Create root via `migratedProjectRootId(projectId)`; move former roots → children; `rootNodeIds=[R]`; set pointer; `question=project.name` | `true` |
| Stale pointer (missing node / not in `rootNodeIds`) | Clear or rebuild deterministically via `migratedProjectRootId` — never invent random ids on repeat loads | `true` |
| Already normalized | No-op | `false` |

Invariants:

- Never destroy Question node content.
- Never create duplicate Project Roots on repeat load (stable id = `plt:project-root:${projectId}`).
- Do **not** reinterpret an arbitrary Question as Project Root based only on graph position.
- Prefer reuse of existing project entity + pointer over duplicating project identity into a second store.
- Preferences: clear/reconcile `nodePositions` for migrated project ids (existing `clearPositionsForProjectIds` / boot path pattern) so layout does not keep stale root-less coordinates as truth.
- After migration, strip Project Root from any legacy `activeStack` entries if present (normalize stack to question-only).

---

## Background flash — reproduction & root cause

*(Unchanged from prior Plan Review-approved direction — retained as implementation authority.)*

### Reproduction path

1. Open a project with question nodes on canvas (`TreeCanvas` mounted).
2. **Click** a question node → observe canvas/cluster underlay flash.
3. **Drag** a node → observe repeated underlay/edge churn during move and again on drag end.

### Planning reproduction evidence (executed this gate)

**A. Unit identity diagnostic** (ephemeral; not retained in suite):

- `layoutOnlyNodeChanges` includes `select` | `position` | `dimensions`.
- Simulated Path A: `enrichNodes` + `toClusterFlowNodes` + `routeEdgesForNodes` produce **all-new** node/data/cluster/edge object identities on a select-equivalent remap.
- Simulated Path B: `toReactFlow(makeModel())` vs `toReactFlow(makeModel("q1"))` replaces all node/edge identities when focus flips.

**B. Headed/manual computer-use** attempt blocked by environment click interception on empty-state create buttons; not used as primary evidence.

**C. Playwright MutationObserver on `.react-flow`** (against production build; ephemeral diagnostic spec):

| Interaction | Observed DOM mutations under `.react-flow` | Theme | Canvas host |
| --- | --- | --- | --- |
| Click → focus | `attributes: 37`, of which **clusterRegion style: 20**, node selected/style: 35; `childList: 1` | unchanged (`light`) | stable (not remounted) |
| Drag move + end | `attributes: 141`, of which **clusterRegion style: 109** | unchanged | stable |

Structure at repro: 5 learning nodes, 5 cluster underlay RF nodes (`zIndex: -1`), focus applied.

### Primary root cause

**Controlled React Flow receives a freshly rebuilt learning-node + cluster-underlay + edge graph on select/drag events and again on focus / drag-stop derived resync.** Cluster regions are z-index `-1` tinted RF nodes that act as the painted “background landscape”; restyling/replacing them is what reads as canvas/background flash.

Coupled paths:

**Path A — local RF changes** ([`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) ~164–177, ~136–152):

- `layoutOnlyNodeChanges` keeps `select` / `position` / `dimensions`.
- Handler calls `setNodes(enrichNodes(applyNodeChanges(...)))` → **remaps every node**.
- `clusterNodes` / `flowNodes` / `edges` `useMemo` depend on `nodes` → full cluster + edge rebuild every select and every drag frame.

**Path B — domain/layout derived replace** ([`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) ~129–134; [`App.tsx`](../../src/ui/App.tsx) ~297–305, ~357–360):

- Click → `onFocusNode` → `focusSelectedNode` → `focusNode` clones snapshot → new `TreeViewModel` → `toReactFlow` new arrays → render-time `derived.nodes !== derivedNodes` → `setNodes(enrichNodes(...))` full replace.
- Drag stop → `applyNodeDragStop` updates `nodePositions` → `savedPositions` change → another full `toReactFlow` replace.

### Ruled out (with evidence)

| Hypothesis | Verdict |
| --- | --- |
| `key` remount of ReactFlow on click/drag | **Ruled out** — `key={selectedProjectId}` only; host marked stable across click |
| Conditional unmount of canvas | **Ruled out** — canvas stays mounted for non-empty project |
| Theme / `data-theme` toggle on focus | **Ruled out** — theme unchanged in e2e; `applyThemeStyleVars` depends on scheme/recipe only |
| CSS `:active`/`:focus` on canvas ancestors | **Ruled out** — no such background rules on `.tree-pane` / `.react-flow*` |
| Inline `nodeTypes` remount bug | **Ruled out** — module-level `nodeTypes` const |
| XYFlow `<Background />` pattern flash | **Ruled out** — component not mounted; fill is CSS + clusters |
| Semantic DomainSnapshot reload on drag | **Ruled out** — drag stop is layout-only (`commit(..., false)`); focus writes semantic but does not re-hydrate |

### Fix direction (implementation after approval — conceptual)

1. Stop treating pure `select` as a full-tree remap trigger; patch `selected` / focus chrome in place where possible.
2. Narrow `onNodesChange`: apply position updates without remapping all `data`; keep callbacks via refs.
3. Do not rebuild cluster underlays on pure selection; update cluster geometry only when positions/model structure change (by id), or render underlays outside the churning controlled list.
4. Stabilize App memos: `tree` on `snapshot` (not whole project object); stabilize `recommendedNodeIds` (avoid `?? []` new array).
5. After drag stop, merge positions into local RF state instead of discarding the graph via full derived replace when only positions changed.
6. **Forbidden:** CSS transition delays on background; disabling selection/drag.

---

## Expected files / modules to change

### Domain

| File | Why |
| --- | --- |
| [`src/domain/operations.ts`](../../src/domain/operations.ts) | Restore `ensureProjectRoot`; root-attach `addCoreQuestion`; metadata→root name sync; **reject** Root for activate/close/reopen/park/etc. |
| [`src/domain/stack.ts`](../../src/domain/stack.ts) | Question-only Active Stack validation; strip Root from learning paths |
| [`src/domain/convergence.ts`](../../src/domain/convergence.ts) | Exclude Project Root from convergence subjects (no Root close path) |
| [`src/domain/types.ts`](../../src/domain/types.ts) | Confirm pointer/events; no broad schema rewrite |
| [`src/domain/index.ts`](../../src/domain/index.ts) | Re-export restored helpers/ops |
| [`src/domain/errors.ts`](../../src/domain/errors.ts) | Prefer clear reject kinds for “not a learning question”; do **not** revive Root-closable `ProjectRootChildrenOpen` gate |

### Application

| File | Why |
| --- | --- |
| [`src/application/bootstrap.ts`](../../src/application/bootstrap.ts) | `ensureProjectRoot` before questions; empty-layer = no root children |
| [`src/application/hierarchy-migration.ts`](../../src/application/hierarchy-migration.ts) | Invert to idempotent ensure-root normalize; scrub Root from stacks |
| [`src/application/selectors/tree-view-model.ts`](../../src/application/selectors/tree-view-model.ts) | `isProjectRoot` + project progress fields on root |
| [`src/application/selectors/project-summary.ts`](../../src/application/selectors/project-summary.ts) | Align completion with question-only formula |
| [`src/application/selectors/core-question-authoring.ts`](../../src/application/selectors/core-question-authoring.ts) | Remaining slots from root `childIds` |
| Chat / action selectors + session helpers | Block chat bind/open and question-only actions for Project Root |

### Workspace / UI

| File | Why |
| --- | --- |
| [`src/workspace/persistence/semantic.ts`](../../src/workspace/persistence/semantic.ts) | Same hydrate hook; persists normalized rooted snapshots |
| [`src/workspace/session.ts`](../../src/workspace/session.ts) / [`App.tsx`](../../src/ui/App.tsx) | Focus/chat wiring; memo stability for flicker fix |
| [`src/ui/tree/TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) | Flash fix; omit question-only callbacks for root |
| [`src/ui/tree/LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) | Root chrome (name + progress); no chat / complete |
| [`src/ui/tree/to-react-flow.ts`](../../src/ui/tree/to-react-flow.ts) / [`layout.ts`](../../src/ui/tree/layout.ts) / cluster modules | Root-aware layout; reduce underlay churn |
| [`src/ui/i18n/messages.ts`](../../src/ui/i18n/messages.ts) | Project progress copy |
| CSS (learning node / canvas) | Distinct but compact root styling |

### Tests — update superseded active assertions + add TASK-010 coverage

See next section for inventory. Implementation **must** change the active suite, not leave flat-root assertions as CI truth.

---

## Test strategy

### Finding 2 inventory — active tests that currently encode superseded product truth

These are **live** regressions today and must be updated/replaced in the implementation phase (not left failing or asserting the old world). TASK-009 **docs** stay untouched; these **test files** are CI product contracts and follow TASK-010:

| Active file | Superseded assertion pattern | TASK-010 replacement intent |
| --- | --- | --- |
| [`tests/application/bootstrap.test.ts`](../../tests/application/bootstrap.test.ts) | `projectRootNodeId` undefined; flat `parentId` | Sole Root + N children + Root→Qi |
| [`tests/application/hierarchy-migration.test.ts`](../../tests/application/hierarchy-migration.test.ts) | Flatten → `projectRootNodeId` undefined | Ensure-root normalize + idempotence |
| [`tests/application/core-question.test.ts`](../../tests/application/core-question.test.ts) | Flat / undefined root pointer | Root-required attach under Root |
| [`tests/workspace/multi-project.test.ts`](../../tests/workspace/multi-project.test.ts) | undefined `projectRootNodeId` | Rooted projects after create/load |
| [`tests/workspace/project-lifecycle.test.ts`](../../tests/workspace/project-lifecycle.test.ts) | undefined root pointer | Preserve Root across archive/restore as applicable |
| [`tests/workspace/project-metadata-migration.test.ts`](../../tests/workspace/project-metadata-migration.test.ts) | Expects flatten clearing root | Align with ensure-root direction |
| [`tests/domain/project-authoring.test.ts`](../../tests/domain/project-authoring.test.ts) | Flat create expectations | Rooted authoring invariants |
| [`tests/domain/project-root.test.ts`](../../tests/domain/project-root.test.ts) | Current vestigial/flat expectations | Root ensure + **non-lifecycle** guards |
| [`tests/domain/integrity.test.ts`](../../tests/domain/integrity.test.ts) | undefined root pointer cases | Integrity under rooted topology |
| [`tests/ui/knowledge-cluster.test.tsx`](../../tests/ui/knowledge-cluster.test.tsx) | undefined `projectRootNodeId` | Rooted fixture |
| [`tests/ui/task-009-canvas.test.tsx`](../../tests/ui/task-009-canvas.test.tsx) | `projectRootNodeId` undefined; no `isProjectRoot` | Update to TASK-010 canvas contracts (file may keep name; **assertions must match new product**) |
| [`e2e/specs/project-bootstrap.spec.ts`](../../e2e/specs/project-bootstrap.spec.ts) | `[data-project-root="true"]` count **0** | count **1**; children under root; no Root chat |
| [`e2e/acceptance/task-009-screenshots.spec.ts`](../../e2e/acceptance/task-009-screenshots.spec.ts) | `[data-project-root="true"]` count **0** | Update active assertion to rooted reality **or** stop treating that locator expectation as product truth; do **not** keep count `0` as CI gate. Historical TASK-009 screenshots/docs remain in `docs/` / Git |

Principle: **history lives in durable TASK-009 artifacts + Git; the active suite expresses TASK-010.**

### Domain / application (Given/When/Then)

1. **New project topology** — create → exactly one `projectRootNodeId`; N question children with `parentId = root`; RF/view edges Root→Qi; reload preserves without duplicates.
2. **Idempotent migration** — flat snapshot → rooted once; second normalize `migrated: false`; question text preserved; root id = `migratedProjectRootId(projectId)`.
3. **Progress** — close/reopen/add/remove **questions** updates `n/d` and percent; root excluded from denominator; Root never needs to close for progress to reach 100%.
4. **Chat boundary** — focus root does not open chat; root toolbar has no chat control; question chat still works.
5. **Root ∉ Question lifecycle** — `activateNode(root)` fails; `closeNode(root)` / `reopenNode(root)` fail; convergence not applied to Root; Root never enters `activeStack`.
6. **Question Active Stack** — `activateNode(Qi)` → stack is question-only (e.g. `[Qi]` when Qi is direct child of Root; `[Qa, Qi]` for deeper questions); `validateActiveStack` rejects stacks containing Root.
7. **Question-only action matrix** — park/resume/complete/chat/openChat helpers reject or omit Root.

### UI / interaction regression

1. `layoutOnlyNodeChanges` / TreeCanvas: pure `select` does not rebuild all cluster node object identities (or equivalent memo assertion).
2. Focus-only snapshot change patches selection without replacing unrelated node `data` identities where feasible.
3. Theme/`data-theme` unchanged across focus (guard against regressions).
4. Root chrome: name + progress; no question chat/complete controls.

### E2E / headed

1. Playwright: new project shows `[data-project-root="true"]` count **1**; initial questions are children; no chat control on root.
2. Headed acceptance path (document for reviewer): click + drag nodes; canvas/cluster background must not flash.

---

## Risks & compatibility

| Risk | Mitigation |
| --- | --- |
| `pathFromRoot` / stack validation still assume stack[0] ∈ `rootNodeIds` (Project Root) | Retarget validation to question-only stack starting at Root’s direct child |
| Accidental Root close via shared `LearningNode` ops | Hard `isProjectRootNode` guards at op entry; UI omits affordances; tests for reject paths |
| `selectProjectSummary` counts root and understates progress | Shared derived formula excluding root |
| Preference positions orphan after migration | Clear positions for migrated project ids on hydrate |
| Flicker fix regresses drag persistence | Keep drag → `nodePositions` only; verify drag-stop still persists |
| Over-building Project Root UI | Compact name + progress only; no dashboard metrics |
| Active suite still asserts flat / no-root | Finding 2 inventory — update those files in implementation |
| Conflict with TASK-009 Decision B **docs** | Forward supersede only; leave TASK-009 durable artifacts untouched |

---

## Implementation sequence (after Plan approval)

1. Domain: restore `ensureProjectRoot` + root-aware `addCoreQuestion` + **Root exclusion guards** (activate/close/reopen/park/convergence/stack) + tests.
2. Application: bootstrap wiring + invert hierarchy migration (incl. stack scrub) + selectors (role, progress, authoring, chat block) + tests.
3. **Update Finding 2 active tests/e2e** to rooted / Root-non-lifecycle expectations (same PR).
4. UI: Project Root chrome (no chat / no complete) + layout; create/restore e2e green under new assertions.
5. Canvas stability: TreeCanvas/App memo + select/cluster churn fix + regression tests.
6. Headed visual confirmation of flash fix; acceptance checklist against Requirement §12.

---

## Out of scope (reaffirmed)

- Replacing React Flow / adopting AFFiNE.
- Redesigning whole Learning Tree UI or AI question-generation strategy.
- Chat on Project Root; project dashboard; new analytics.
- Treating Project Root as closable / activatable / convergence subject.
- Broad persistence rewrite beyond topology/migration need.
- Editing TASK-009 historical **documentation**.
- Implementing any of the above before `plan_approved: true`.

---

## Return condition for this Planning Gate

- [x] `docs/plans/TASK-010-plan.md` written
- [x] Root / project-init status analyzed with code evidence
- [x] Flash root cause stated with reproduction evidence
- [x] Migration strategy defined
- [x] Expected files + test strategy listed
- [x] TASK-009 no-project-root rule explicitly superseded **forward only**
- [x] Plan revised: Project Root outside Question lifecycle / Active Stack / convergence
- [x] Plan revised: superseded active tests must be updated (Finding 2 inventory)
- [x] ChatGPT Plan re-review (`plan_approved: true`) — **APPROVED**
- [x] Implementation complete — awaiting Acceptance Review
- [ ] Acceptance Review (`acceptance_approved: true`) — pending ChatGPT
