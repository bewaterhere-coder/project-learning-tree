---
task_id: TASK-006
title: Simplify Question Interaction and Details Panel
status: implementation
requirement: ../requirements/TASK-006-simplify-question-interaction-details.md
pr: 27
branch: task/TASK-006-simplify-question-interaction-details
---

# TASK-006 Plan — Simplify Question Interaction and Details Panel

This is the canonical implementation plan for TASK-006. It records code evidence for the requirement’s planning questions and the smallest change that satisfies the acceptance criteria.

**Gate:** `acceptance` — implementation complete on PR #27; awaiting ChatGPT acceptance review (`acceptance_approved=true`).

## Review revisions (PR #27 plan review)

Blocking finding addressed in this revision:

1. **Reject Decision A (`implicit activate`)** — Hidden `activateNode()` before Complete is not a harmless bridge. `activateNode` → `applyNewStack(pathFromRoot(...))` demotes off-path actives to `open`, marks the new root→target path `active`, and **replaces** `pass.activeStack`. Completing Question B while Question A’s path is active would silently rewrite A’s stack/lifecycles. That reintroduces the learning-state machine as a side effect after the UI stops exposing it.

**Replacement:** Define completion as user-facing `not completed → completed` mapped to Domain `* → closed` **without** requiring Active Stack membership. Make the smallest Domain/Application change to `closeNode` / close-readiness / lifecycle legality so a Question that satisfies convergence can complete from `open` (and from `active` when already on stack, with existing leaf-pop only). **Never** call `activateNode` as a Complete precondition.

**`createBlockingChild`:** Re-evaluated separately. Node Add Child is **ordinary `createChild` only**. TASK-006 does **not** keep a blocking-authoring checkbox; no hidden activate for blocking authoring.

**Required regression:** Completing Question B must not mutate lifecycle / `activeStack` of an unrelated Question A path.

## Goal

Make the product model match:

```text
Question Node = primary interaction surface
Question Details = knowledge / reflection surface (达成条件 + 心得)
```

Remove explicit Start Learning / learning-state ceremony from the primary UI. Users click a Question, chat or add children from the node, and use Details only to capture understanding — not to operate a second action dashboard.

Preserve:

- Contextual node chat + conversation persistence
- Real Question → child Question graph edges
- `DomainSnapshot` as semantic source of truth
- Preference store denylist for lifecycle / stack / focus (unchanged)
- `activeStack` / `activateNode` as optional Domain machinery for other paths — **not** as the user Complete bridge
- No new “learning started” persisted flag
- TASK-006 identity independent of TASK-005 (PR #26)

**Explicit Domain change in scope:** smallest relaxation of `closeNode` / close-readiness / lifecycle legality so completion is `未完成 → 已完成` without Active Stack entry (Decision A′).

## Current-state findings

```text
Tree click → focusNode + open inspector
Node chat icon → focusNode + openChat (follow-focus)
Details NodeActions → activate / park / resume / close / return / chat
Details Structure → ChildAuthoringSection (only add-child surface)
Details Record (collapsed) → DoD list + Evidence + Summary (read-only)
Writes to DoD/summary today → chat proposals → addCriterion / setNodeSummary
```

### 1. Question node (`LearningNode.tsx`)

| Capability | Today |
| --- | --- |
| Click / focus | Yes — `TreeCanvas` → `onFocusNode` |
| Contextual chat | Yes — icon button `node-chat-*` → `openChatForNode` |
| Add child | **No** |
| Start / park / resume / close | **No** |
| Child count / progress | **No** (only unresolved-blocker pip) |
| Lifecycle badge | Present but `visually-hidden`; CSS still uses `lifecycle-*` |
| Completion mark | Closed styled via CSS only |

Evidence: [`src/ui/tree/LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx), wired in [`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) / [`App.tsx`](../../src/ui/App.tsx). View model [`tree-view-model.ts`](../../src/application/selectors/tree-view-model.ts) has lifecycle / blocker flags but **no** `childCount` / progress fields.

### 2. Details panel (`NodeDetails.tsx`) — ceremony inventory

| Section | Content | TASK-006 fate |
| --- | --- | --- |
| Identity | Question + Goal | Keep minimal heading/identity (helps orientation) |
| Status | Lifecycle label (`待开始` / `学习中` / …), blocked count | **Remove** as primary ceremony |
| Actions (`NodeActions`) | Start learning / Enter question, Park, Resume, Close, Return to parent, Chat | **Remove** Start/Park/Resume/Return/Chat. Relocate Complete to node (see Decision B) |
| Structure | Child list + Add sub-question + blocking toggles | **Remove** add-child from Details; relocate to node. Child list optional omit (tree already shows structure) |
| Learning record `<details>` | Target depth, DoD, Evidence, Summary | **Promote** DoD → `达成条件`, Summary → `心得` as primary panel content; demote/hide engineering extras |

### 3. Domain vs UI — what can be removed without Domain redesign

These are **UI-only ceremony** today and can be removed from primary surfaces without changing Domain types or ops:

| UI concept | Selector / keys | Domain behind it |
| --- | --- | --- |
| `开始学习` / `进入问题` button | `canActivate`, `activateLabel` in [`action-availability.ts`](../../src/application/selectors/action-availability.ts) | `activateNode` — keep callable internally |
| Park / Resume buttons | `canPark` / `canResume` | `parkNode` / `resumeNode` — keep |
| Return to parent | `canReturnToParent` | `returnToParent` — keep; tree navigation replaces UI |
| Details Chat button | `chat.open` | Same `openChat` as node |
| Details Add sub-question | `ChildAuthoringSection` | `createChild` / `createBlockingChild` |
| Visible lifecycle Status + node badge text | `lifecycleMessageKey` / `inspector.lifecycle` | `LearningNode.lifecycle` field remains |

**No new persisted “learningStarted” flag exists or is needed.** Semantic snapshot already persists `lifecycle` + `activeStack` + `currentFocusNodeId` ([`semantic.ts`](../../src/workspace/persistence/semantic.ts)). Preferences already exclude those keys.

### 4. Domain constraints — completion needs a small Domain change

| Operation | Domain gate today | TASK-006 stance |
| --- | --- | --- |
| `createChild` | Parent not `closed` | **Keep** — ordinary node Add Child; no activate |
| `createBlockingChild` | Parent must be `active` | **Out of node UX** — do not expose blocking checkbox; leave Domain op for other callers; **no** hidden activate |
| `closeNode` / close readiness | Must be `active` today | **Change** — allow complete when convergence/readiness is met **without** Active Stack membership (Decision A′) |
| Chat / focus / inspect | None | **OK** — click already sufficient |

Evidence today:

- [`closeNode`](../../src/domain/operations.ts) rejects unless `lifecycle === "active"` (lines ~938–944), then sets `closed`; only if the node is the **stack leaf** does it `activeStack.slice(0, -1)`.
- [`activateNode`](../../src/domain/operations.ts) calls `applyNewStack(pathFromRoot(...))`, which demotes off-path actives to `open` and **replaces** `activeStack` — unsafe as a Complete side effect.
- [`selectCloseReadiness`](../../src/application/selectors/close-readiness.ts) sets `allowed: node.lifecycle === "active" && canClose`.
- [`lifecycle.ts`](../../src/domain/lifecycle.ts) LEGAL table lists only `active → closed` via `"close"` (`isLegalTransition` is currently unused by ops but must stay consistent).

**Plan decision:** Explicit smallest Domain/Application change for completion (Decision A′). Do **not** bridge with hidden `activateNode`.

### 5. Mapping: `达成条件` / `心得`

| Product label (zh-CN) | Domain field | Current UI | Current write path |
| --- | --- | --- | --- |
| **达成条件** | `LearningNode.definitionOfDone: Criterion[]` | Details → Learning record → `inspector.dod` (“完成要求”) | Chat proposal → `addCriterion` (Details is read-only) |
| **心得** | `LearningNode.summary?: string` | Details → Learning record → `inspector.summary` (“学习总结”) | Chat proposal → `setNodeSummary`; close requires summary |

i18n today ([`messages.ts`](../../src/ui/i18n/messages.ts)): no keys for `达成条件` / `心得` / `已完成` as the preferred labels. Closest: `inspector.dod`, `inspector.summary`, `actions.close`, `lifecycle.closed`.

### 6. Overlap / conflict with TASK-005 (PR #26) — do not merge identities

| Topic | TASK-005 (PR #26) | TASK-006 (this PR #27) |
| --- | --- | --- |
| GitHub-URL-only create | **In scope** | **Out** (non-goal) |
| Remove Project/Root graph node | **In scope** | **Out** (non-goal) |
| Project Details surface | **In scope** | **Out** |
| One-card visual redesign | **In scope** | **Out** (broad visual redesign non-goal) |
| Remove Start Learning ceremony | Clarification addendum overlaps | **In scope (canonical for this PR)** |
| Node chat + add child | Overlaps | **In scope** |
| Details → 达成条件 / 心得 | Clarification overlaps | **In scope (canonical for this PR)** |
| Child count / progress on card | Explicit TASK-005 req | Light support if useful; not a full redesign |
| zh-CN completeness for generation | Broad | Only new/changed copy for this UX |

**Conflict handling:**

- Keep separate branches/PRs. Do not reuse TASK-005 commits or retitle this PR.
- Shared hot files: `LearningNode.tsx`, `NodeDetails.tsx`, `ChildAuthoringSection.tsx`, `messages.ts`, related UI tests.
- If TASK-005 merges first, rebase TASK-006 and re-apply only remaining gaps.
- If TASK-006 merges first, TASK-005 must not reintroduce Start Learning / Details action dashboard.
- Clarification doc on TASK-005 branch mirrors much of TASK-006 wording; **TASK-006 requirement on this branch remains authoritative for PR #27 acceptance.**

## Decisions

### A′. Direct completion — `未完成 → 已完成` without Active Stack

User-facing completion is binary:

```text
not completed  →  completed
(Domain open / parked / …)  →  (Domain closed)
```

It must **not** require entering `active` / rewriting `activeStack` first.

**Smallest Domain/Application change (explicit):**

1. **`closeNode`** — Allow close when convergence/`canClose` is true and the node is not already `closed`, including from **`open`** (primary TASK-006 path). Keep existing behavior for an already-`active` **stack leaf**: set `closed` and pop that leaf only (`activeStack.slice(0, -1)`). Do **not** call `activateNode` / `applyNewStack` inside Complete.
2. **`lifecycle.ts` LEGAL** — Add `open → closed` via `"close"` (and `parked → closed` via `"close"` if parked nodes would otherwise become a trap after Park UI is removed). Keep `active → closed`.
3. **`selectCloseReadiness`** — `allowed` must not require `lifecycle === "active"`; gate on convergence/`canClose` and not-already-closed (plus any existing Project Root close guards that still apply).
4. **Stack isolation invariant** — Completing Question B that is **not** on `activeStack` must leave `activeStack` and every unrelated node’s `lifecycle` unchanged (especially Question A’s path).
5. **No hidden activate** — Application Complete / node Complete command path must invoke `closeNode` (or a thin wrapper) only — never `activateNode` as a precondition.
6. **Park / Resume** — Remain Domain ops; remove from primary Details UI. Do not redesign stack UX in this task.
7. **No new persisted “learning started” flag.**

Existing Domain tests that assume “must activate before close” will be updated to the new contract; Active Stack bijection helpers remain for paths that still use activate.

### B. Complete / 已完成 lives on the Question node

- Move completion affordance to the Question card (label `已完成` in zh-CN; en-US “Mark complete” / “Completed” as appropriate).
- Enable when Decision A′ readiness says allowed (summary / 达成条件 / blocking-children convergence — **not** “is active”).
- Remove Close from Details `NodeActions` along with the rest of the action dashboard.
- Optional: compact unmet-readiness hint near the node control or under Details 心得/达成条件 — not a second navigation system.

### C. Add child on the node; remove from Details

- Add a node-level control (icon/button, `添加子问题`) that opens a small authoring affordance calling existing **`createChild` only**.
- **Do not** expose a blocking / “must resolve first” checkbox on the node in TASK-006.
- **`createBlockingChild`** stays in Domain for other callers (e.g. legacy tests, chat proposals that already require parent `active`); TASK-006 UI must not introduce hidden activate to support it.
- Remove `ChildAuthoringSection` (and Structure section) from Question Details so Details is not a duplicate authoring surface.
- Preserve graph edges via existing domain ops; no visual-only children.

### D. Details panel = knowledge / reflection surface

Primary visible content when a Question is focused:

1. Minimal identity (question text; goal only if it still aids understanding — do not grow into an action dashboard)
2. **达成条件** — list of `definitionOfDone` criteria; allow add/edit via existing `addCriterion` (and satisfaction if already supported without new Domain)
3. **心得** — editable `summary` via `setNodeSummary` (Details becomes a write surface, not chat-only)

Remove / stop exposing in Details primary flow:

- Start / Enter / Park / Resume / Return / Chat
- Structure / Add sub-question
- Prominent Learning status (`待开始` / `学习中`)
- Collapsed “Learning record” chrome that buries DoD/summary behind engineering labels
- Target depth / Evidence as primary sections unless a later requirement needs them; Evidence may remain secondary/collapsed only if close readiness still surfaces unmet evidence — prefer not expanding scope

### E. Lifecycle ceremony out of primary UI

- Stop rendering user-facing open/active/parked labels in Details Status and stop relying on visible “学习中” copy.
- Node may keep CSS hooks for closed/completed styling and for stack focus chrome if useful, but must not present Start/Active Learning as a required workflow.
- Header `active-stack` breadcrumb: treat as optional follow-up — if it still reads as “Current Learning Node” ceremony, hide or reduce in the same implementation pass; do not rebuild a second nav.

### F. i18n

Add/change zh-CN (and en-US counterparts) for:

| Key intent | zh-CN |
| --- | --- |
| DoD heading | 达成条件 |
| Summary heading | 心得 |
| Add child (node) | 添加子问题 |
| Complete | 已完成 |

Do not expose raw engineering terms (`Active`, `Learning State`, `Definition of Done`, `Frontier`, `Blocking`) in new primary copy.

### G. Out of scope (explicit)

Per requirement non-goals — do **not** do in TASK-006:

- GitHub project creation redesign
- Project/Root node removal
- Project metadata Details redesign
- Broad canvas visual system redesign / one-card visual overhaul beyond node action affordances
- LLM provider / API key work
- New mastery architecture
- Merging or closing TASK-005

## Implementation slices (after `plan_approved`)

Ordered for reviewability; each slice should leave tests green.

### Slice 1 — Details de-ceremony + label remap

- Strip `NodeActions` Start/Park/Resume/Return/Chat (and Close once Slice 3 lands; temporarily keep Close only if needed to avoid dead-end until node complete exists — prefer Slice 3 in same PR before acceptance).
- Remove Structure / `ChildAuthoringSection` from Details.
- Promote 达成条件 + 心得; wire `setNodeSummary` (and criterion add) from Details.
- Update i18n keys; hide Status lifecycle ceremony.

### Slice 2 — Node add-child (`createChild` only)

- Extend `LearningNode` / `TreeCanvas` / App command wiring with add-child control.
- Call `createChild` only; no blocking checkbox; no `createBlockingChild` from this UX.
- Reuse validation from [`validateChildDraft`](../../src/application/selectors/child-authoring.ts).
- Extend tree view model only if needed for child count (optional light metadata).

### Slice 3 — Domain direct complete + node Complete

- Domain: relax `closeNode` + LEGAL + `selectCloseReadiness` per Decision A′.
- Node-level Complete (`已完成`) calls close/readiness **without** `activateNode`.
- Domain unit tests for open→closed when convergence met; update tests that required activate-before-close.
- **Regression (required):** Given Question A on `activeStack`, When complete ready Question B (sibling/other branch, still `open`), Then B is `closed` and A’s path `lifecycle` values + `activeStack` are unchanged; `assertActiveBijection` still holds.

### Slice 4 — Tests + acceptance hardening

- Rewrite UI tests that assert `action-activate`, Details chat/add-child, lifecycle “学习中” in primary inspector.
- Keep / extend node-chat persistence tests.
- Add Given/When/Then coverage for: focus → chat; focus → add child; Details edits 心得; complete from `open` without Start Learning; no Details duplicate actions; A/B stack isolation on complete.

## Files likely to change

| Area | Paths |
| --- | --- |
| **Domain (explicit)** | `src/domain/operations.ts` (`closeNode`), `src/domain/lifecycle.ts` |
| Selectors | `src/application/selectors/close-readiness.ts`; `action-availability.ts` may shrink for UI |
| Node UI | `src/ui/tree/LearningNode.tsx`, `TreeCanvas.tsx`, related CSS |
| Details | `src/ui/contextual/NodeDetails.tsx`, unmount `ChildAuthoringSection` from Details |
| App wiring | `src/ui/App.tsx` (node complete / add-child commands — **no** activate-before-close helper) |
| i18n | `src/ui/i18n/messages.ts`, `labels.ts` if lifecycle keys drop from primary UI |
| Tests | Domain close/integrity tests; `tests/ui/node-inspector.test.tsx`, `workspace-shell.test.tsx`, `tree-interactions.test.tsx`, `child-authoring.test.tsx`, `node-chat.test.tsx`, `tests/application/tree-ui.test.ts`, `close-readiness` tests; **new** A/B stack-isolation complete regression |

## Acceptance mapping

| AC | Plan coverage |
| --- | --- |
| No required Start Learning | Remove activate button + Decision A′ (complete without activate) |
| No 未开始/学习中/Active Learning ceremony | Decision E + Details Status removal |
| Click/focus sufficient | Already true for chat/inspect; keep |
| Node Chat | Exists — preserve |
| Node Add child | Decision C / Slice 2 (`createChild` only) |
| Details no Chat / Add child / parent back / Start-Pause-Resume | Decision D / Slice 1 |
| Details primarily 达成条件 + 心得 | Decision D + F |
| Completion ≠ Start Learning state | Decisions A′ + B (Domain open→closed) |
| No new started-learning persistence | Finding §3 |
| Chat + graph not regressed | Preserve ops; regression tests |
| zh-CN copy | Decision F |
| Complete B ↛ mutate A stack | Decision A′ §4 + Slice 3 regression |

## Verification plan (post-approval)

1. Unit/UI: inspector no longer mounts `action-activate`, `chat-open` (details), `action-add-sub-question`, `action-return-to-parent`, park/resume.
2. Domain: `closeNode` succeeds from `open` when convergence met; rejects when unmet; **A active / complete B → A stack+lifecycles unchanged**.
3. Unit/UI: node exposes chat + add-child (`createChild`); complete from `open` with **zero** `activateNode` calls in the command path.
4. Unit: `setNodeSummary` / criterion updates from Details.
5. Existing node-chat and child-graph tests remain green.
6. Manual zh-CN pass on changed strings.
7. CI `check` + `e2e` green on PR #27.

## Cursor handoff (next)

1. Wait for plan review to set `plan_approved=true`.
2. Implement slices 1–4 on **this same branch** / PR #27.
3. Do not implement on `main`; do not open a second TASK-006 PR.
4. Do not absorb TASK-005 scope.
