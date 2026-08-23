---
task_id: PR-042-canvas-chat-layout-usability
title: Canvas & AI Panel Interaction Usability
status: plan_review
requirement: ../requirements/PR-042-canvas-chat-layout-usability.md
pr: 42
branch: task/canvas-chat-layout-usability
---

# PR-042 Plan — Canvas & AI Panel Interaction Usability

This is the canonical implementation plan for PR-042. It records Planning Gate code evidence and the smallest change set that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `plan_review` — awaiting ChatGPT plan review (`plan_approved=true`).

**Hard constraints:**

- Presentation / layout / interaction only — no `DomainSnapshot` schema change, no new learning lifecycle, no new chat binding semantics.
- Viewport fit and drop-collision correction are UI/layout concerns only; they must not rewrite parent/child relationships or semantic persistence.
- Manual `layout.nodePositions` remain authoritative except for the final no-overlap invariant on the **dragged** node.
- Collision correction must stay separate from explicit auto-layout (`LayoutMenu` / `computeLayout`).
- Preserve PR-038 overflow placement of float/dock/context (do not reintroduce prominent labeled chrome).
- Preserve PR-038 single-node drag isolation (`multiSelectionKeyCode={null}`, single-id persist).
- Do not create another Task, branch, or PR for this requirement.

Implementation of product code is forbidden until Plan review records `plan_approved=true`. Writing this file is not Done for the task.

---

## Goal

Make canvas and AI panel operations clearer and more efficient for long-form AI-assisted learning:

```text
Placement / context controls  → action labels (what click will do)
AI panel                      → resizable in floating + docked modes
Learning node chrome          → one visual container; no redundant outer title
Canvas camera                 → one-click “显示全部” fit of rendered nodes
Node drop                     → collision-free final position for dragged node only
```

---

## Current-state findings (code evidence)

### 1. Placement / context labels (AC1–3)

| Surface | Path | Today |
| --- | --- | --- |
| Overflow menu | [`ChatHeader.tsx`](../../src/ui/chat/ChatHeader.tsx) | Always renders **both** menuitems `chat-placement-floating` and `chat-placement-docked`, plus static `chat.context` |
| Copy | [`messages.ts`](../../src/ui/i18n/messages.ts) | ZH nouns `浮动` / `停靠` / `上下文` (EN Float / Dock / Context) |
| Wiring | [`ChatHost.tsx`](../../src/ui/chat/ChatHost.tsx) | `setChatPlacement` / local `contextOpen` only — semantics OK |
| Tests | [`tests/ui/node-chat.test.tsx`](../../tests/ui/node-chat.test.tsx) | Expects **both** placement testids after opening overflow |

**Gap:** Labels describe current/mode state and expose both placement options together, leaving the action ambiguous. Context label is a noun, not show/hide.

**PR-038 overlap:** Controls are already demoted to overflow — keep that IA; change only which item(s) appear and their action copy.

### 2. AI panel resize (AC4–6)

| Mode | Today | Gap |
| --- | --- | --- |
| Docked | [`ChatPanel.tsx`](../../src/ui/chat/ChatPanel.tsx) `PaneDivider` (`chat-resize`) adjusts width → `updateSelectedLayout({ chatWidth })` | Width-only; live drag can report `width + delta` before clamp; OK pattern to reuse |
| Floating | Header drag moves position via `moveFloatingChat`; style sets `left/top/width` only | **No** height model, **no** resize handles |
| Layout type | [`types.ts`](../../src/workspace/types.ts) `chatWidth` only | No `chatHeight` |
| Clamps | [`defaults.ts`](../../src/workspace/defaults.ts) `MIN/MAX_CHAT_WIDTH` 280–480; `DEFAULT_CHAT_WIDTH` 360 | No height min/max; floating CSS `max-height: min(520px, calc(100% - 24px))` only |
| Scroll | `.chat-panel { overflow: auto }`; `.chat-messages` is not a dedicated flex scroll child | Weak reflow story while resizing long replies |

Persistence stays on preferences (`plt.workspace.layout.v2`) via [`preferences.ts`](../../src/workspace/preferences.ts) / [`session.ts`](../../src/workspace/session.ts).

### 3. Node outer title/wrapper (AC7)

| Layer | Today |
| --- | --- |
| Learning card | [`LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) — question/goal/progress live **inside** single `.learning-node` |
| Flow host | [`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) `FlowLearningNode` — `LearningNode` + floating `NodeToolbar` (intentional, not a second card) |
| Dead CSS | [`styles.css`](../../src/ui/styles.css) still defines unused `.learning-node-shell` (PR-040 residual) |
| Cluster wash | [`ClusterRegion.tsx`](../../src/ui/tree/ClusterRegion.tsx) paints `knowledge-cluster-title` **outside** learning-node cards; title often duplicates the core question ([`cluster-regions.ts`](../../src/ui/tree/cluster-regions.ts)) |

**Conclusion:** PR-040 already flattened the double-card shell. Remaining AC7 work is (a) verify single-container contract in tests, (b) remove dead shell CSS, (c) remove the external cluster title that still reads as “title outside the node body.”

### 4. Fit-all viewport action (AC8)

| Piece | Today |
| --- | --- |
| Camera | `TreeCanvas` persists `viewport` on `onMoveEnd`; zoom/pan exist |
| Fit API | **No** `useReactFlow().fitView`, Controls, or MiniMap usage under `src/ui` |
| Canvas chrome | [`LayoutMenu.tsx`](../../src/ui/tree/LayoutMenu.tsx) only offers directional auto-layout (TB/BT/LR/RL) |

**Gap:** No one-click “显示全部” that fits rendered learning-node bounds with padding without rewriting `nodePositions`.

### 5. Drop collision (AC9–11)

| Step | Today |
| --- | --- |
| Drag isolation | PR-038: single-id filter + `multiSelectionKeyCode={null}` |
| Persist | `handleNodeDragStop` → `onNodeDragStop({ [id]: {x,y} })` → `applyNodeDragStop` merges preferences only |
| Auto-layout | Separate path: `LayoutMenu` → `computeLayout` → full `nodePositions` replace |
| Overlap check | Exists only for auto-layout fixtures (`assertNoOverlap` in layout tests) — **not** on manual drop |

**Gap:** Dropped overlapping nodes stay overlapped. Need dragged-node-only correction, no whole-tree relayout.

---

## Binding decisions (proposed for Plan review)

These are the Plan’s locked recommendations. ChatGPT may amend; implementation must not reopen them without a Plan revision.

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| D1 | Placement menu | When floating, show **only** action `停靠` (testid `chat-placement-docked`). When docked, show **only** action `浮动` (`chat-placement-floating`). Never both at once. | AC1–2; removes mutual-exclusivity ambiguity |
| D2 | Placement copy | Keep existing i18n keys `chat.placementFloating` / `chat.placementDocked`; update ZH/EN strings to action sense (`浮动`/`停靠`, `Float`/`Dock` remain acceptable as short actions). Do not add a second pair of keys unless review wants explicit “Switch to …”. | Minimal churn; matches requirement wording |
| D3 | Context copy | Add `chat.contextShow` / `chat.contextHide` (ZH `显示上下文` / `隐藏上下文`; EN `Show context` / `Hide context`). Label from `contextOpen`. Keep single overflow item + `chat-context-toggle` testid. | AC3 |
| D4 | Context state | Keep `contextOpen` as ephemeral React state (not layout persistence). | Out of scope; already correct |
| D5 | Floating resize | Add edge + corner resize handles on floating panel (VS Code–like). Resize width **and** height by drag. Use `nodrag` / stopPropagation so gestures never reach canvas/node drag. | AC4, AC6, regression surface |
| D6 | Height model | Add optional `chatHeight?: number` to `ProjectWorkspaceLayout` with `DEFAULT/MIN/MAX_CHAT_HEIGHT` and `clampChatHeight(height, viewportHeight?)`. Persist via existing preferences parser with backward-compatible omit → default. | AC4–5; minimal schema-compatible update allowed by non-goals |
| D7 | Width clamps | Keep width clamp helpers; raise floating max width to usable viewport fraction (e.g. `min(MAX, viewportWidth - margin)`) rather than hard-capping floating at 480 if that blocks long-reply readability — **prefer** extending `MAX_CHAT_WIDTH` only for floating via viewport-aware clamp, keep docked behavior stable unless review amends. Default proposal: shared clamp stays 280–480 for docked; floating uses `clamp(280, viewportW - 24)`. | AC4–5 “usable viewport” |
| D8 | Docked resize | Keep existing vertical `PaneDivider`; ensure live values always pass through `clampChatWidth` before paint/persist (fix any transient `0` path). | AC5 |
| D9 | Message scroll | Make `.chat-panel` a column flex host; `.chat-messages` `flex: 1; min-height: 0; overflow-y: auto` so conversation scrolls inside fixed panel bounds while resizing. | AC6 |
| D10 | Node chrome | Treat PR-040 flatten as base. Remove dead `.learning-node-shell` CSS. Remove `knowledge-cluster-title` from cluster underlays (keep wash/bbox; drop title + `CLUSTER_TITLE_RESERVE` padding). Do **not** restructure `LearningNode` unless visual QA still shows nesting. Keep `NodeToolbar` outside the card. | AC7 |
| D11 | Fit-all control | Add canvas control `显示全部` / `Show all` beside `LayoutMenu` in `.canvas-layout-panel` (sibling button, not inside layout-direction menu). Call XYFlow `fitView` on learning nodes only (exclude `cluster:*`), with padding (~0.15–0.2). Viewport-only — never call `onApplyLayout` / mutate `nodePositions`. | AC8 |
| D12 | Fit persistence | After fit, allow existing `onMoveEnd` to persist the new viewport (same as user pan/zoom). | Consistent with current camera model |
| D13 | Collision helper | New pure module `src/ui/tree/resolve-drag-collision.ts`: axis-aligned boxes using `NODE_WIDTH`×`NODE_HEIGHT`; on overlap, search nearest non-overlapping point (spiral or quantized neighborhood around drop); move **only** dragged id. | AC9–11 |
| D14 | Collision call site | Invoke correction inside `TreeCanvas.handleNodeDragStop` **before** `onNodeDragStop`, using peer positions from `nodesRef` (skip clusters + self). Persist corrected `{x,y}` only. | Keeps preferences boundary; no Domain touch |
| D15 | Settle motion | Optional short transform settle **after** drop on the corrected node only (≤ `--motion-normal`). **Never** add position transitions during active drag (PR-038 invariant). Prefer CSS class toggled post-correction; skip if reduced-motion. | AC10 “visually stable” |
| D16 | Auto-layout separation | Do **not** call `computeLayout` from drag-stop. Do **not** move unrelated nodes. LayoutMenu remains the only multi-node reposition command. | Req §6, AC11 |
| D17 | Domain / AI | No conversation, proposal, or learning-loop semantic changes. | Non-goals |

---

## Target interaction model

### Chat overflow

```text
Floating + context closed:
  [停靠] [显示上下文]
Docked + context open:
  [浮动] [隐藏上下文]
```

### Floating panel

```text
Header drag → move panel (existing)
Edge/corner drag → resize width/height within viewport clamps
Messages region scrolls; composer stays usable
```

### Drop

```text
Drag freely (may overlap during gesture)
On stop:
  if no overlap → persist drop position
  if overlap → correct dragged node only → persist corrected position
  peers unchanged; no computeLayout
```

### Fit all

```text
Click 显示全部
  → fitView(learning nodes, padding)
  → viewport preferences update via onMoveEnd
  → nodePositions untouched
```

---

## Implementation slices (post-approval only)

### Slice 1 — Action labels (AC1–3)

**Files:** `ChatHeader.tsx`, `messages.ts`, `tests/ui/node-chat.test.tsx`

1. Conditionally render one placement menuitem from `placement`.
2. Context label from show/hide keys.
3. Update tests: assert exclusive placement testid + action text for ZH/EN as needed.

### Slice 2 — Panel resize + scroll (AC4–6)

**Files:** `types.ts`, `defaults.ts`, `preferences.ts`, `session.ts`, `ChatPanel.tsx`, `ChatHost.tsx`, `styles.css`, `tests/workspace/chat-layout.test.ts`, chat UI tests

1. Add `chatHeight` + clamp helpers; parse omit-as-default.
2. Floating resize handles (edges/corners) with pointer capture; clamp to viewport; `nodrag`.
3. Docked divider continues; clamp on every delta.
4. Flex + scrollable `.chat-messages`.
5. Tests for clamp bounds, preference round-trip, and “resize does not move nodes” (stub/harness).

### Slice 3 — Node chrome cleanup (AC7)

**Files:** `ClusterRegion.tsx`, `cluster-regions.ts`, `styles.css`, light UI/CSS assertion test

1. Remove cluster external title + title reserve.
2. Delete unused `.learning-node-shell` rules.
3. Assert no nested shell wrapper; question remains inside `.learning-node`.
4. Smoke edge anchors / cluster bbox after padding change.

### Slice 4 — Show all (AC8)

**Files:** `TreeCanvas.tsx`, `LayoutMenu.tsx` or sibling control, `messages.ts`, UI test

1. `useReactFlow` + `fitView({ nodes: learningOnly, padding })`.
2. Visible control with `data-testid="canvas-fit-all"`.
3. Assert viewport changes and `nodePositions` unchanged.

### Slice 5 — Drop collision (AC9–11)

**Files:** new `resolve-drag-collision.ts`, `TreeCanvas.tsx`, unit tests, drag regression test

1. Pure overlap + nearest-free-point algorithm with fixed node box size.
2. Wire into `handleNodeDragStop` before persist.
3. Unit matrix: no overlap keep; overlap corrects only dragged; peers stable; clusters ignored.
4. Optional settle class; no live-drag transition.

### Slice 6 — Hardening

| Evidence | Approach |
| --- | --- |
| Labels | `node-chat.test.tsx` exclusive placement + context action copy |
| Resize | workspace clamp tests + UI gesture / style contract |
| Fit all | canvas test with xyflow stub or RF instance mock |
| Collision | pure unit tests + drag-stop integration |
| Regressions | existing PR-038 drag tests, chat pin/follow, layout directions, edge routing |

**Commands before acceptance:** `npm run typecheck`, `npm test`, `npm run build`, relevant `npm run test:e2e` if canvas/chat specs cover these surfaces.

---

## File touch map (expected)

| Area | Paths |
| --- | --- |
| Labels | `src/ui/chat/ChatHeader.tsx`, `src/ui/i18n/messages.ts` |
| Resize | `src/workspace/types.ts`, `defaults.ts`, `preferences.ts`, `session.ts`, `src/ui/chat/ChatPanel.tsx`, `ChatHost.tsx`, `src/ui/styles.css` |
| Node chrome | `src/ui/tree/ClusterRegion.tsx`, `cluster-regions.ts`, `styles.css` |
| Fit all | `src/ui/tree/TreeCanvas.tsx`, optionally `LayoutMenu.tsx` / new small control |
| Collision | `src/ui/tree/resolve-drag-collision.ts` (new), `TreeCanvas.tsx` |
| Tests | `tests/ui/node-chat.test.tsx`, `tests/workspace/chat-layout.test.ts`, new collision + fit-all tests |

**Out of touch:** `src/domain/**`, semantic persistence schema, conversation store, theme recipes, proposal semantics, LayoutMenu algorithm (except keeping it separate).

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Floating resize leaks pointer events into canvas drag | **Material** | `nodrag` / `nopan` / stopPropagation on handles; regression that resize does not change `nodePositions` |
| `chatHeight` preference parse breaks older layouts | Medium | Optional field; omit → default; existing tests extended |
| Raising floating width max diverges from docked 480 cap | Medium | Document D7; review may pin shared max — implement viewport clamp explicitly |
| Removing cluster titles changes wash geometry / overlap with nodes | Medium | Drop `CLUSTER_TITLE_RESERVE`; recheck cluster bbox tests / screenshots |
| Collision “nearest free” feels jumpy or pushes far | Medium | Prefer small spiral/step search; optional settle; unit-test distance bounds |
| `fitView` includes cluster nodes and over-zooms | Medium | Filter `!isClusterNodeId` |
| AC7 already mostly done → over-refactor LearningNode | Low | Prefer verify + cluster title removal only (D10) |

### Material risks (summary)

1. **Floating resize vs canvas pointer boundary** is the highest interaction risk.
2. **Collision search quality** must feel local and must never become implicit auto-layout.
3. **Cluster title removal** is the remaining visual interpretation of AC7; confirm with Plan review if any other outer wrapper is intended.

---

## Non-goals (reconfirmed)

- Domain / lifecycle / conversation semantic changes
- Global auto-layout on every drag
- New float/dock binding modes
- AI response-generation redesign
- Multi-select product feature
- Theme recipe changes

---

## Planning Gate checklist

| # | Item | Status |
| --- | --- | --- |
| 1 | Requirement read; stage was `planning` / `requirement_ready=true` | Done |
| 2 | Chat placement/context label audit | Done — dual nouns in overflow |
| 3 | Chat resize / layout-type audit | Done — docked width only; no height |
| 4 | Node chrome / cluster title audit | Done — PR-040 flat; cluster title residual |
| 5 | Fit-all / canvas chrome audit | Done — LayoutMenu only; no fitView |
| 6 | Drag-stop / collision / auto-layout separation audit | Done — persist only; no collision |
| 7 | Binding decisions D1–D17 recorded | Done (awaiting ChatGPT amend/approve) |
| 8 | Slices + tests + file map | Done |
| 9 | Plan path written | `docs/plans/PR-042-canvas-chat-layout-usability-plan.md` |
| 10 | Requirement → `plan_review` / `next_expected_actor: chatgpt` | This commit |
| 11 | Push to PR #42 only; stop for review | This commit |

---

## Review handoff

If approved with or without amendments, set Requirement `plan_approved: true` / `stage: implementing` / `next_expected_actor: cursor` and implement on **this same branch/PR only**.

Do **not** implement product code until that gate is recorded.
