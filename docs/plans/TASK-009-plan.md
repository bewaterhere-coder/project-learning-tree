---
task_id: TASK-009
title: AFFiNE-inspired Canvas & Interaction Simplification
status: plan_review
requirement: ../requirements/TASK-009-affine-inspired-canvas-simplification.md
pr: 31
branch: task/TASK-009-affine-inspired-canvas-simplification
---

# TASK-009 Plan — AFFiNE-inspired Canvas & Interaction Simplification

This is the canonical implementation plan for TASK-009. It records Planning Gate evidence (AFFiNE/BlockSuite MSC study + current Learning Tree audit) and the smallest change set that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `plan_review` — awaiting ChatGPT plan approval (`plan_approved=true`). **Do not implement product code until approved.**

**Hard constraints:**

- No migration to AFFiNE, BlockSuite, tldraw, or any other canvas/editor framework.
- Prefer React Flow (`@xyflow/react` ^12.8) native primitives (`NodeToolbar`, selection, handles, viewport, optional `Background`/`Controls`).
- No Domain learning-semantics rewrite; UI/interaction simplification only (except tiny view-model fields needed for node chrome such as `childCount`).
- Independent of TASK-008 branch/PR #30 — inspect for conflict only; never reuse that lineage.
- Do not copy AFFiNE/BlockSuite source (license/provenance); reuse interaction principles only.

---

## Goal

Make Learning Tree feel like one coherent **AI learning canvas**:

```text
Project (sidebar / chrome context)
└── Learning Canvas (primary workspace)
    ├── Question Node  ← primary object
    ├── Question Node
    └── Question Node
         ├── contextual actions (chat / add child / more)
         ├── Inspector (DoD + 心得) — secondary
         └── Chat panel — secondary, bound to question
```

Principle: **Canvas first. Object is content. Actions happen in context.**

---

## Current-state findings (code evidence)

### Canvas stack

| Layer | Path | Role today |
| --- | --- | --- |
| Shell | [`src/ui/App.tsx`](../../src/ui/App.tsx) | Sidebar + tree pane + inspector + chat wiring |
| RF host | [`src/ui/tree/TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) | `ReactFlow`, drag, click→focus, viewport persist |
| Node chrome | [`src/ui/tree/LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) | Question/goal + CSS hover toolbar |
| Adapter | [`src/ui/tree/to-react-flow.ts`](../../src/ui/tree/to-react-flow.ts) | Domain tree → RF nodes/edges; `selected = isCurrentFocus` |
| Handles | [`node-handles.tsx`](../../src/ui/tree/node-handles.tsx) + [`edge-routing.ts`](../../src/ui/tree/edge-routing.ts) | 8 invisible handles; geometry-based routing |
| Clusters | [`cluster-*.ts(x)`](../../src/ui/tree/) | Decorative RF nodes under core-question subtrees |
| Inspector | [`contextual/NodeDetails.tsx`](../../src/ui/contextual/NodeDetails.tsx) | DoD + reflection only (TASK-006 already stripped CTAs) |
| Chat | [`chat/ChatHost.tsx`](../../src/ui/chat/ChatHost.tsx) + panel/header | Binding, pin/follow, floating/docked |

Derivation (KEEP):

```text
DomainSnapshot
  → selectTreeViewModel()
  → toReactFlow(model, positions)
  → TreeCanvas (+ cluster nodes, routeEdgesForNodes)
```

### Interaction contract today

| User action | Result |
| --- | --- |
| Click node body | `focusAndOpenInspector` → semantic `focusNode` **+** `inspectorOpen: true` |
| Node chat icon | `openChatForNode` → focus + `chatOpen` (inspector **not** forced) |
| Node add-child | `focusSelectedNode` + local authoring overlay |
| Node complete | `focusSelectedNode` + `closeNode` |
| Header chat | May open chat without a focused question |

**Good:** selection ≠ chat open. **Over-coupled:** selection ≈ inspector open.

### Already gone (TASK-006) vs leftover debris

TASK-006 removed Start Learning / park / resume / detail CTAs from Inspector UI. Debris remains:

- i18n: `actions.startLearning`, `actions.returnToParent`, related keys in [`messages.ts`](../../src/ui/i18n/messages.ts)
- Application: [`selectActionAvailability`](../../src/application/selectors/action-availability.ts) / `ActivateLabel` still exported; UI unused
- Dead CSS: `.node-actions`, `.inspector-fields`, `.inspector-details`, `.inspector-children`, `.node-status`, `.close-unmet`, `.child-lifecycle`, `.stack-legend`
- Dead App state: `assistInput` (never set), empty `breadcrumb` / hidden stack-legend branch
- Chat closed-notice still offers `returnToParent` ([`ChatPanel.tsx`](../../src/ui/chat/ChatPanel.tsx) / [`ChatHost.tsx`](../../src/ui/chat/ChatHost.tsx))

### Gaps vs TASK-009 target IA

| Target | Today |
| --- | --- |
| Child-question count on node | **Missing** (`TreeNodeView` has no `childCount`) |
| Progress indicator beyond lifecycle | Lifecycle paint + complete mark + blocked pip only |
| “More” / context menu | **Missing** (Complete is a third permanent toolbar icon) |
| Project not a visible graph node | Domain **Project Root** still rendered as an RF `learningNode` (TASK-003) |
| Exclusive contextual panel | Inspector + Chat can both be open |
| `NodeToolbar` | **Not used** — custom `.node-toolbar` CSS |
| Calm canvas chrome | No RF `Background`; dense permanent node actions on hover |

---

## AFFiNE reference matrix

**Sources (MSC only — not a full-repo port):**

- BlockSuite Edgeless editor docs: https://blocksuite.io/components/editors/edgeless-editor
- Edgeless data structure: https://blocksuite.io/components/editors/edgeless-data-structure
- AFFiNE architecture notes: https://docs.affine.pro/blocksuite-wip/architecture
- Upstream paths (canary): `toeverything/AFFiNE` frontend detail page / edgeless widgets; BlockSuite `GfxSelectionManager`, `AffineToolbarWidget`, `EdgelessToolbarWidget`, `EdgelessSelectedRectWidget`
- Theme package pattern: `@toeverything/theme` / `cssVar` (do **not** import)

**License:** Inspect freely. **Do not copy** AFFiNE/BlockSuite implementation into this repo. AFFiNE CE is largely MIT; BlockSuite historically MPL-2.0 — provenance blocks vendoring anyway (already out of scope).

| # | Observed AFFiNE / BlockSuite pattern | LT applicability | Reason | React Flow already? |
| --- | --- | --- | --- | --- |
| 1 | Edgeless canvas is the dominant workspace; shell chrome overlays the editor body | **Adopt** | Matches canvas-first mental model | Yes — `ReactFlow` in `TreeCanvas` |
| 2 | Clear selected-object rect; editing vs selected modes in gfx selection | **Adapt** | Restrained selected outline; skip resize/rotate/multi-object gfx | Yes — `selected` + CSS; **reject** custom resize handles |
| 3 | Floating flavour toolbar near selection (`AffineToolbarWidget` + Floating UI) | **Adopt** | Actions near Question Node, not detail-page CTAs | Prefer **`NodeToolbar`** |
| 4 | Side surfaces as Fragments (outline / properties / chat) beside canvas | **Adapt** | One compact Inspector + one Chat; avoid many competing tabs | App panels; optional RF `Panel` |
| 5 | Object hierarchy via surface elements, frames, groups, z-index | **Adapt** (cues only) | Quiet title → meta → actions; edges from domain | Domain tree + RF nodes/edges **KEEP** |
| 6 | Bottom creation toolbar + density collapse + zoom widget | **Adapt** / mostly **reject** | Low chrome yes; pen/shape/frame toolbox **reject** | Optional `Controls` for zoom only |
| 7 | Calm empty canvas; tokenized grid/note fills; overlays mostly non-interactive | **Adapt** | Quiet `--color-bg-canvas`; optional subtle `Background` | `Background` available; keep TASK-007/008 tokens |
| 8 | Notes editable in place on canvas; page↔edgeless isomorphism | **Adopt** boundary; **reject** dual-mode | Question = object; no detail-route for core actions | App IA only |
| 9 | Direct manipulation; selection ≠ navigation route; Escape resets tool | **Adopt** | No Start Learning; no back-nav CTAs; panels are prefs | RF selection/viewport |
| 10 | Shared design tokens (`cssVar` / theme package) | **Adapt** pattern only | Keep LT semantic tokens + recipes; do not import AFFiNE theme | N/A (CSS) |

### Out of scope (framework migration)

`GfxController` / surface CRDT elements, Lit widget extensions, canvas/DOM dual renderer, shapes/brush/frames/presentation, page↔edgeless dual editor, vendoring AFFiNE/BlockSuite packages.

---

## Custom mechanism inventory (KEEP / SIMPLIFY / REPLACE / REMOVE)

| Mechanism | Class | Notes |
| --- | --- | --- |
| Domain → `TreeViewModel` → RF derivation | **KEEP** | Correct inward dependency |
| Drag → `layout.nodePositions` only | **KEEP** | Architecture rule |
| Viewport pan/zoom + prefs persist | **KEEP** | Native RF |
| `layoutOnlyNodeChanges` / connect disabled | **KEEP** | Prevents accidental graph mutation |
| Domain `currentFocusNodeId` as product selection | **KEEP** | Learning focus semantics |
| RF `node.selected` mirrored from focus | **KEEP** | Visual selection channel |
| Invisible multi-handle edge routing | **KEEP** (optionally **SIMPLIFY** handle count later) | Needed for free drag; not RF default |
| Parent/child edges from domain | **KEEP** | Derived view only |
| Inspector DoD + 心得 | **KEEP** | Matches §5.3 |
| Chat follow-focus / pin binding model | **KEEP** core; **SIMPLIFY** chrome | Binding is correct product semantics |
| PaneDivider inspector width | **KEEP** if exclusive-panel model retained | Useful, low complexity |
| Click node → always `inspectorOpen` | **SIMPLIFY** | Decouple select vs open Inspector |
| Custom `.node-toolbar` CSS positioning | **REPLACE** | Use RF `NodeToolbar` |
| Dual `.focused` CSS + RF selected styles | **SIMPLIFY** | One visual selected system |
| Cluster region RF nodes | **SIMPLIFY** | Optional quieter treatment; do not delete without visual review |
| Chat floating + docked + pin UI + `ContextInspector` | **SIMPLIFY** | Collapse placement/chrome density |
| Inspector + Chat simultaneous | **SIMPLIFY** | Prefer exclusive contextual surface (§12) |
| Header chat + node chat dual entry | **SIMPLIFY** | Node chat primary; header opens chat for current focus only |
| Complete as always-visible toolbar icon | **SIMPLIFY** | Move behind “more” when selected/hover |
| `returnToParent` in chat closed notice | **REMOVE** / **SIMPLIFY** | Nav duplicates canvas (§5.3 / §9) |
| Dead `assistInput` / empty breadcrumb / stack-legend UI | **REMOVE** | Dead state/branches |
| Dead inspector/node CSS selectors listed above | **REMOVE** | CSS deletion |
| Unused Start Learning i18n + `selectActionAvailability` UI path | **REMOVE** | Sweep leftovers; domain `activateNode` may remain for non-UI paths |
| Project Root as prominent graph card | **SIMPLIFY** | See Decision B — domain KEEP, canvas presentation change |
| RF `Controls` / `MiniMap` | **KEEP absence** of MiniMap; optional quiet zoom **Controls** only if needed | No dashboard chrome |
| Framework migration | **REMOVE from consideration** | Binding reject |

---

## Deletion / collapse catalog

For each item: kind + disposition after approval.

| Item | Kind | Disposition |
| --- | --- | --- |
| `assistInput` state + ChatHost prop/effect | state cleanup | **DELETE** |
| Empty `breadcrumb` / `active-stack` legend branch | component + CSS | **DELETE** |
| `.stack-legend`, `.node-actions`, `.inspector-fields`, `.inspector-details`, `.inspector-children`, `.node-status`, `.close-unmet`, `.child-lifecycle` | CSS deletion | **DELETE** unused rules |
| Orphan Start Learning / enter / park copy if unused | i18n cleanup | **DELETE** unused keys after grep |
| `selectActionAvailability` tests as UI contract | test cleanup | **Narrow** to domain-only or remove if no consumers |
| Custom absolute `.node-toolbar` layout | interaction + CSS | **REPLACE** with `NodeToolbar` styles |
| Duplicate Inspector identity fields that repeat the node card | visual-only | **SIMPLIFY** — keep question heading minimal |
| Chat `ContextInspector` dump density | component **SIMPLIFY** | Collapse or hide behind advanced disclosure |
| Floating chat drag + docked resize both as first-class | interaction **SIMPLIFY** | Prefer one default placement (`docked` **or** `floating`) as primary; keep the other only if tests/product still need it |
| `returnToParent` button on closed-node chat notice | interaction + i18n | **REMOVE** from UI; canvas focus remains |
| Thin `FlowLearningNode` wrapper | component **SIMPLIFY** | Optional inline after `NodeToolbar` move |

Net code reduction is desirable; architectural simplification is binding.

---

## Target interaction model

### Question Node

**Always visible:** question title; short supporting text (goal) when useful; child count; completion/progress cue (completed mark and/or quiet progress); clear selected state.

**Contextual (hover **or** selected / keyboard focus-within):**

1. Chat about this question  
2. Add child question  
3. More → Complete (and any future secondary actions)

Use RF **`NodeToolbar`** positioned against the node. Keep `nodrag nopan`. Icon-only controls require Chinese-first `aria-label` / `title` when locale is `zh-CN`.

**Do not** add Start Learning. **Do not** permanently dominate the card with three equal chrome buttons.

### Selection vs panels

```text
Click node body     → focusNode (semantic) ; do NOT auto-open Chat
                    → Inspector: open only if already open OR via explicit affordance
                      (Decision A — recommended default below)
Node chat action    → focusNode + chatOpen + follow-focus binding
Add child action    → focusNode + authoring overlay
Complete (more)     → focusNode + closeNode when allowed
```

Recommended **Decision A (binding if approved):**

- **Select** updates focus + selected chrome only.  
- **Inspector** opens via: (1) explicit “详情 / Inspector” control on the node more-menu or a single floating reopen control when closed; (2) restoring persisted `inspectorOpen` when switching back to a project that had it open.  
- **Migration from today’s click-opens-inspector:** change `TreeCanvas` / `App.handleFocusNode` to call `focusSelectedNode` instead of `focusAndOpenInspector`. Update tests that assert click→inspector ([`tests/ui/node-chat.test.tsx`](../../tests/ui/node-chat.test.tsx), [`task-006-acceptance.test.tsx`](../../tests/ui/task-006-acceptance.test.tsx), etc.).

Alternative (weaker): keep click→inspector but make Chat exclusive (opening Chat closes Inspector). Prefer Decision A for canvas-first restraint.

### Panel model (§12)

| Mode | Behavior |
| --- | --- |
| None | Canvas full bleed; optional quiet control to reopen Inspector |
| Inspector | Right sibling pane; resizable width persisted |
| Chat | Overlay in tree pane (keep existing docked default after simplification) |
| Inspector → Chat | Opening Chat **closes** Inspector (exclusive) |
| Chat → Inspector | Opening Inspector **closes** Chat (exclusive) |
| Small viewport | Inspector/Chat become near-full-height overlays; no nested dual right rails |

Pin/follow-focus for Chat **KEEP** (semantic binding). Floating drag chrome **SIMPLIFY** if docked-only is enough.

### Project level

Project name / source / description / archive actions stay in sidebar/header (existing).  
**Do not** add a new Project metadata node. See Decision B for existing Domain Project Root.

### Chat

Explicit from node (primary). Header chat only focuses/opens for **current** question when one is focused; otherwise no-op or gentle empty state — do not invent project-level chat ceremony in this task beyond preserving existing store keys.

---

## Proposed binding decisions (for ChatGPT)

| ID | Topic | Recommendation |
| --- | --- | --- |
| **A** | Click node opens Inspector? | **No** — select/focus only; Inspector explicit or restored from prefs |
| **B** | Domain Project Root on canvas | **KEEP in Domain**; **hide or visually demote** in RF view so Question Nodes dominate. Edges from root→core questions may remain as layout anchors with a minimal/hidden root node, **or** filter root from RF nodes and treat core questions as visual roots while domain parent links stay. Prefer **filter Project Root from visible RF nodes + edges incident only as needed for layout**, without deleting `projectRootNodeId` semantics. Exact render strategy chosen in implementation spike (≤1 small prototype) then locked. |
| **C** | Complete placement | Under **More** menu; not a permanent third icon |
| **D** | Panel exclusivity | Inspector ⊕ Chat mutually exclusive |
| **E** | Chat placement | Keep **docked** as default product path; floating becomes secondary or deferred cleanup if tests allow |
| **F** | RF `Background` | Optional subtle dots using canvas tokens — only if it increases calm, not decoration |
| **G** | `childCount` | Add to `TreeNodeView` / `LearningFlowNode` (derived from `childIds.length`); display on node |
| **H** | Theme | Consume existing semantic tokens only; no new recipe families; coordinate with TASK-008 on shared files |

---

## React Flow-native replacements

| Need | Use |
| --- | --- |
| Contextual node actions | `NodeToolbar` (`@xyflow/react`) |
| Selection styling | RF `selected` + one CSS selected system |
| Pan/zoom | Existing `ReactFlow` props |
| Handles / edges | Existing handles + `deriveEdgeHandles` |
| Optional calm grid | `Background` variant="dots" with token color |
| Optional zoom affordance | `Controls` showZoom only — omit if chrome budget is tight |
| Do **not** build | Custom floating toolbar framework, selection manager, tool controller |

---

## TASK-008 conflict awareness (no reuse)

| | TASK-008 (PR #30) | TASK-009 (PR #31) |
| --- | --- | --- |
| Branch | `task/TASK-008-complete-theme-semantic-colors` | `task/TASK-009-affine-inspired-canvas-simplification` |
| Stage at plan time | `planning` — requirement only on branch | This plan |
| Intent | Complete semantic foreground/token coverage for recipes | Canvas/interaction simplification |

**Likely overlap files once both implement:**

- `src/ui/styles.css` (highest conflict risk — node/inspector/chat/selection rules)
- `src/ui/theme/**` token maps (TASK-008 owns completeness; TASK-009 should only consume tokens)
- Node/Inspector/Chat classNames if TASK-008 retargets selectors
- Visual screenshot fixtures under `e2e/` / `docs/milestones/`

**Mitigation:**

1. TASK-009 prefers **structural/class deletion** and `NodeToolbar` markup over recoloring.  
2. Avoid inventing new color literals; use `--color-*` only.  
3. If both land nearby, rebase TASK-009 onto latest `main` after TASK-008 merge (or vice versa) and re-run visual suite.  
4. **Never** cherry-pick TASK-008 commits into this PR or share a branch.

---

## Migration & persistence safety

| Concern | Plan |
| --- | --- |
| DomainSnapshot | Unchanged schema for learning state; optional additive `childCount` is view-only |
| Project Root identity | Preserved in domain even if hidden on canvas |
| Preferences (`inspectorOpen`, chat layout, viewport, positions) | Remain preference-only; panel exclusivity may close one flag when opening the other via `updateSelectedLayout` |
| Semantic writes | UI selection/panel/theme must use `commit(..., false)` when snapshot unchanged; focus still may write `currentFocusNodeId` (existing contract) |
| Conversations | Keep `chatBinding` follow-focus / pinned identity keys |
| Chinese-first | All new strings in `messages.ts` EN + zh-CN |

No preference schema version bump required unless a placement enum is removed; if floating fields become unused, keep parse tolerance for old layouts (forward-compatible defaults) rather than a hard migration.

---

## Implementation slices (post-approval only)

1. **Inventory cleanup** — delete dead App state, unused CSS, unused i18n; stop exporting UI-dead action-availability if safe.  
2. **Selection / panel contract** — Decision A + D in `session.ts` / `App.tsx`; update unit tests.  
3. **Node chrome** — `childCount` on view model; `NodeToolbar`; More menu; restrained selected styles.  
4. **Project Root presentation** — Decision B spike → hide/demote without semantic loss.  
5. **Chat simplify** — exclusivity with Inspector; trim return-to-parent CTA; reduce header dual-entry confusion.  
6. **Visual polish** — chrome density, optional `Background`, theme-token-only surfaces.  
7. **Tests + headed screenshots** — §14 / §15 evidence.  
8. **Conflict pass** — diff against TASK-008 if still open; rebase notes in PR.

Order preserves behavior under tests at each slice; no big-bang rewrite.

---

## Testing plan

Update/add coverage for Requirement §14:

| # | Scenario | Likely home |
| --- | --- | --- |
| 1 | Selection deterministic (focus + RF selected) | `tests/ui/*`, tree tests |
| 2 | Node actions bind to correct question id | `node-chat`, learning-node tests |
| 3 | Chat without Start Learning | existing + assert no start CTA |
| 4 | Inspector compact = DoD + 心得 only | `node-inspector`, product-workspace |
| 5 | Removed detail CTAs stay gone | `task-006-acceptance` extended |
| 6 | Parent/child + derived edges preserved | application tree + e2e |
| 7 | Project switch keeps context | product-workspace / e2e |
| 8 | UI panel/theme does not semantic-write | workspace semantic-persistence tests |
| 9 | zh-CN labels on new controls | i18n / UI test with locale |
| 10 | Keyboard/focus-within reaches actions | UI test + a11y smoke |
| 11 | Theme recipes coherent after simplification | visual / recipe smoke |
| 12 | E2E flows updated to new select≠inspector if Decision A | Playwright specs |

Commands before acceptance: `npm run typecheck`, `npm test`, `npm run build`, relevant E2E/visual (`E2E_VISUAL` / acceptance shots).

---

## Visual acceptance evidence

Using existing Playwright headed/visual infrastructure, capture product-scale shots:

1. Non-trivial question tree, nothing selected  
2. Selected Question Node with contextual/`NodeToolbar` actions  
3. Compact Inspector (DoD + 心得)  
4. Chat open and bound to a question  
5. Node showing child-count + progress/completion cue  
6. Representative light + dark (and enough Theme Recipe coverage to prove TASK-007/008 tokens still apply — at least default recipe × light/dark; expand if TASK-008 merged)

Store under the milestone/acceptance path already used by the repo (`e2e/acceptance` / `docs/milestones/...` pattern from TASK-007).

---

## Out of scope (restate)

- Framework migration; copying AFFiNE code  
- Collaboration, whiteboard tools, doc/database/slides  
- Domain learning-model redesign; AI provider redesign; persistence rebuild  
- New Theme Recipe families  
- Merging or reusing TASK-008  

---

## Open questions for ChatGPT (blocking only if rejected)

1. Confirm **Decision A** (click ≠ open Inspector).  
2. Confirm **Decision B** strategy for Project Root visibility vs TASK-003 domain sole-root.  
3. Confirm **Decision D/E** panel exclusivity + docked-default Chat.  
4. Any must-keep floating Chat behavior for existing users?

If approved with or without amendments, set Requirement `plan_approved: true` / `stage: implementing` / `next_expected_actor: cursor` and implement on this same branch/PR only.
