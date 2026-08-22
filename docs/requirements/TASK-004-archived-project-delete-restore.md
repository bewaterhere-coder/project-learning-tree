---
task_id: TASK-004
title: Archived Project Restore and Permanent Delete
repository: bewaterhere-coder/project-learning-tree
task_ref: task/TASK-004-archived-project-delete-restore
integration_ref: main
pr:
  number: 22
  head_ref: task/TASK-004-archived-project-delete-restore
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
  plan: ../plans/TASK-004-plan.md
---

# TASK-004 — Archived Project Restore and Permanent Delete

## Goal

Complete the project lifecycle so users can clean up old projects instead of accumulating an ever-growing archived list.

Target lifecycle:

```text
Active
  ↓ Archive
Archived
  ├─ Restore → Active
  └─ Delete permanently → Removed
```

Permanent deletion is only available for archived projects. Active projects must be archived first.

## Current problem

The product supports project archiving, but archived projects can accumulate indefinitely. Users need two explicit choices for archived projects:

- Restore the project back to Active;
- Permanently delete the project and all project-scoped durable state.

The delete path must be destructive, explicit, persistent, and leave no invalid selected-project reference or orphaned project-scoped data.

## Expected behavior

### 1. Active projects cannot be permanently deleted directly

Active project UI must not expose a direct permanent-delete action.

Required lifecycle:

```text
Active → Archive → Delete permanently
```

This is a product safety boundary, not merely a visual preference.

### 2. Archived projects expose Restore and Delete permanently

Each archived project must provide both actions:

```text
Restore
Delete permanently
```

The exact control may be inline buttons or a menu, but the destructive action must be clearly distinguishable.

### 3. Restore preserves the complete project

Restore changes the existing project from archived to active without recreating it.

Preserve at minimum:

- Project ID;
- project metadata;
- Project Root Node and all Learning Nodes;
- semantic parent/child hierarchy;
- node lifecycle / learning state;
- criteria and learning progress;
- conversation state;
- project-scoped layout/preferences and bindings where currently persisted;
- bootstrap/evidence metadata.

Do not reset or regenerate the project on restore.

Keep the current lifecycle model based on:

```text
archived: boolean
```

Do not reintroduce `archivedAt` or add a new lifecycle state machine unless the existing architecture proves it necessary and the Plan explicitly justifies it.

### 4. Permanent delete removes the project, not just hides it

`Delete permanently` must remove the archived ProjectWorkspace from semantic workspace state.

It must also delete or clean up every durable record that is scoped exclusively to that project, according to current store ownership.

Inspect the current architecture before implementation and account for at least:

- semantic ProjectWorkspace / Domain snapshot;
- nodes and hierarchy contained by that project;
- project-scoped conversation records;
- project-scoped preferences/layout/bindings when keyed independently of the semantic record;
- any bootstrap/evidence state;
- any project-indexed UI/session state that would otherwise become orphaned.

Do not invent a broad global purge abstraction unless required by existing store boundaries.

### 5. Delete requires explicit confirmation

Clicking the destructive action must open a confirmation dialog before mutation.

The dialog must identify the project by name and explain that deletion is irreversible and includes the learning tree, conversations, and learning progress.

Expected meaning:

```text
Delete "<Project Name>"?

This will permanently delete the project,
its learning tree, conversations and learning progress.

This action cannot be undone.
```

Actions:

```text
Cancel
Delete permanently
```

`Delete permanently` must use the product's destructive visual treatment.

No single-click immediate deletion.

### 6. Selection and binding cleanup

Deletion must never leave references to a missing project.

At minimum defend against:

```text
selectedProjectId === deletedProjectId
```

After deletion, resolve to the current workspace contract:

- a valid fallback project if that is already the canonical behavior; or
- `selectedProjectId = null`.

Also clear or prune any project-keyed UI/conversation/binding state that would otherwise point to the deleted project.

Do not clear state belonging to other projects.

### 7. Deleting the final project enters Product Empty Workspace

If no active or archived project remains after deletion, the product must enter the existing Product Empty Workspace.

Required result:

```text
selectedProjectId = null
```

Do not create a Demo Project fallback and do not repopulate deleted data.

### 8. Persistence boundary

Permanent delete is a semantic mutation and must be persisted explicitly.

After:

```text
Archive → Delete permanently → reload application
```

the project must remain absent.

Preserve the existing persistence contract:

- semantic writes occur on explicit semantic mutations;
- preference/layout writes remain separate;
- do not introduce broad `useEffect(() => saveSemanticWorkspace(workspace), [workspace])` autosave.

If project-scoped conversation or preference stores are separate, deletion must update those stores through their existing ownership boundaries.

## Architecture boundary

Preserve current layering and store ownership:

```text
Domain/application -> project lifecycle semantic mutation
workspace           -> multi-project coordination + selected project
conversation        -> project/node conversation persistence
preferences         -> project-scoped layout/UI state
ui                  -> archive list, restore/delete controls, confirmation dialog
```

The Plan must inspect actual current ownership before choosing cleanup calls.

Do not make React components directly manipulate raw persistence storage if lifecycle operations already have application/workspace command paths.

## Acceptance criteria

### A. Restore archived project

Given a project containing nodes, edges/hierarchy, conversations, learning progress, and saved layout:

```text
Archive → Restore
```

Pass when:

- the same Project ID returns to Active;
- metadata is preserved;
- node/root IDs and hierarchy are unchanged;
- conversations and progress remain available;
- saved layout/preferences are not reset merely because of restore.

### B. Delete archived project

```text
Archive → Delete permanently → confirm
```

Pass when:

- project disappears from Archived Projects;
- project does not appear in Active Projects;
- project semantic data is removed;
- project-scoped conversation/preferences/binding records are removed or pruned according to their store ownership;
- other projects remain unchanged.

### C. Cancel destructive confirmation

```text
Archive → Delete permanently → Cancel
```

Pass when nothing is deleted or mutated.

### D. Reload after deletion

```text
Delete permanently → reload application
```

Pass when the deleted project does not reappear.

### E. Delete final project

Delete the only remaining archived project.

Pass when:

```text
selectedProjectId = null
```

and Product Empty Workspace renders without demo fallback.

### F. Active project safety

Pass when an Active Project does not expose direct permanent deletion; the user must archive it first.

## Required tests

At minimum cover:

### Application / Workspace

- archive → restore preserves project identity and complete semantic snapshot;
- deleting an archived project removes only that ProjectWorkspace;
- deletion handles `selectedProjectId` safely;
- deleting the final project yields empty workspace state;
- semantic persistence is written on delete;
- restore/delete do not mutate unrelated projects.

### Cross-store persistence

Inspect current project-keyed stores and cover whichever exist:

- conversation records for deleted project are removed/pruned;
- project-scoped preferences/layout/bindings are removed/pruned when independently stored;
- reload cannot resurrect deleted project or stale project-scoped records.

### UI / E2E

Exercise the real flow:

```text
Create Project
→ Archive
→ Archived Projects
→ Restore
```

and:

```text
Create Project
→ Archive
→ Delete permanently
→ Cancel
→ Delete permanently
→ Confirm
→ reload
```

Assert visible lifecycle state, confirmation behavior, persistence, and Product Empty Workspace for last-project deletion.

## Non-goals

Do not expand this task into:

- bulk delete;
- trash/soft-delete retention period;
- undo after permanent delete;
- cloud sync redesign;
- general persistence architecture rewrite;
- changing active-project archive semantics unrelated to this requirement;
- replacing `archived: boolean` with a new lifecycle model without a demonstrated blocker.

## Cursor Gate

Canonical implementation plan: `docs/plans/TASK-004-plan.md` (revised for PR #22 fail-closed delete orchestration).

Development stage is `plan_review`. Next expected actor: ChatGPT (Plan re-review).

Cursor must **not** implement product code until Plan review records `plan_approved=true`. Keep all further work on this same task branch and PR.