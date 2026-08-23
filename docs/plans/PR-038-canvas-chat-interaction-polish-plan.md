---
task_id: PR-038-canvas-chat-interaction-polish
title: Canvas & Node Chat Interaction Polish
status: acceptance_review
requirement: ../requirements/PR-038-canvas-chat-interaction-polish.md
pr: 38
branch: task/canvas-chat-interaction-polish
---

# PR-038 Plan — Canvas & Node Chat Interaction Polish

This is the canonical implementation plan for PR-038. It records Planning Gate code evidence and the smallest change set that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `acceptance_review` — implementation complete on PR #38; awaiting ChatGPT acceptance review (`acceptance_approved=true`).

**Hard constraints:**

- Presentation / interaction polish only — no DomainSnapshot schema change, no new conversation state machine, no new floating/dock semantics.
- Drag persistence stays on the existing UI-preference boundary (`layout.nodePositions` → `plt.workspace.layout.v2`); never write positions into semantic persistence.
- No decorative animation that delays pointer tracking; active node drag must remain immediate (no CSS `transform`/`left`/`top` transitions on the dragged node).
- Do not implement multi-select node dragging; disable accidental multi-node drag rather than adding a multi-select product feature.
- Independent of open TASK-010 / TASK-011 / env PRs — inspect for conflict only; never reuse those lineages.
- Do not create another Task, branch, or PR for this requirement.

Implementation of product code is forbidden until Plan review records `plan_approved=true`. Writing this file is not Done for the task.

---

## Goal

Make high-frequency Learning Tree surfaces feel predictable and conversation-first:

```text
Canvas drag     → exactly one learning node moves; edges follow; positions persist
Motion          → restrained fade/scale/slide on dialogs, menus, panels
Node Chat       → title + messages + composer dominate; mode chrome is secondary
AI proposals    → muted inline text actions under answers, not primary cards/buttons
```

---

## Current-state findings (code evidence)

### 1. Independent node dragging

| Layer | Path | Today |
| --- | --- | --- |
| RF host | [`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) | `onNodesChange` + `onNodeDragStop`; no `onNodeDrag` |
| Change filter | [`layout-node-changes.ts`](../../src/ui/tree/layout-node-changes.ts) | Keeps `position` / `select` / `dimensions` only |
| Persist | [`App.tsx`](../../src/ui/App.tsx) → [`applyNodeDragStop`](../../src/workspace/session.ts) | Writes **only** `{ [draggedId]: {x,y} }` into `layout.nodePositions` |
| Derive | [`to-react-flow.ts`](../../src/ui/tree/to-react-flow.ts) | Flat RF nodes (no `parentId` / `extent`); `selected = isCurrentFocus` |
| Auto-layout | [`layout.ts`](../../src/ui/tree/layout.ts) `computeLayout` | Runs for nodes **without** saved positions only — not a drag side effect |
| Clusters | [`cluster-regions.ts`](../../src/ui/tree/cluster-regions.ts) / [`cluster-flow.tsx`](../../src/ui/tree/cluster-flow.tsx) | Decorative underlays; `draggable: false`; bbox rebuilt from live learning-node positions |

**Already correct architecturally:**

- No parent/child/sibling position sync on drag.
- No `重新布局` UI/action exists in `src/` (requirement allows a future explicit action elsewhere; out of scope here).
- Persistence boundary already matches architecture rules (preferences only).

**Likely root cause of “siblings move together” (AC1):**

1. **XYFlow multi-selected drag (primary).** `elementsSelectable` is on; `layoutOnlyNodeChanges` admits `select` changes into local `nodes` state; `multiSelectionKeyCode` is **not** disabled. During a gesture, RF can translate every locally selected node while `onNodeDragStop` persists only the primary node — other nodes then snap back on the next derived resync from `savedPositions`.
2. **Cluster underlay confounder (visual only).** Dragging one member of a knowledge cluster reflows the wash bbox. Sibling learning-node `x/y` are unchanged, but the canvas can *feel* grouped.

No domain topology coupling was found.

### 2. Lightweight motion

| Token / surface | Today |
| --- | --- |
| `--motion-fast` / `--motion-normal` | Exist in [`styles.css`](../../src/ui/styles.css) (`140ms` / `200ms`); **no** `--motion-slow`, **no** shared easing token |
| `prefers-reduced-motion` | **Absent** under `src/` |
| Confirm dialog | [`ConfirmDialog.tsx`](../../src/ui/primitives/ConfirmDialog.tsx) — abrupt mount/unmount |
| Menus | [`Menu.tsx`](../../src/ui/primitives/Menu.tsx) — `if (!open) return null`; no opacity/offset |
| Toast | **None**; closest is static `DomainErrorBanner` |
| Sidebar | Width transition only |
| Inspector / Chat | Conditional mount in [`App.tsx`](../../src/ui/App.tsx) / [`ChatHost.tsx`](../../src/ui/chat/ChatHost.tsx) — abrupt |
| Node hover/selection | `.learning-node` already transitions border/background/shadow |

No framer-motion / Radix / animation libraries. Motion must stay CSS-token + thin React exit-hold where needed.

### 3. Node Chat chrome

[`ChatPanel.tsx`](../../src/ui/chat/ChatPanel.tsx) structure today:

```text
aside.chat-panel
  ChatHeader          ← oversized <h2>, full-label 关闭对话, pin/float/dock buttons
  ContextInspector    ← prominent 上下文 toggle
  MessageList
  ProposalList        ← bordered .proposal-card + action buttons
  MessageComposer     ← single-line <input> + separate 发送
```

Evidence:

- Close is a ghost text button with `chat.close` (**关闭对话**), not a quiet circular × — [`ChatHeader.tsx`](../../src/ui/chat/ChatHeader.tsx).
- Placement (**浮动** / **停靠**) and pin (**固定到此节点**) are a labeled button row.
- Title CSS only zeros `h2` margin — default browser headline size dominates ([`styles.css`](../../src/ui/styles.css) `.chat-header h2`).
- Composer is form-like; Enter sends via form submit; **no** Shift+Enter newline ([`MessageComposer.tsx`](../../src/ui/chat/MessageComposer.tsx)).
- Context remains a primary toggle ([`ContextInspector.tsx`](../../src/ui/chat/ContextInspector.tsx)).

Binding semantics (pin / follow-focus / floating drag / docked resize) are correct product behavior and must be **preserved**, not redesigned.

### 4. Follow-up learning proposals

[`ProposalCard.tsx`](../../src/ui/chat/ProposalCard.tsx) renders pending proposals as bordered cards with filled/outline-style buttons (`proposal-accept-blocking` → **添加为子问题**, frontier, adopt, edit, ignore). This is the AC9 gap.

Domain command wiring in [`ChatHost.tsx`](../../src/ui/chat/ChatHost.tsx) (create child / frontier / adopt / ignore) stays; only presentation changes.

---

## Binding decisions (proposed for Plan review)

These are the Plan’s locked recommendations. ChatGPT may amend; implementation must not reopen them without a Plan revision.

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| D1 | Multi-node drag | **Disable** RF multi-selection for learning nodes (`multiSelectionKeyCode={null}`, and treat selection as single-focus only). Do **not** ship multi-select drag. | Matches AC1 + non-goal; removes primary coupling without new features |
| D2 | Drag persist | Keep single-id `applyNodeDragStop` write; optionally also persist every learning node whose local position changed during the stop event as defense-in-depth if RF still reports a set — prefer disable-multi first | Preserves preference boundary |
| D3 | Cluster underlays | **Keep** live bbox follow; document as non-violating AC1 (node coordinates unchanged). No freeze-during-drag unless visual acceptance fails | Avoids scope creep |
| D4 | `重新布局` | **Do not** introduce in this task | Explicit non-goal / elsewhere |
| D5 | Motion tokens | Extend `:root` in `styles.css`: keep fast/normal; add `--motion-slow: 280ms`; add `--motion-ease: cubic-bezier(0.2, 0, 0, 1)`. Do **not** put motion in theme recipes | Aligns with TASK-007 non-color token rule |
| D6 | Reduced motion | Global `@media (prefers-reduced-motion: reduce)` zeros transitions/animations introduced here | AC4 |
| D7 | Enter/exit pattern | CSS classes + short `data-state` / exit-hold (~duration) for Dialog, Menu, Chat panel, Inspector. Prefer keep-mounted-while-exiting over libraries | Avoids abrupt unmount cutting animations |
| D8 | Toast | **Skip new toast system.** If a touched transient surface exists, lightly animate `.domain-error` only; otherwise panels/dialogs/menus satisfy AC3 | Scope discipline |
| D9 | Chat header | Compact title (~15–16px semibold, ≤2-line clamp); circular quiet × close (`aria-label` / tooltip = 关闭对话); pin as small icon; float/dock behind existing [`Menu`](../../src/ui/primitives/Menu.tsx) overflow | AC5–7 |
| D10 | Context | Remove prominent **上下文** button. Show muted secondary line (`正在讨论当前问题` / truncated title). Advanced dump moves behind overflow/disclosure | AC6 |
| D11 | Composer | Multi-line `<textarea>` (~44px min, 10–12px radius, grow to cap); integrated send icon/control; Enter send / Shift+Enter newline | AC8 |
| D12 | Proposals | Replace card chrome with muted text rows under the stream; primary inline action for question → blocking (`添加` / keep `添加为子问题` key or shorten); frontier / ignore / adopt as secondary text links; after success show quiet `已添加` inline (reuse proposal status, no new modal) | AC9–10 |
| D13 | Domain / AI | **No** proposal schema or ChatHost command semantics changes beyond presentation hooks already present | AC10 |

---

## Target interaction model

### Canvas

```text
Pointer down on learning node A
  → only A translates with the pointer (immediate)
  → edges re-route from live positions (existing routeEdgesForNodes)
  → cluster wash may reflow (presentation)
  → on stop: layout.nodePositions[A] = {x,y}; preferences save
  → no computeLayout rewrite of siblings; no domain mutation
```

### Node Chat IA (priority)

1. Node/question title (compact)
2. Conversation messages
3. Composer
4. Low-emphasis proposal text actions
5. Overflow: pin / float / dock / advanced context

---

## Implementation slices (post-approval only)

### Slice 1 — Independent drag (AC1–2)

**Files:** `TreeCanvas.tsx`, optionally `layout-node-changes.ts`, `xyflow-stub.tsx`, new/extended UI test.

1. Set `multiSelectionKeyCode={null}` (and `selectionKeyCode={null}` if needed to prevent additive RF selection).
2. Ensure local `select` changes cannot leave multiple learning nodes `selected=true` during drag (normalize to focus id, or ignore select changes that expand multi-select).
3. Confirm `onNodeDragStop` still writes one preference entry; add regression that after dragging node A by ~100px, every other node’s coordinates are unchanged (unit/UI with stub or controlled RF harness).
4. Assert no CSS position transition on `.learning-node` / RF node wrapper during drag (static audit + optional test comment).

**Do not** touch Domain, `computeLayout` tree algorithm, or introduce relayout UI.

### Slice 2 — Motion tokens + overlays (AC3–4)

**Files:** `styles.css`, `ConfirmDialog.tsx`, `Menu.tsx`, light App/ChatHost exit-hold for inspector/chat.

1. Add `--motion-slow`, `--motion-ease`; wire existing transitions to the easing token where cheap.
2. Dialog: backdrop opacity fade; panel opacity + `scale(0.98→1)` using normal/fast tokens.
3. Menu: opacity + 4–8px translate using `data-placement` already present.
4. Chat / Inspector: opacity + short positional/size transition; implement exit-hold so close animates before unmount.
5. `@media (prefers-reduced-motion: reduce)` → `transition: none` / `animation: none` for these surfaces.
6. **Explicitly exclude** dragging node position from any new transition.

Sidebar width transition may adopt the shared easing token; no redesign.

### Slice 3 — Node Chat panel redesign (AC5–8)

**Files:** `ChatHeader.tsx`, `ChatPanel.tsx`, `ContextInspector.tsx` (or fold), `MessageComposer.tsx`, `MessageList.tsx` (light hierarchy), `styles.css`, `messages.ts`.

1. Header: clamp title; circular × close; demote pin to icon; move float/dock into overflow `Menu`.
2. Replace prominent context toggle with muted secondary status text; keep advanced inspector discoverable (overflow item or quiet disclosure).
3. Composer → textarea + integrated send; keyboard contract Enter / Shift+Enter.
4. Empty state copy stays conversational (`chat.empty` / `chat.emptyProject`); optional light message enter fade using motion tokens.
5. Preserve testids where practical (`chat-close`, `chat-pin`, `chat-placement-*` can move into menu but remain queryable for tests).

### Slice 4 — Proposal text actions (AC9–10)

**Files:** `ProposalCard.tsx` (rename presentation to list/rows if clearer), `styles.css`, `messages.ts`, `learning-loop.test.tsx`.

1. Remove bordered card visual weight and button row dominance.
2. Question proposals: muted guidance + inline `添加为子问题` (and secondary `稍后探索` / `忽略` as text links).
3. Evidence / criterion / summary: same secondary-text pattern for adopt / edit / ignore.
4. On accepted/adopted status, render quiet `已添加` (new i18n key) inline instead of disappearing into a heavy confirmation.
5. Keep `ChatHost` command handlers and proposal id/`data-testid` stability for regressions (`proposal-accept-blocking`, etc.).

### Slice 5 — Tests + acceptance hardening

| Evidence | Approach |
| --- | --- |
| Drag independence | New UI/unit test: drag A; assert B/C positions unchanged; preferences contain only A (or A updated only) |
| Chat chrome | Extend [`node-chat.test.tsx`](../../tests/ui/node-chat.test.tsx): close still works; placement via overflow; no prominent labeled float/dock row |
| Proposals | Extend [`learning-loop.test.tsx`](../../tests/ui/learning-loop.test.tsx): accept blocking still creates child; UI asserts text-action affordance / `已添加` |
| Motion | CSS presence of tokens + reduced-motion rule; optional component test that dialog mounts with motion class — no flaky timing assertions required |
| Persistence / edges / themes / zh labels | Existing workspace + chat tests; smoke zh strings for new keys |

**Commands before acceptance:** `npm run typecheck`, `npm test`, `npm run build`, relevant `npm run test:e2e` / visual if chat/canvas screenshots exist.

Optional headed evidence (not a new framework): one light + one dark screenshot of redesigned chat with a proposal row, stored under an acceptance path consistent with prior tasks if ChatGPT requests visual proof at acceptance.

---

## File touch map (expected)

| Area | Paths |
| --- | --- |
| Drag | `src/ui/tree/TreeCanvas.tsx`, `tests/ui/xyflow-stub.tsx`, new drag regression test |
| Motion | `src/ui/styles.css`, `src/ui/primitives/ConfirmDialog.tsx`, `src/ui/primitives/Menu.tsx`, `src/ui/chat/ChatHost.tsx`, `src/ui/App.tsx` (inspector exit-hold) |
| Chat UI | `src/ui/chat/ChatHeader.tsx`, `ChatPanel.tsx`, `ContextInspector.tsx`, `MessageComposer.tsx`, `MessageList.tsx` |
| Proposals | `src/ui/chat/ProposalCard.tsx` |
| i18n | `src/ui/i18n/messages.ts` |
| Tests | `tests/ui/node-chat.test.tsx`, `tests/ui/learning-loop.test.tsx`, drag-focused test |

**Out of touch:** `src/domain/**`, conversation state machines, semantic persistence schema, theme recipe palettes, cluster geometry algorithm (unless a one-line drag-time skip is forced by acceptance).

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| RF still multi-drags via selection quirks after keyCode null | **Material** | Normalize local selection to single focus id; regression test with multi-select attempt |
| Exit-hold for Chat/Inspector races with rapid toggle / pin follow | Medium | Single exiting flag + ignore re-entrant close until timeout; keep durations ≤300ms |
| Proposal “已添加” vs existing status enum mismatch | Medium | Map from current `proposal.status` after successful ChatHost action; no new domain status if `accepted`/`adopted` already exists — verify before coding |
| Demoting float/dock into Menu regresses discoverability / tests | Medium | Keep testids; zh tooltip/menu labels; document in Plan review |
| Cluster wash misread as sibling node motion in manual QA | Low | Acceptance checklist measures node coordinates, not underlay bbox |
| Open TASK-010/011 touch TreeCanvas / styles | Low | Rebase/conflict-only; no shared feature work |

### Material risks (summary)

1. **Accidental multi-select drag** is the only concrete mechanism found that can move multiple learning-node coordinates in one gesture; Slice 1 must disable and regress it.
2. **Exit animations on Chat/Inspector** require keep-mounted-while-exiting; incorrect lifecycle can break pin/follow or cause stuck panels.
3. **Proposal success → `已添加`** must bind to existing proposal status without inventing domain semantics.

---

## Non-goals (reconfirmed)

- Domain model / learning-loop redesign
- New conversation state machine
- New float/dock semantics
- Multi-select product feature
- Toast framework
- `重新布局` command
- Theme recipe changes
- AFFiNE / extra canvas framework migration

---

## Planning Gate checklist

| # | Item | Status |
| --- | --- | --- |
| 1 | Requirement read; stage was `planning` / `requirement_ready=true` | Done |
| 2 | Drag / persist / layout audit | Done — single-id persist OK; multi-select + cluster noted |
| 3 | Motion / dialog / menu / panel audit | Done — tokens partial; overlays abrupt |
| 4 | Chat header / composer / context audit | Done — chrome-heavy |
| 5 | Proposal rendering audit | Done — card+buttons |
| 6 | Binding decisions D1–D13 recorded | Done (awaiting ChatGPT amend/approve) |
| 7 | Slices + tests + file map | Done |
| 8 | Plan path written | `docs/plans/PR-038-canvas-chat-interaction-polish-plan.md` |
| 9 | Requirement → `plan_review` / `next_expected_actor: chatgpt` | This commit |
| 10 | Push to PR #38 only; stop for review | This commit |

---

## Review handoff

If approved with or without amendments, set Requirement `plan_approved: true` / `stage: implementing` / `next_expected_actor: cursor` and implement on **this same branch/PR only**.

Do **not** implement product code until that gate is recorded.
