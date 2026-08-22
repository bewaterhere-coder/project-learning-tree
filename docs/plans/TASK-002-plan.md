---
task_id: TASK-002
title: Spatial Knowledge Canvas Visual Redesign
status: approved
requirement: ../requirements/TASK-002-spatial-knowledge-canvas-visual-redesign.md
---

# TASK-002 Plan — Spatial Knowledge Canvas Visual Redesign

This is the canonical implementation plan for TASK-002. It records code evidence from the current tree (post TASK-001) and the smallest presentation-layer change that satisfies the acceptance criteria.

**Gate:** `approved` — ChatGPT Plan review on PR #19 recorded `plan_approved=true` with binding decisions: solid canvas (no faint dots); clusters after quieting (presentation-only root underlays unless landscape already clear); keep `minZoom=0.4`; soften blocking tick (do not remove).

## Goal

Redesign the Learning Tree presentation layer so the product reads as a **Spatial Knowledge Workspace / Learning Knowledge Canvas**, not a React Flow / workflow-diagram application.

Preserve:

- Tree Canvas as Primary
- Focus ≠ Active Stack semantics
- Details / Chat contextual-right-workspace architecture
- Domain Engine, semantic parent/child tree, persistence boundary
- Multi-project architecture, localization, light/dark via `workspace.shell.colorScheme`
- Node Conversation / Learning Loop behavior
- TASK-001 dynamic edge routing (derive handles from live geometry; do not persist handles)

## Current-state findings

```text
App shell
  → header + ProjectSidebar + tree-pane (+ ContextualWorkspace column)
       → TreeCanvas (ReactFlow, no <Background />)
            → LearningNode + LearningNodeHandles
            → edges via toReactFlow / routeEdgesForNodes / edge-routing
```

### 1. Token and theme audit

Tokens live in [`src/ui/styles.css`](../../src/ui/styles.css) (`:root` / `[data-theme="light"]`, `[data-theme="dark"]`).

Already present and usable:

- Canvas / surfaces: `--color-bg-canvas`, `--color-bg-surface`, `--color-bg-elevated`, `--color-bg-node`
- Focus blue: `--color-learning-selected`, `--color-focus-ring`
- Active teal: `--color-accent`, `--color-learning-active`
- Parked / closed: `--color-learning-parked`, `--color-learning-completed`
- Spacing / radius / motion tokens
- Theme applied through `.shell[data-theme]` from `workspace.shell.colorScheme`

**Gap:** no dedicated quiet-edge / cluster / faint-pattern tokens. Prefer extending existing neutrals over inventing a large new palette. Do not add saturated decorative colors.

### 2. Canvas background — already past the demo grid

[`TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) does **not** mount XYFlow `<Background />`. Canvas fill comes from `.tree-pane` and `.react-flow*` using `--color-bg-canvas`.

Historical docs still mention a dotted grid; **code no longer has it**. Do not reintroduce a prominent pattern. Optional extremely faint dots only if a tokenized, theme-safe treatment is needed after review — default recommendation is **solid quiet canvas**.

Remaining “React Flow demo” feel comes from node/edge/chrome density, not from a Background component.

### 3. LearningNode still reads as a workflow card

Owner: [`src/ui/tree/LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) + `.learning-node*` in `styles.css`. Size: `NODE_WIDTH=260`, `NODE_HEIGHT=132` in [`layout.ts`](../../src/ui/tree/layout.ts).

Current grammar:

- 1px border + paper fill
- Focus: 2px selected-blue outline (`outline-offset: 2px`)
- Active / on-stack: teal fill + 4px `.stack-rail`
- Parked / closed: tinted fills; closed mutes text
- Lifecycle text already `visually-hidden` (testid retained)
- Goal shown via `.node-meta` (TASK-001)
- Chat: always-visible icon button (inline SVG, `nodrag nopan`)
- Recommended text line + blocked pip

**Problem vs requirement:** stacked status treatment (tint + rail + outline + badges) remains louder than “Address + Meaning + Minimal State”. Chat is permanent, not hover-revealed. Question typography (~13px) is slightly below the target 14–16px range.

### 4. Edges and handles — TASK-001 routing is done; quieting remains

| Piece | Evidence |
| --- | --- |
| Dynamic sides | [`edge-routing.ts`](../../src/ui/tree/edge-routing.ts) `deriveEdgeHandles` (dominant axis; vertical on ties) |
| Eight handles | [`node-handles.tsx`](../../src/ui/tree/node-handles.tsx); CSS `opacity: 0; pointer-events: none` |
| Live re-route | [`TreeCanvas`](../../src/ui/tree/TreeCanvas.tsx) `routeEdgesForNodes(derived.edges, nodes)` |
| Blocking cue | `#blocking-tick` marker only when `isBlocking` |

Default / active-stack edges still use relatively strong strokes (`edge-default` → `--color-border-strong` 1px; `edge-active-stack` → accent 2px). Requirement wants ~1–1.25px low-contrast quiet edges with Node >>> Edge priority. No generic arrowheads today — keep that. Soften blocking tick rather than remove semantic cue.

**Do not rebuild routing.** Refine CSS / marker only unless a visual fixture shows collapse that TASK-001’s default bezier cannot handle.

### 5. Shell chrome still competes with the canvas

- Header: `.shell-header` surface + bottom border; project title strong; tools include Chat + settings ([`App.tsx`](../../src/ui/App.tsx), `styles.css`)
- Sidebar: compact rows already (no selected card border), but 44px min-height rows and surface parity with header still compete
- Details: [`ContextualWorkspace`](../../src/ui/contextual/ContextualWorkspace.tsx) is a layout column with left border and `box-shadow: none` — architecture correct; nested section boxing can still recede
- Chat: [`ChatPanel`](../../src/ui/chat/ChatPanel.tsx) uses `--shadow-overlay`, which reads more modal than canvas extension

Bootstrap summary card over the tree ([`BootstrapSummary`](../../src/ui/projects/BootstrapSummary.tsx)) also adds bordered elevated chrome on first-layer views — keep functionally, quiet visually if touched.

### 6. Layout uniformity and Knowledge Clusters

[`computeLayout`](../../src/ui/tree/layout.ts) uses fixed gaps (`HORIZONTAL_GAP=40`, `VERTICAL_GAP=72`, `ROOT_GAP=64`) and places each `rootNodeIds` subtree left-to-right. Saved `nodePositions` override auto layout.

**Cluster feasibility without domain changes: yes, as presentation-only.**

Evidence:

- `TreeViewModel.rootNodeIds` = Core Questions (bounded ≤ 5)
- Each root owns a semantic subtree via existing parent/child edges
- Roots are already spatially separated by `ROOT_GAP`
- Region title can use the root node’s `question`

Plan: optional **cluster underlays** computed from current node positions (subtle tint, generous padding, small upper-left title). Decorative only — no new domain entities, no persisted clusters, no invented membership beyond root subtrees. If dragged positions make bboxes awkward, still draw loose regions rather than inventing semantics.

If underlays prove too risky for the first implementation slice, ship node/edge/chrome quieting first and keep cluster primitives as an explicit follow-on inside this task only if acceptance still fails the “knowledge landscape” first impression.

### 7. Zoom

`minZoom={0.4}`, `maxZoom={1.5}` in `TreeCanvas`. Viewport persists. **No zoom-aware progressive disclosure today.**

Requirement’s ~25% check is below current min zoom. Plan: keep 0.4 unless Plan review explicitly asks to lower it; verify 50/75/100/125% (and 40% as practical stand-in for “zoomed out”). Optional cheap CSS/content disclosure only if it does not add a new state subsystem.

### 8. Icons

No icon package. Node Chat already uses inline SVG + `Button variant="icon"`. Keep that pattern for hover-revealed chat.

### 9. Tests that protect regressions

| Area | Coverage |
| --- | --- |
| Node content / goal | `tests/ui/learning-node-content.test.tsx` |
| Node Chat / focus side effects | `tests/ui/node-chat.test.tsx` |
| Edge routing | `tests/ui/edge-routing.test.ts`, `tests/ui/to-react-flow.test.ts` |
| Shell / lifecycle testids | `tests/ui/workspace-shell.test.tsx`, `tests/ui/product-workspace.test.tsx` |
| Visual snapshots | `e2e/visual/workspace-surfaces.spec.ts` (+ linux PNGs) |
| M2.6 acceptance shots | `e2e/acceptance/m26-screenshots.spec.ts` + `docs/milestones/m2.6-screenshots/` |
| Behavioral e2e | `e2e/specs/*` (prefer preserve `data-testid` / `data-node-id`) |

## Design decisions

### D1 — Presentation-only scope

Touch primarily:

- `src/ui/styles.css`
- `src/ui/tree/LearningNode.tsx` (affordance visibility / hierarchy, not domain data)
- Possibly thin helpers for cluster underlays under `src/ui/tree/`
- Header / sidebar / contextual / chat CSS (and minimal markup class tweaks)

Do **not** change Domain Engine, selectors’ semantic meaning, persistence, conversation identity/pinning, or edge semantic class derivation beyond visual weight.

### D2 — Node visual grammar (target)

```text
Primary text: question (~14–16px, medium/semibold)
Secondary: optional goal (muted, smaller; keep clamp)
State: Focus = thin blue halo/accent; Active = small teal cue (prefer soft tint OR thin indicator, not both heavy)
Blocked: retain pip when meaningful
Lifecycle words: remain visually hidden on canvas
Chat: hover/focus-revealed corner icon; reserved space to avoid layout jump
Surface: soft paper, subtle/near-invisible border, elevation mainly on hover
```

Preserve `data-lifecycle`, `data-focus`, `data-on-stack`, `lifecycle-badge-*`, `node-goal-*`, `node-chat-*` testids.

### D3 — Edge quieting without re-routing

Keep TASK-001 handle derivation and live re-route. Reduce stroke contrast/width toward ~1–1.25px neutrals; active-stack related edges may be slightly stronger; unrelated/receded stay quiet. Soften blocking tick. Handles remain invisible at rest.

### D4 — Chrome recession

Lower header/sidebar visual weight (weaker borders, quieter surfaces, tighter rows where safe). Details stay a column with a subtle divider. Reduce Chat overlay shadow so it feels like canvas context, not a floating admin modal.

### D5 — Clusters

Implement root-subtree underlays as optional presentation primitives when cheap after node/edge quieting. No domain model. Document limitation: no named sections beyond Core Question roots; no multi-parent regions.

### D6 — Zoom disclosure

Defer unless needed for acceptance after the above. No large zoom-state system.

### D7 — Avoid full UI rewrite

Do not replace XYFlow, do not introduce whiteboard/mind-map editing, do not add manual edges, do not pixel-copy the reference image.

## Implementation order

1. Token polish only where needed for quieter edges / cluster tints / node surfaces (light + dark coherent).
2. Confirm solid canvas background (no demo grid); no `<Background />` reintroduction.
3. LearningNode redesign: question-first typography, restrained Focus/Active, hover chat, quieter recommended treatment.
4. Edge / marker quieting; keep dynamic routing.
5. Header recession.
6. Sidebar recession.
7. Contextual Details + Chat visual recession.
8. Optional root-derived cluster underlays.
9. Optional zoom-aware disclosure only if justified by headed review.
10. Update visual snapshots / targeted unit assertions; run `npm test` and `npm run test:e2e`.

## Test plan

### Unit / component

- Keep existing node-chat, edge-routing, learning-node-content, shell tests green (update assertions only when presentation contracts intentionally change).
- If hover-revealed chat is added, assert affordance remains reachable (e.g. visible on hover/focus-within) without opening Inspector and without drag interference.
- If clusters land, add a focused UI test that underlays render for root subtrees from view-model positions and do not mutate domain state.

### E2E / visual

- Refresh Linux snapshots for `e2e/visual/workspace-surfaces.spec.ts` and M2.6 screenshot suite when surfaces intentionally change; explain updates in the implementation PR.
- Headed review evidence for light/dark, populated tree, focus/active/blocked/closed, multi-edge node, drag, chat open, zoomed-out overview.

### Regressions to protect

Focus ≠ Chat auto-open; Details open on focus; conversation binding/pin; project switch; layout-only drag; semantic persistence; Blocking / Frontier / Learning Loop; localization; theme via `workspace.shell.colorScheme`.

## Non-goals

- Pixel-copying the reference product
- Domain changes for visual convenience
- Multi-parent semantics
- Manual freeform edges / whiteboard mode
- Icon library adoption
- Rebuilding edge routing or Conversation architecture
- Merging directly to `main` without Plan + Acceptance gates

## Risks

| Risk | Mitigation |
| --- | --- |
| Changing `NODE_WIDTH`/`NODE_HEIGHT` churns layout, chat offset, snapshots | Prefer CSS-internal quieting first; change shell size only if hierarchy requires it |
| Hover chat can cause layout jump | Reserve corner space; opacity/visibility transition only |
| Cluster underlays look like Trello columns | No strong border; low-saturation tint; padding; small title |
| Softening blocking marker loses cue | Keep distinct but restrained warning tick |
| Snapshot churn on Linux CI | Update from Linux/Playwright image; call out in PR |
| Scope creep into full shell rewrite | Follow ordered slices; stop when acceptance impression is met |

## Planning gate

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Code evidence recorded | true (this plan) |
| Smallest design chosen | presentation CSS + thin UI helpers; no domain rewrite |
| Cluster approach | presentation-only from `rootNodeIds` subtrees; optional if needed |
| Edge routing | reuse TASK-001; quiet visually |
| Plan approved | **false — awaiting ChatGPT review** |

## Handoff for ChatGPT Review TASK-002

Please review this plan against `docs/requirements/TASK-002-spatial-knowledge-canvas-visual-redesign.md`.

Blocking questions for reviewers:

1. Is solid canvas (no faint dots) acceptable given Background is already removed?
2. Should cluster underlays be in the first implementation slice or deferred until after node/edge/chrome quieting is reviewed visually?
3. May `minZoom` remain 0.4 (with 40% as zoomed-out stand-in), or must it drop toward 0.25?
4. Soften vs remove blocking tick — plan prefers soften; confirm.

Implementation must not start until `plan_approved=true` is recorded on the Requirement after review.
