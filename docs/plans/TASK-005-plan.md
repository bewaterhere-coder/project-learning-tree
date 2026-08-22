---
task_id: TASK-005
title: Simplify Project Creation and Question Tree UX
status: plan_review
requirement: ../requirements/TASK-005-simplify-question-tree-ux.md
clarification: ../requirements/TASK-005-question-interaction-clarification.md
---

# TASK-005 Plan — Simplify Project Creation and Question Tree UX

This is the canonical implementation plan for TASK-005. It records code evidence for the requirement’s planning surface (including the question-interaction clarification addendum) and the smallest change that satisfies the acceptance criteria.

**Gate:** `plan_review` — awaiting ChatGPT plan review (`plan_approved=true`).

Implementation of product code is forbidden until that gate is recorded after Plan review. Writing this file is not Done for the task.

**Requirement set (both bind):**

- [`TASK-005-simplify-question-tree-ux.md`](../requirements/TASK-005-simplify-question-tree-ux.md)
- [`TASK-005-question-interaction-clarification.md`](../requirements/TASK-005-question-interaction-clarification.md) — wins on Start Learning ceremony, details-panel scope, and node-as-interaction-surface conflicts

## Goal

Make Learning Tree match one clear user model:

> Project is a container. Question is the learning object. Asking the question is the learning action. Child questions are how learning deepens.

And the clarification rule:

> Question is the learning unit. Clicking and discussing a Question is already learning.

After GitHub create, the canvas shows only top-level Questions (no Project/Root node), with direct chat and add-child on the node, derived child count/progress, a Project Details surface outside the graph, a details panel limited to knowledge deposition (达成条件 / 心得), and a complete `zh-CN` generation path.

Preserve:

- `DomainSnapshot` as semantic source of truth
- XYFlow as derived view; TASK-001 dynamic edge routing
- drag → `WorkspaceLayout.nodePositions` only
- Conversation ownership and persistence contracts
- explicit semantic writes (no broad workspace-change autosave)
- `locale` as source of truth for UI and newly generated content (not DomainSnapshot)
- existing archive / restore / permanent-delete lifecycle (TASK-004)

## Current-state findings

```text
Create: ProjectSidebar (name + source + description)
  → resolveProjectName → createWorkspaceProject → bootstrapLearningProject
      → createProject → ensureProjectRoot → addCoreQuestion×N (children of Root)
  → selectTreeViewModel (isProjectRoot) → LearningNode

Persist: loadSemanticWorkspaceWithMigration
  → migrateSnapshotHierarchy (flat roots → Project Root)  [TASK-003]

Details: NodeDetails / NodeActions
  → Start Learning, Park, Resume, Close, Return to parent, Open Chat
  → ChildAuthoringSection (add child)
  → criteria / summary / structure

Locale: workspace.shell.locale → t() only
  ✗ not passed to runProjectLearningBootstrap / ChatProvider.complete
```

### 1. Project creation and name derivation

| Surface | Path | Reality |
| --- | --- | --- |
| Create form | [`ProjectSidebar.tsx`](../../src/ui/sidebar/ProjectSidebar.tsx) | Required-looking name + source + description; create uses `resolveProjectName` |
| Name fallback | [`resolveProjectName`](../../src/application/bootstrap.ts) | Explicit trimmed name, else `parseGitHubSource(source)?.repo` |
| GitHub parse | [`parseGitHubSource`](../../src/framework/evidence.ts) | URL or `owner/repo`; already used for evidence, unused as sole create input |
| Bootstrap | [`bootstrapLearningProject`](../../src/application/bootstrap.ts) | Fails with `ProjectNameRequired` if name cannot be resolved |

**Gap:** Create UI still asks the user to type name/description. TASK-005 requires GitHub URL as the only required create field; name derived from the repository segment; invalid URL → localized validation error.

### 2. Project Root hierarchy (TASK-003)

| Concept | Path | Reality |
| --- | --- | --- |
| Root pointer | `LearningPass.projectRootNodeId` in [`types.ts`](../../src/domain/types.ts) | Sole structural Project Root |
| Ensure root | [`ensureProjectRoot`](../../src/domain/operations.ts) | Creates open node with `question = project.name` |
| Core questions | [`addCoreQuestion`](../../src/domain/operations.ts) | Requires Root; attaches as children; limit on `root.childIds.length` |
| Close guard | [`convergence.ts`](../../src/domain/convergence.ts) | Closing Root requires all direct children closed |
| Metadata sync | [`updateProjectMetadata`](../../src/domain/operations.ts) | Name change writes Root `question` |
| Tree VM | [`tree-view-model.ts`](../../src/application/selectors/tree-view-model.ts) | `isProjectRoot`; UI `data-project-root` |
| Forward migration | [`hierarchy-migration.ts`](../../src/application/hierarchy-migration.ts) | Flat roots → Project Root on semantic load; persists when migrated |

**Gap:** Canvas still renders a non-question Project/Root node. Top-level learning questions must have `parentId` unset and belong to the project only via `projectId` / pass membership (`rootNodeIds`).

### 3. Project Details

| Surface | Reality |
| --- | --- |
| Edit Project | Sidebar-inline form (`project-edit-form`); menu `sidebar.edit` |
| Metadata storage | `LearningProject.name` / `source` / `description` on DomainSnapshot |
| Description as node | Not a Question today (good); only name was mirrored onto Root |

**Gap:** No product-named **项目详情 / Project Details** surface. Edit exists but is framed as form editing, not project-level details chrome.

### 4. Question card and double-shell

[`LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) is already a **single** `.learning-node` surface (question, goal as `.node-meta`, stack rail, blocked pip, recommended badge, chat icon). No outer/inner DOM shells exist.

**Gaps vs TASK-005 card:**

- No derived child count or completion progress
- Goal shown as default meta (often noisy)
- No on-card add-child action
- Chat exists on-card (TASK-001) — keep
- `data-project-root` / Root styling must go after flatten

### 5. Learning-start ceremony and details panel (clarification)

| UI | Path | Leak |
| --- | --- | --- |
| Start Learning / Enter Question | [`NodeActions`](../../src/ui/contextual/NodeDetails.tsx) via [`activateLabelFor`](../../src/application/selectors/action-availability.ts) | Primary activate CTA |
| Park / Resume | same | Learning-session controls |
| Return to parent | `action-return-to-parent` | Duplicates tree navigation |
| Open Chat in details | `chat-open` in `NodeActions` | Duplicates node chat |
| Add child in details | [`ChildAuthoringSection`](../../src/ui/inspector/ChildAuthoringSection.tsx) | Belongs on the node |
| Lifecycle copy | `lifecycle.open` → zh **待开始**; `lifecycle.active` → **学习中** | sr-only on canvas but still product language in details |

Domain still has `open/active/parked/closed`, Active Stack, and `createBlockingChild` requiring `parent.lifecycle === "active"` ([`operations.ts`](../../src/domain/operations.ts), [`ChatHost`](../../src/ui/chat/ChatHost.tsx) proposal accept).

**Clarification win:** Node = interaction surface. Details panel = knowledge deposition (达成条件 + 心得). Do not require activate to chat or add children. Do not expose Start Learning / 未开始·学习中 as user-facing flow. Prefer `createChild` (no active required) for user add-child and default AI proposal accept.

User-facing completion for this UX: **incomplete (default, usually unlabeled) vs completed** — derived from real tree/completion data, not a synthetic learning-session lifecycle. Domain may retain richer lifecycle internally where needed for close/park invariants, but those must not leak into primary UI.

### 6. Locale and generation

| Path | Locale? |
| --- | --- |
| UI `t()` / shell switch | Yes — [`messages.ts`](../../src/ui/i18n/messages.ts) parity for chrome |
| [`runProjectLearningBootstrap`](../../src/framework/bootstrap.ts) | **No** — English `guidedQuestions` templates |
| [`defaultDefinitionOfDone`](../../src/framework/contract.ts) | **No** — English |
| [`stub-provider.ts`](../../src/ai/stub-provider.ts) | **No** — English proposals/answers; `ChatCompleteRequest` has no locale |
| `ChatHost` | Locale for chrome/errors only; not passed to `provider.complete` |

**Gap:** Complete `zh-CN` requires threading `workspace.shell.locale` into bootstrap and AI generation. Switching locale must not rewrite already-persisted Domain questions.

### 7. Edges and layout

TASK-001 [`edge-routing.ts`](../../src/ui/tree/edge-routing.ts) + [`computeLayout`](../../src/ui/tree/layout.ts) already support multi-child edges and first-layer horizontal layout when `rootNodeIds` are flat. No new routing engine required once Project Root is removed.

## Design decisions

### A. URL-only create; derive name

- Create form required field: **GitHub Repository URL only**.
- Validate with `parseGitHubSource`; clear localized error on invalid URL.
- `name = parsed.repo` via existing `resolveProjectName({ source })`.
- Do not collect description at create time.
- Optional GitHub metadata fetch failure must not block create (already true).
- Project Details / edit still allow name, URL, and description after create.

### B. Flatten Project Root (reverse TASK-003)

Target shape:

```text
pass.rootNodeIds = [Q1…Qn]     // top-level Questions
Qi.parentId = undefined
pass.projectRootNodeId = undefined
// no Project Root in nodes
```

**Domain / application:**

- Restore `addCoreQuestion` to append open nodes to `rootNodeIds` with limit on `rootNodeIds.length` (pre–TASK-003 contract).
- Remove bootstrap `ensureProjectRoot` step.
- `updateProjectMetadata`: metadata only (no Root `question` sync).
- Drop `ProjectRootRequired` / `ProjectRootChildrenOpen` paths; remove `isProjectRoot` from tree VM / `data-project-root`.
- `isEmptyFirstLayer` / core-question authoring: based on `rootNodeIds`.
- Leave `completePass` and Frontier `placement: root` as flat-root semantics. Do not invent a new mastery/learning-session machine.

**Migration** (idempotent, semantic load path; replace or invert [`migrateSnapshotHierarchy`](../../src/application/hierarchy-migration.ts)):

1. If no usable `projectRootNodeId` → no-op.
2. Else: former children become `rootNodeIds` (order preserved); clear each child’s `parentId`; delete Root node; clear `projectRootNodeId`.
3. Strip Root from `activeStack` / `currentFocusNodeId` if present; if focus was Root, focus first remaining root or clear.
4. Persist migrated snapshot (same pattern as TASK-003).
5. Preferences: drop `nodePositions[projectRootId]` in a **separate** reconcile pass (do not mutate layout inside semantic parse).
6. Conversations keyed by Root node id may be best-effort pruned for that node key only when flattening that project; never touch other projects’ data.

Do not silently discard user questions. Existing Project-Root-centric tests/e2e rewrite to flat roots.

### C. Project Details surface

- Product entry: sidebar project menu + chrome near selected project title → **项目详情 / Project Details**.
- Shows and edits: name, GitHub URL, description (reuse edit form fields; promote `project.editTitle` / localized Details copy).
- Not a graph node; repository description never becomes a Question.
- Replaces “Edit Project” as the user-facing name for this surface.

### D. One Question = one card; node is the interaction surface

- Keep single `.learning-node` surface; do not introduce outer/inner shells.
- Card content priority:
  - Question title (`question`)
  - Optional short context only when useful (prefer `summary`; do not default to noisy goal)
  - Derived child count / progress line
  - Chat action
  - Add-child action
  - Simple completion affordance where applicable (incomplete default vs completed mark)
- Soften stack-rail / lifecycle chrome in primary UI (lifecycle may remain domain-backed / sr-only where needed for a11y during transition, but must not present 开始学习 / 未开始 / 学习中 ceremony).
- **Remove** Start Learning / Enter Question / Park / Resume / Return-to-parent as primary details actions.

### E. Direct chat, direct children, details = knowledge deposition

**Node (interaction):**

- Preserve TASK-001 `openChatForNode` (focus + open chat, no inspector side-effect).
- **Add child on card** → lightweight authoring (inline popover or equivalent) calling **`createChild`** (non-blocking; parent need not be active; reject only if parent closed).
- **AI proposal accept (default)** → `createChild` under the current Question (real graph edge). Do not require activate; do not force Frontier. Frontier destination may remain as a secondary “send to frontier” control if already present; primary accept is direct child.

**Child count / progress** (derived in [`tree-view-model.ts`](../../src/application/selectors/tree-view-model.ts)):

```text
childCount = node.childIds.length
completedCount = children with lifecycle === "closed"
progressPercent = round(completedCount / childCount * 100)  // only if childCount > 0
```

UI: show localized `N 个子问题 · 已完成 P%` when `childCount > 0`; leaves omit or use `暂无子问题` — never force `0 · 0%`.

**Details panel (knowledge deposition only):**

| Keep / emphasize | Remove from details |
| --- | --- |
| 达成条件 (Definition of Done / criteria) | 聊聊这个问题 / Open Chat |
| 心得 (learning summary / notes) | 添加子问题 / ChildAuthoringSection |
| Minimal supporting metadata only if useful | 开始学习 / 进入问题 / 暂停 / 继续 |
| Simple Complete when readiness allows (maps to existing close when criteria+summary satisfied) | 返回上一问 / Return to parent |

Product boundary:

> Node = interaction surface. Detail panel = knowledge deposition surface.

Domain `activateNode` / Active Stack may remain for internal invariants where still required by close/park paths, but must not be a required user prelude to chat or add-child, and must not appear as Start Learning ceremony in primary UI.

### F. Complete zh-CN generation

- Thread `workspace.shell.locale` into `bootstrapLearningProject` / `runProjectLearningBootstrap` and `ChatCompleteRequest`.
- Dual templates in framework bootstrap + DoD defaults for `zh-CN` / `en-US` (style aligned with requirement examples such as “这个项目主要解决什么问题？”).
- Stub AI answers/proposals honor `request.locale` (instruction intent: answer and generate questions in Chinese; technical terms may keep English).
- Switching locale does **not** rewrite persisted Domain questions.
- UI chrome already largely localized; extend keys for Details, card meta, URL validation, on-card add-child, completion copy, and details-panel 达成条件 / 心得 labels.

### G. Preserve edge routing

- No change to TASK-001 edge-routing contract; multi-child edges + live geometry remain.
- Auto-layout for new flat first-layer stays via empty `nodePositions` + `computeLayout`.

## Layering

| Layer | Change |
| --- | --- |
| Domain | Flatten root model; restore flat `addCoreQuestion`; remove Project Root ops/guards; metadata without Root sync |
| Application | Bootstrap without Root; inverse hierarchy migration; tree VM child/progress; drop `isProjectRoot` |
| Framework / AI | Locale-parameterized templates + stub provider |
| Workspace | Create URL validation path; preference reconcile for deleted Root positions; Details via existing metadata update |
| UI | URL-only create; Project Details; Question card meta/actions; demote/remove learning-start ceremony; details = 达成条件 + 心得; proposal accept → `createChild`; i18n |
| Tests | Domain flatten/migration; bootstrap zh-CN; UI create/details/card/panel; e2e first-screen Questions-only |

## Implementation order (after `plan_approved=true` only)

1. Domain flatten + inverse migration + unit tests (no data loss).
2. Bootstrap / authoring / metadata / fixtures / demo-tree updates.
3. Locale into framework + stub AI + tests.
4. Create form URL-only + Project Details surface + i18n.
5. LearningNode card: meta, add-child, completion cue; strip Start Learning / redundant details actions; details panel → 达成条件 + 心得; proposal accept → `createChild`.
6. E2E: create → Questions only → Details → node chat → node add-child → zh-CN questions; regression on chat/persistence/edges/TASK-004 lifecycle.

## Tests to add after approval

### Domain / migration

- Flatten: Root + children → flat `rootNodeIds`; children lose `parentId`; Root node gone; idempotent; reload stable.
- Focus/stack: Root removed from `activeStack` / focus; first remaining root or clear.
- `addCoreQuestion` without Root; limit on `rootNodeIds.length`.
- `updateProjectMetadata` does not create/sync a Root node.
- Conversations/layout for former children preserved; Root position key dropped on preference reconcile.

### Create / Details / canvas

- URL-only create success; invalid URL localized error; name = repo segment.
- Canvas: no `data-project-root` / Project Root node; first screen = top-level Questions.
- Project Details shows name, URL, description; description is not a Question node.

### Node / details interaction (clarification ACs)

- Chat available from Question node without activate.
- Add-child available from Question node; creates real edge via `createChild`.
- AI proposal accept → direct child without `parentNotActive` ceremony.
- Card shows child count/progress when children exist; leaf not `0 · 0%`.
- Details panel has no Open Chat, Add Child, Start Learning, Park/Resume learning-session controls, or Return-to-parent.
- Details panel primarily exposes 达成条件 and 心得.
- No user-facing 开始学习 / 未开始 / 学习中 required to use a Question.

### Locale

- Given `locale: "zh-CN"`, bootstrap questions/goals/DoD are Chinese templates.
- Stub proposals/answers Chinese when locale is zh-CN.
- Locale switch does not rewrite existing authored/generated Domain content.

### Regression (must stay green)

Edge routing, conversation persistence, archive/restore/delete (TASK-004), product empty workspace, import boundaries, existing localization chrome tests.

## Non-goals

- Real LLM provider implementation
- API Key settings / provider-model selection UI
- New complex mastery / learning-session architecture
- Deep GitHub code analysis
- A new milestone
- Auto-translating or overwriting existing user-authored content on locale change
- Bulk redesign of unrelated inspector evidence tooling beyond the details-panel scope above

## Planning gate

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Clarification addendum ready | true |
| Canonical plan written | this file |
| Plan approved | false — awaiting ChatGPT plan review |
| Implementation | blocked until `plan_approved=true` |
| Acceptance approved | false |
| Next expected actor | chatgpt (plan review) |
