---
task_id: TASK-004
title: Archived Project Restore and Permanent Delete
status: plan_review
requirement: ../requirements/TASK-004-archived-project-delete-restore.md
---

# TASK-004 Plan — Archived Project Restore and Permanent Delete

This is the canonical implementation plan for TASK-004. It records code evidence for the requirement’s planning questions and the smallest change that satisfies the acceptance criteria.

**Gate:** `plan_review` — revised per PR #22 blocking finding; awaiting re-review (`plan_approved=true`).

Implementation of product code is forbidden until that gate is recorded after Plan review. Writing this file is not Done for the task.

## Review revisions (PR #22)

One blocking finding addressed in this revision:

1. **Fail-closed destructive cleanup** — Workspace delete returns a positive `{ workspace, deleted }` (or equivalent removed-project identity). App orchestration runs semantic write, conversation prune, and preference/binding cleanup **only when `deleted === true`**. Active or missing `projectId` must leave semantic, conversations, and preferences entirely unchanged. Orchestration-level tests must prove an active project ID cannot destroy cross-store data.

## Goal

Complete the project lifecycle so archived projects can be restored or permanently deleted:

```text
Active → Archive → Archived
                  ├─ Restore → Active
                  └─ Delete permanently → Removed
```

Preserve:

- `archived: boolean` as the project lifecycle model (no `archivedAt`, no new state machine)
- `DomainSnapshot` as semantic source of truth
- explicit semantic writes via `commit(next, true)` (no broad semantic autosave `useEffect`)
- preference/layout persistence as a separate store
- Conversation ownership in the conversation store
- Product Empty Workspace when no projects remain (no demo fallback)
- Active projects must archive before permanent delete (product safety boundary)

## Current-state findings

```text
UI ProjectSidebar (active menu / archived menu)
  → App.commit(archiveProject | restoreProject, true)
  → workspace/session.{archive,restore}Project
  → saveSemanticWorkspace (semantic: true)
  → useEffect → saveWorkspacePreferences (layout always)

ConversationStore (plt.conversation.v1)
  → keyed by node:{projectId}:{nodeId} | project:{projectId}
  → no project prune API today
```

### 1. Project lifecycle model

| Concept | Reality |
| --- | --- |
| Active / Archived | `ProjectWorkspace.archived: boolean` in [`src/workspace/types.ts`](../../src/workspace/types.ts) |
| Deleted / Removed | **Not modeled** — project is simply absent from `workspace.projects` |
| Node lifecycle | Separate domain concern (`open/active/parked/closed`) — unrelated |

Evidence in [`src/workspace/session.ts`](../../src/workspace/session.ts):

- `createWorkspace` / `createWorkspaceProject` → `archived: false`
- `archiveProject` → sets `archived: true`; if selected, picks next active or `null` via `nextActiveProjectId`
- `restoreProject` → sets `archived: false`; if `selectedProjectId === null`, selects the restored project
- `selectProject` rejects archived projects
- **No** `deleteArchivedProject` / `permanentlyDeleteProject`

Keep `archived: boolean`. Permanent delete is removal from the projects array, not a third lifecycle flag.

### 2. Restore already preserves identity

`restoreProject` flips `archived` on the **same** `ProjectWorkspace` object identity path: same `projectId`, same `snapshot` reference, same `layout`, same `bootstrap`. It does not recreate or regenerate the project.

Existing coverage:

- [`tests/workspace/project-lifecycle.test.ts`](../../tests/workspace/project-lifecycle.test.ts) — archive/restore, last-archive → `null` selection
- [`tests/workspace/semantic-persistence.test.ts`](../../tests/workspace/semantic-persistence.test.ts) — archive flag round-trip; semantic writes on create/archive/restore/select
- [`tests/ui/product-workspace.test.tsx`](../../tests/ui/product-workspace.test.tsx) — UI archive/restore; rehydrate archived; empty after all archived
- [`e2e/specs/project-lifecycle.spec.ts`](../../e2e/specs/project-lifecycle.spec.ts) — create → reload → archive → restore

**Plan implication:** Restore is largely done. Implementation work is verification + any missing identity/preservation assertions called out in AC-A; do not redesign restore.

### 3. Permanent delete is missing end-to-end

| Layer | Gap |
| --- | --- |
| Workspace | No remove-from-`projects` operation |
| Conversation | No prune-by-`projectId` API; `saveRegistry` no-ops when conversations map is empty ([`store.ts`](../../src/conversation/store.ts) lines 46–50) — would leave stale `plt.conversation.v1` data if the last conversations are deleted |
| Preferences | No dedicated prune; `serializeWorkspacePreferences` only writes keys for current `workspace.projects`, and App autosaves preferences on every workspace change |
| UI | Archived menu exposes **Restore only**; no Delete permanently; no confirmation dialog primitive under [`src/ui/primitives/`](../../src/ui/primitives/) (only `Button`, `EmptyState`, `Field`, `Menu`) |
| i18n | `sidebar.archive` / `sidebar.restore` / `sidebar.archivedTitle` exist; **no** delete/confirm copy |
| Tests | No unit/UI/E2E coverage for delete, cancel, cross-store cleanup, or reload-after-delete |

Active menus already expose Archive only (`project-archive-*`) — AC-F holds today by absence and must stay true when delete is added.

### 4. Persistence ownership (inspected)

| Store | Key | Owner | Project scoping |
| --- | --- | --- | --- |
| Semantic | `plt.workspace.semantic.v1` | [`src/workspace/persistence/semantic.ts`](../../src/workspace/persistence/semantic.ts) | `projects[]` entries: `{ projectId, archived, snapshot, bootstrap? }` + `selectedProjectId` |
| Preferences | `plt.workspace.layout.v2` | [`src/workspace/preferences.ts`](../../src/workspace/preferences.ts) | `projects: Record<projectId, ProjectWorkspaceLayout>` including `nodePositions`, viewport, chat chrome, `chatBinding` |
| Conversation | `plt.conversation.v1` | [`src/conversation/store.ts`](../../src/conversation/store.ts) | Registry map keyed by [`conversationKey`](../../src/conversation/identity.ts) |
| Theme hint | `plt.workspace.theme` | preferences | Shell-level only — **not** project-scoped |

Semantic write path today ([`App.tsx`](../../src/ui/App.tsx)):

```text
commit(next, semantic: boolean)
  → if semantic: saveSemanticWorkspace(storage, next)
  → setWorkspace(next)
useEffect([workspace]) → saveWorkspacePreferences(storage, workspace)
```

Archive/restore already call `commit(..., true)`. Successful delete must do the same **only when** the workspace layer reports `deleted === true` (see Decision C).

### 5. Selection and empty workspace

- `selectedProjectId: ProjectId | null` is first-class.
- Archiving the last active project already yields `null` → Product Empty Workspace (`workspace-empty`).
- Boot with missing/corrupt semantic → `createWorkspace([])` (e2e: [`boot-empty-workspace.spec.ts`](../../e2e/specs/boot-empty-workspace.spec.ts)).
- Archived projects are not selectable; `selectedProjectId` should not normally equal an archived id. Delete still defends with the same `nextActiveProjectId` fallback used by archive.

### 6. Archived Projects UI surface

[`ProjectSidebar.tsx`](../../src/ui/sidebar/ProjectSidebar.tsx):

- Active item menu: Archive only (`project-archive-*`)
- Archived pane when any archived exist; toggle `archived-toggle`; list `archived-list`
- Archived item menu: Restore only (`project-restore-*`, trigger `archived-actions-*`)
- Wired in App: `onArchiveProject` / `onRestoreProject` → `commit(..., true)`

`Button` already has `variant="danger"` for destructive treatment.

## Design decisions

### A. Keep `archived: boolean`; delete = remove ProjectWorkspace

Do not add `archivedAt`, soft-delete, trash, or a lifecycle enum.

Add workspace op that returns an explicit deletion outcome (not a bare workspace):

```text
deleteArchivedProject(workspace, projectId)
  → { workspace: LearningWorkspace; deleted: false }
  | { workspace: LearningWorkspace; deleted: true; projectId: ProjectId }
```

Contract:

1. If project missing or `archived !== true`: return `{ workspace` (same reference / unchanged), `deleted: false }`. Active projects cannot be permanently deleted via this op.
2. If archived: remove that entry from `workspace.projects` (snapshot, bootstrap, in-memory layout go with it) and return `{ workspace: next, deleted: true, projectId }`.
3. On successful delete, if `selectedProjectId === projectId`, set selection to `nextActiveProjectId(...)` or `null` (reuse existing helper).
4. Leave unrelated projects untouched (identity and snapshot references preserved).
5. On successful delete, clear `lastError` / `lastErrorCommand` like archive/restore.

Export from [`src/workspace/index.ts`](../../src/workspace/index.ts). No Domain or Application API required — project membership is a Workspace concern.

The `deleted` flag is the lifecycle-layer positive confirmation required by Decision C. UI visibility alone is not the safety boundary.

### B. Confirmation dialog before mutation

Clicking Delete permanently opens a confirmation dialog; mutation runs only on confirm.

Dialog meaning (i18n keys, both locales):

```text
Delete "<Project Name>"?

This will permanently delete the project,
its learning tree, conversations and learning progress.

This action cannot be undone.

[Cancel]  [Delete permanently]
```

UI contract:

- New lightweight confirm surface (prefer a small `ConfirmDialog` primitive under `src/ui/primitives/` using existing `Button` / danger variant — no new design system).
- Owned by App or ProjectSidebar as local React state; **no** domain/workspace mutation until confirm.
- Cancel closes dialog and mutates nothing (workspace, semantic, conversation, preferences unchanged).
- Confirm invokes delete orchestration once.
- Destructive button uses `variant="danger"`.
- Stable test ids, e.g. `project-delete-{id}`, `delete-confirm-dialog`, `delete-confirm-cancel`, `delete-confirm-submit`.

Active project menus must **not** gain a delete action.

### C. Cross-store cleanup is fail-closed on `deleted === true`

Orchestration lives in App (same place archive/restore are committed), not in React talking to raw `localStorage`.

**Required invariant** (enforced in orchestration, not only UI):

```text
active or missing projectId
→ no project removal
→ no semantic deletion write
→ no conversation prune
→ no preference/binding cleanup
```

Canonical confirm handler:

```text
onConfirmDelete(projectId):
  result = deleteArchivedProject(workspace, projectId)
  if result.deleted !== true:
    return   // fail-closed: no commit, no conversation prune, no preference mutation
  commit(result.workspace, true)                      // semantic write only after removal
  conversationStore.deleteForProject(result.projectId) // prune only the removed id
  // preferences: existing useEffect autosave drops the project key
  //   because serializeWorkspacePreferences only emits current projects
  //   — and only runs because commit updated workspace after deleted === true
```

Do **not** call `commit(..., true)` or `deleteForProject` when `deleted === false`. A UI bug, stale callback, test hook, or future caller that passes an active `projectId` must not destroy that project’s conversations or rewrite stores as if deletion succeeded.

#### Conversation

Add `deleteForProject(projectId)` on [`ConversationStore`](../../src/conversation/store.ts):

- Load registry; remove every entry whose `identity.projectId === projectId` (both `node:` and `project:` kinds).
- **Always persist** the resulting registry — including when empty.
- Fix / bypass the current `saveRegistry` empty no-op for this path (either make `deleteForProject` call `writeRegistry` directly, or change empty-registry persistence so delete cannot leave stale bytes under `plt.conversation.v1`).
- Callers must invoke this **only after** workspace reports `deleted === true`.

Do not invent a global purge abstraction.

#### Preferences / bindings

No separate prune helper required for successful delete: after a successful `deleteArchivedProject`, preference autosave rewrites `plt.workspace.layout.v2` without the deleted project key (and therefore without its `chatBinding` / layout).

On `deleted === false`, workspace must not be committed/updated, so preference autosave must not run as a side effect of the failed delete path. Tests must assert the preference key remains for an active target that was incorrectly asked to delete.

#### Semantic

`saveSemanticWorkspace` already serializes only remaining projects + `selectedProjectId`. No schema / version bump. Semantic write occurs only inside the `deleted === true` branch.

### D. Final-project delete → Product Empty Workspace

When the deleted project was the last remaining project (active or archived):

```text
projects: []
selectedProjectId: null
```

UI already renders `workspace-empty` for that state. Do not create a Demo Project. Do not repopulate deleted data on reload.

### E. Restore verification (no redesign)

Confirm and, if needed, extend tests so Archive → Restore preserves:

- same `projectId`
- metadata (`snapshot.project.*`)
- node/root IDs and parent/child hierarchy
- learning state / criteria / progress inside the snapshot
- conversation records (unchanged keys)
- layout/preferences / bindings
- bootstrap record

Restore must not regenerate nodes or clear conversations.

## Layering

| Layer | Change |
| --- | --- |
| Domain | None |
| Application | None |
| Workspace | `deleteArchivedProject` → `{ workspace, deleted, projectId? }`; export; selection fallback reuse |
| Conversation | `deleteForProject`; empty-registry persist on prune; invoked only after `deleted === true` |
| Preferences | Unchanged API; autosave rewrite only after successful workspace commit |
| UI | Archived menu Delete permanently; ConfirmDialog; i18n; fail-closed App orchestration |

## Implementation order (after `plan_approved=true`)

1. **Workspace op + unit tests:** `deleteArchivedProject` result shape; `deleted: false` for active/missing; selection safety; unrelated projects untouched; final delete → empty.
2. **Conversation prune:** `deleteForProject` with durable empty-registry write; unit tests for mixed multi-project registries.
3. **App orchestration (fail-closed):** confirm handler gates `commit` + conversation prune + preference side effects on `deleted === true`; verify preference autosave drops layout key only on success.
4. **UI:** ConfirmDialog primitive; archived menu Delete permanently; i18n (en-US / zh-CN); keep active menu Archive-only.
5. **Tests** below; typecheck / unit / existing e2e smoke; extend project-lifecycle e2e.

## Tests to add after approval

### Workspace / semantic

Extend [`tests/workspace/project-lifecycle.test.ts`](../../tests/workspace/project-lifecycle.test.ts):

- Given archived project, When `deleteArchivedProject`, Then `deleted: true` and removed from `projects`; other projects unchanged.
- Given active project, When delete op, Then `deleted: false` and workspace unchanged (same projects / selection).
- Given missing projectId, When delete op, Then `deleted: false`.
- Given `selectedProjectId` equals deleted id (defensive), Then fallback to next active or `null`.
- Given sole archived project deleted, Then `projects: []` and `selectedProjectId: null`.
- Archive → Restore preserves project id and snapshot identity (strengthen if needed for AC-A).

Extend [`tests/workspace/semantic-persistence.test.ts`](../../tests/workspace/semantic-persistence.test.ts):

- Successful delete results in semantic write without the project; reload does not resurrect it.
- Unrelated project semantic data unchanged.

### Conversation / preferences

Extend [`tests/conversation/store.test.ts`](../../tests/conversation/store.test.ts):

- `deleteForProject` removes node- and project-scoped conversations for that id only.
- After pruning the last conversations, storage no longer holds the deleted entries (empty registry persisted or key cleared — pick one and assert).

Preferences / bindings (workspace or UI test):

- After successful delete + preference save, `StoredWorkspacePreferences.projects[deletedId]` is absent; other project layouts remain.

### Orchestration fail-closed (required)

Add an App / product-workspace orchestration test:

- Given an **active** `projectId` (and seeded semantic + conversation + preference records for that project), When the confirm-delete orchestration path is invoked with that id, Then:
  - workspace projects still contain the active project;
  - semantic store still contains the project;
  - conversation records for that projectId remain;
  - preference/layout/binding for that projectId remain;
  - no `deleteForProject` side effect and no semantic deletion write occurred.

This proves the safety boundary is not UI-only.

### UI

Extend product-workspace / project-action-menu tests:

- Active menu has no permanent-delete control.
- Archived menu exposes Restore and Delete permanently.
- Cancel leaves project listed and stores unchanged.
- Confirm removes archived item; last-project path shows `workspace-empty`.

### E2E

Extend [`e2e/specs/project-lifecycle.spec.ts`](../../e2e/specs/project-lifecycle.spec.ts) (or adjacent spec):

```text
Create Project → Archive → Restore          (existing; keep green)
Create Project → Archive → Delete permanently → Cancel
  → assert still archived
→ Delete permanently → Confirm → reload
  → assert absent from active and archived
→ (last project) assert Product Empty Workspace, no demo
```

**Regression (must stay green):** `project-lifecycle`, `semantic-persistence`, `product-workspace`, `project-action-menu`, `pane-interaction`, `conversation/store`, `boot-empty-workspace`, `import-boundary`.

## Non-goals

- Bulk delete
- Trash / soft-delete retention / undo
- Cloud sync redesign
- General persistence architecture rewrite
- Changing active-project archive semantics unrelated to this requirement
- Replacing `archived: boolean` with a new lifecycle model
- Domain/Application APIs for project membership
- Broad semantic autosave `useEffect`

## Planning gate

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Canonical plan written | this file |
| Plan approved | false — revised; awaiting re-review |
| Implementation | blocked until `plan_approved=true` |
| Next expected actor | chatgpt (Plan re-review) |
