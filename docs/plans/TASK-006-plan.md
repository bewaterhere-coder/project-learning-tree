---
task_id: TASK-006
title: Simplify Question Interaction and Details Panel
status: planning
requirement: ../requirements/TASK-006-simplify-question-interaction-details.md
pr: 27
branch: task/TASK-006-simplify-question-interaction-details
---

# TASK-006 Plan — Simplify Question Interaction and Details Panel

This is the canonical implementation plan for TASK-006. It records code evidence for the requirement’s planning questions and the smallest change that satisfies the acceptance criteria.

**Gate:** `planning` — awaiting ChatGPT plan review (`plan_approved=true`). **Do not implement production code until that gate flips.**

## Goal

Make the product model match:

```text
Question Node = primary interaction surface
Question Details = knowledge / reflection surface (达成条件 + 心得)
```

Remove explicit Start Learning / learning-state ceremony from the primary UI. Users click a Question, chat or add children from the node, and use Details only to capture understanding — not to operate a second action dashboard.

Preserve:

- Domain lifecycle / `activeStack` / `currentFocusNodeId` as internal engine state (no new “learning started” flag)
- Contextual node chat + conversation persistence
- Real Question → child Question graph edges
- `DomainSnapshot` as semantic source of truth
- Preference store denylist for lifecycle / stack / focus (unchanged)
- TASK-006 identity independent of TASK-005 (PR #26)

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

### 4. Domain constraints that still gate real operations

Removing the Start Learning **button** does not remove Domain invariants:

| Operation | Domain gate today | UX impact if UI never calls `activateNode` |
| --- | --- | --- |
| `createChild` | Parent not `closed` | **OK** — ordinary add-child needs no Start Learning |
| `createBlockingChild` | Parent must be `active` | Blocking “must resolve first” authoring fails unless activated |
| `closeNode` / close readiness | Parent must be `active` | Complete fails unless activated |
| Chat / focus / inspect | None | **OK** — click already sufficient |

Evidence: [`operations.ts`](../../src/domain/operations.ts) (`createChild`, `createBlockingChild`, `closeNode`); [`close-readiness.ts`](../../src/application/selectors/close-readiness.ts); [`child-authoring.ts`](../../src/application/selectors/child-authoring.ts).

**Plan decision:** Prefer removing UI ceremony over Domain redesign. Use **implicit activation** when a user action requires `active` (Decision A). Do not invent a parallel UI state machine.

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

### A. Implicit activate — hide ceremony, keep Domain

When a user action needs `lifecycle === "active"` and the focused node is not active:

1. Application/UI command path runs `activateNode` (or equivalent) **silently**, then the intended op.
2. Covered actions at minimum: **Complete / close**, and **createBlockingChild** if node still exposes a blocking toggle.
3. Ordinary `createChild`, chat, focus, Details editing of 心得/达成条件 must **not** require a visible Start Learning step.
4. Do **not** add persisted UI-only “started” state.
5. Park / Resume remain Domain ops but are **removed from primary Details UI** (non-goal to redesign stack UX; users should not manage pause/resume as learning ceremony).

Tests must prove: user can complete a Question and add an ordinary child without ever clicking `action-activate` / seeing `开始学习`.

### B. Complete / 已完成 lives on the Question node

- Move completion affordance to the Question card (label `已完成` in zh-CN; en-US “Mark complete” / “Completed” as appropriate).
- Disable or explain unmet close readiness using existing readiness model (summary / criteria / blocking children) without forcing Start Learning.
- Remove Close from Details `NodeActions` along with the rest of the action dashboard.
- Optional: keep a compact unmet-readiness hint near the node complete control or in Details under 心得/达成条件 — not a second navigation system.

### C. Add child on the node; remove from Details

- Add a node-level control (icon/button, `添加子问题`) that opens a small authoring affordance (inline popover/form or lightweight dialog) calling existing `createChild`.
- Default path: **ordinary child** (no activate required).
- Blocking relationship: either (1) omit from node MVP and leave advanced blocking to chat proposals, or (2) keep a secondary “must resolve first” checkbox that uses Decision A. Prefer (1) for ceremony reduction unless existing tests force blocking from the same form — then use (2) with implicit activate.
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

### Slice 2 — Node add-child

- Extend `LearningNode` / `TreeCanvas` / App command wiring with add-child control.
- Reuse validation from [`validateChildDraft`](../../src/application/selectors/child-authoring.ts).
- Extend tree view model only if needed for child count (optional light metadata).

### Slice 3 — Node complete + implicit activate

- Node-level Complete using existing `closeNode` + readiness.
- Application helper: ensure active (silent `activateNode`) before close / blocking-child if retained.
- Prove no Start Learning click required.

### Slice 4 — Tests + acceptance hardening

- Rewrite UI tests that assert `action-activate`, Details chat/add-child, lifecycle “学习中” in primary inspector.
- Keep / extend node-chat persistence tests.
- Add Given/When/Then coverage for: focus → chat; focus → add child; Details edits 心得; complete without Start Learning; no Details duplicate actions.

## Files likely to change

| Area | Paths |
| --- | --- |
| Node UI | `src/ui/tree/LearningNode.tsx`, `TreeCanvas.tsx`, related CSS |
| Details | `src/ui/contextual/NodeDetails.tsx`, possibly slim/retire `ChildAuthoringSection` from Details mount |
| App wiring | `src/ui/App.tsx`, session helpers if implicit activate lives in workspace/application |
| Selectors | `action-availability.ts` (may remain for internal use), `tree-view-model.ts`, close-readiness consumers |
| i18n | `src/ui/i18n/messages.ts`, `labels.ts` if lifecycle keys drop from primary UI |
| Tests | `tests/ui/node-inspector.test.tsx`, `workspace-shell.test.tsx`, `tree-interactions.test.tsx`, `child-authoring.test.tsx`, `node-chat.test.tsx`, `tests/application/tree-ui.test.ts`; add focused TASK-006 UI tests as needed |

Domain (`src/domain/**`) should stay unchanged unless Slice 3 proves an invariant cannot be satisfied via implicit activate — escalate in implementation notes rather than preemptively redesigning lifecycle.

## Acceptance mapping

| AC | Plan coverage |
| --- | --- |
| No required Start Learning | Decision A + remove activate button |
| No 未开始/学习中/Active Learning ceremony | Decision E + Details Status removal |
| Click/focus sufficient | Already true for chat/inspect; keep |
| Node Chat | Exists — preserve |
| Node Add child | Decision C / Slice 2 |
| Details no Chat / Add child / parent back / Start-Pause-Resume | Decision D / Slice 1 |
| Details primarily 达成条件 + 心得 | Decision D + F |
| Completion ≠ Start Learning state | Decisions A + B |
| No new started-learning persistence | Finding §3 |
| Chat + graph not regressed | Preserve ops; regression tests |
| zh-CN copy | Decision F |

## Verification plan (post-approval)

1. Unit/UI: inspector no longer mounts `action-activate`, `chat-open` (details), `action-add-sub-question`, `action-return-to-parent`, park/resume.
2. Unit/UI: node exposes chat + add-child; complete path works from `open` without prior activate click.
3. Unit: `setNodeSummary` / criterion updates from Details.
4. Existing node-chat and child-graph tests remain green.
5. Manual zh-CN pass on changed strings.
6. CI `check` + `e2e` green on PR #27.

## Cursor handoff (next)

1. Wait for plan review to set `plan_approved=true`.
2. Implement slices 1–4 on **this same branch** / PR #27.
3. Do not implement on `main`; do not open a second TASK-006 PR.
4. Do not absorb TASK-005 scope.
