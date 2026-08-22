---
task_id: TASK-001
title: Learning Node Content, Direct Chat, and Dynamic Multi-Edge Routing
status: plan_review
requirement: ../requirements/TASK-001-node-chat-dynamic-edge-routing.md
---

# TASK-001 Plan — Node Content, Direct Chat, Dynamic Edge Routing

This is the canonical implementation plan for TASK-001. It records code evidence for the requirement’s planning questions and the smallest change that satisfies the acceptance criteria.

**Gate:** `plan_review` — revised per PR #17 blocking findings; awaiting re-review (`plan_approved=true`).

Implementation of product code is forbidden until that gate is recorded after Plan review. Writing this file is not Done for the task.

## Review revisions (PR #17)

Two blocking findings addressed in this revision:

1. **Multi-link alignment** — Requirement and Plan now state explicitly that semantic hierarchy stays a tree (one parent, many children). This task supports multiple **visible graph links** without multi-parent semantics or Frontier-as-edge.
2. **Node Chat side effects** — `openChatForNode` no longer calls `focusAndOpenInspector`. It focuses the node only when needed for follow-focus binding, opens Chat, and does **not** open the Inspector.

## Goal

Upgrade the Learning Tree graph so that each Learning Node is a readable learning unit, provides a direct node-bound conversation entry, and supports clear multi-edge relationships whose visual attachment adapts to node position.

Preserve:

- `DomainSnapshot` as semantic source of truth
- `@xyflow/react` as derived view only
- Focus separate from opening Chat
- existing Conversation ownership, pin, project switch, and persistence contracts
- Blocking / Frontier / Learning Loop semantics

## Current-state findings

```text
DomainSnapshot
  → selectTreeViewModel()     [application]
       → TreeViewModel
            → toReactFlow()   [ui/tree]
                 → LearningFlowNode[] + Edge[]
                      → TreeCanvas → LearningNode
```

### 1. Which component owns Learning Node rendering?

[`src/ui/tree/LearningNode.tsx`](../../src/ui/tree/LearningNode.tsx) is the visual owner (question, lifecycle class, stack rail, blocked pip, recommended badge).

[`src/ui/tree/TreeCanvas.tsx`](../../src/ui/tree/TreeCanvas.tsx) `FlowLearningNode` only wraps that view with XYFlow handles and registers `nodeTypes.learningNode`.

### 2. How node data maps from `DomainSnapshot` into XYFlow

1. [`selectTreeViewModel`](../../src/application/selectors/tree-view-model.ts) walks the tree and projects `question`, lifecycle, blocked, stack, and focus. It does **not** project `goal` or `summary`.
2. [`toReactFlow`](../../src/ui/tree/to-react-flow.ts) copies `TreeNodeView` into `LearningFlowNode` at a fixed **260×92** shell ([`NODE_HEIGHT = 92`](../../src/ui/tree/layout.ts)).
3. Positions prefer saved [`WorkspaceLayout.nodePositions`](../../src/workspace/types.ts) over auto-layout.

Canvas today: two-line clamped `question` plus state cues. Unused `.node-meta` already exists in [`src/ui/styles.css`](../../src/ui/styles.css). `goal` and `summary` currently appear only in the inspector ([`selectInspectorViewModel`](../../src/application/selectors/inspector-view-model.ts)).

### 3. How Focus and Conversation open/binding are wired

| Action | Path | Opens Chat? |
| --- | --- | --- |
| Click node body | `TreeCanvas.onNodeClick` → `focusAndOpenInspector` → domain `focusNode` | No |
| Header “聊聊这个问题” | `chat-open-header` → `openChat()` | Yes, `follow-focus` |
| Inspector | `chat-open` → `openChat()` | Yes, `follow-focus` |

[`openChat()`](../../src/workspace/session.ts) sets `chatOpen: true` and resets `chatBinding` to `{ mode: "follow-focus" }`. Binding identity is resolved by [`selectBoundConversationIdentity`](../../src/application/selectors/chat-binding.ts).

There is **no Chat control on graph nodes**. No `nodrag` / `nopan` classes are used. Focus-does-not-open-Chat is already covered in [`tests/ui/node-chat.test.tsx`](../../tests/ui/node-chat.test.tsx).

### 4. How handles and edges are constructed

- `FlowLearningNode` mounts a **target Top** handle and a **source Bottom** handle. No handle `id`. No `sourceHandle` / `targetHandle`.
- Edges are parent→child only, with CSS flags (`edge-active-stack`, `edge-quiet`, `edge-blocking`) and a blocking SVG marker. Default bezier. No custom edge component. `nodesConnectable={false}`, `edgesReconnectable={false}`, no `onConnect`.
- [`TreeCanvas`](../../src/ui/tree/TreeCanvas.tsx) keeps **live drag positions** in local `nodes` state, but still renders `edges={derived.edges}` from **saved** positions, so attachment cannot follow a drag.

Edge routing is not persisted. Layout preferences store `nodePositions` only.

### 5. Are multiple edges already supported semantically?

Yes for **multiple outgoing** parent→child links under the current tree domain; no extra domain types are required for this task.

The domain is a **tree**:

- many `childIds` → multiple outgoing edges from one node;
- at most one `parentId` → at most one incoming parent edge;
- blocking, Active Stack, and receded are **flags on the same parent→child edge**, not separate edge entities.

A node may therefore show **one incoming plus multiple outgoing** visible links—the combination the current domain already allows. **Multi-parent semantics are not supported** and are out of scope; introducing them would require a separate Domain/Product decision.

**Frontier is not a graph edge** and will not become one in this task.

The UI must not impose a one-in/one-out **handle or routing restriction**. The domain cardinality itself does not need to change.

### 6. Smallest robust way to derive attachment after movement

Derive handle side from **node-center deltas at render time**. Persist only `nodePositions` as today. Do not store `sourceHandle` / `targetHandle` in DomainSnapshot, layout preferences, or the conversation store.

### 7. Are handle offsets or custom edge routing needed?

Not for the first slice. Default bezier from one handle per side already fans to different children. Do not add Elk/Dagre, a custom edge component, or per-edge offset handles unless a test fixture shows collapse. Handles stay visually secondary (existing CSS already sets `.react-flow__handle { opacity: 0 }`).

### 8. Which tests already protect regression areas?

| Area | Primary coverage |
| --- | --- |
| Focus | `tests/domain/activation-and-focus.test.ts`, `tests/ui/tree-interactions.test.tsx`, `tests/ui/node-chat.test.tsx` |
| Per-project pin | `tests/workspace/chat-layout.test.ts`, `tests/application/chat-binding.test.ts`, `tests/ui/node-chat.test.tsx` |
| Project switching | `tests/workspace/multi-project.test.ts`, `tests/ui/workspace-shell.test.tsx` |
| Node dragging (layout-only) | `tests/workspace/multi-project.test.ts`, `tests/ui/layout-node-changes.test.ts`, `tests/ui/to-react-flow.test.ts` |
| Semantic persistence | `tests/workspace/semantic-persistence.test.ts` |
| Conversation persistence | `tests/conversation/store.test.ts`, `tests/conversation/identity-routing.test.ts` |
| Blocking / Frontier | `tests/domain/blocking-children.test.ts`, `tests/domain/frontier-and-parking.test.ts` |
| Learning Loop | `tests/ui/learning-loop.test.tsx` |
| Architecture boundaries | `tests/ui/import-boundary.test.ts` |

**Gaps this task must add:** node detail on canvas, in-node Chat action, derived handles, live reroute after drag. Unit UI tests stub `@xyflow/react` via [`tests/ui/xyflow-stub.tsx`](../../tests/ui/xyflow-stub.tsx).

## Design decisions

### A. Node content

Show on every canvas Learning Node:

- `question` (existing, still clamped to two lines)
- truncated **`goal`** as the detail line (always present on the domain node; this is “what the question is about”)
- existing state cues (lifecycle color, blocked pip, stack rail, recommended)
- a direct Chat control

Do **not** render conversation history, DoD, or evidence on the node.

Do **not** put `summary` on the canvas in this task. `summary` is a post-learning recap, not the question unit.

Extend [`TreeNodeView`](../../src/application/selectors/tree-view-model.ts) with `goal: string` only.

Increase [`NODE_HEIGHT`](../../src/ui/tree/layout.ts) modestly (target ~128–140px) so two clamped text blocks plus Chat fit without breaking layout. Reuse `.node-meta` for the goal line with `-webkit-line-clamp: 2`.

Eligible nodes: every materialized Learning Node on the canvas, including parked and closed nodes.

### B. Chat action

Focus and Open Chat stay **separate entry points**, and Node Chat must not add Inspector side effects.

Add workspace helper `openChatForNode(workspace, nodeId)`:

```text
applySelectedCommand({ type: "focusNode", nodeId })   // domain focus only
then openChat()                                       // follow-focus binds to currentFocusNodeId
```

**Do not** call `focusAndOpenInspector`. Node Chat must not set `inspectorOpen: true`.

One `commit()`. Clicking Chat on node N:

- sets Current Focus to N when follow-focus binding requires it;
- opens Chat bound to N;
- leaves Inspector closed if it was closed (does not open Contextual Workspace as a side effect).

Header and inspector Chat behavior stay unchanged.

Chat button contract:

- `stopPropagation` so the button owns the action
- XYFlow classes `nodrag nopan` so it does not drag or pan the graph
- `data-testid={`node-chat-${id}`}`
- accessible name from existing i18n `chat.open` (“聊聊这个问题” / “Talk about this question”)
- `Button variant="icon"`; compact corner control, not a transcript

Body click still: `focusAndOpenInspector` → Focus + open Inspector, **no** Chat.

If Chat was pinned to another node, `openChat()` already resets to `follow-focus`, which is the correct rebind.

Conversation ownership remains in the Conversation / ChatHost layer. The node button only invokes the workspace helper.

### C. Dynamic edge attachment

Add a pure UI helper [`src/ui/tree/edge-routing.ts`](../../src/ui/tree/edge-routing.ts). Keep it out of Application so Application stays XYFlow-free.

```text
dx = targetCenter.x - sourceCenter.x
dy = targetCenter.y - sourceCenter.y
if |dx| > |dy|:
  target right of source → source.right → target.left
  else → source.left → target.right
else:
  target below source → source.bottom → target.top
  else → source.top → target.bottom
tie (|dx| == |dy|): prefer vertical (matches default tree layout)
```

`FlowLearningNode` mounts **8** hidden handles (`source` / `target` × top / right / bottom / left) with stable ids (`s-top`, `t-left`, …). Edges receive `sourceHandle` / `targetHandle` **only in view state**.

`TreeCanvas` assigns handles from **current local node positions**, so attachment updates during drag, not only after `onNodeDragStop`. Semantic edge id, className, and markerEnd stay as today.

Default auto-layout remains top-down, so unset user positions still render `s-bottom` → `t-top`. Visual regression for undragged trees should be near-zero.

## Layering

| Layer | Change |
| --- | --- |
| Domain | None |
| Application | `TreeNodeView.goal` projection only |
| Workspace | `openChatForNode`; no new persisted fields |
| UI | LearningNode content + Chat; 8 handles; derived routing; `NODE_HEIGHT` |
| Conversation | Unchanged identity and store |

## Implementation order (after `plan_approved=true`)

1. **Routing (pure + adapter):** `edge-routing.ts`; `toReactFlow` / `TreeCanvas` apply handles from positions; 8 handles on `FlowLearningNode`.
2. **Node content:** project `goal`; render truncated detail; bump node height and CSS.
3. **Chat entry:** `openChatForNode`; wire `LearningNode` → `App`; `nodrag` + `stopPropagation`.
4. **Tests** below, then typecheck / unit tests / existing e2e smoke.

## Tests to add after approval

- [`tests/ui/edge-routing.test.ts`](../../tests/ui/edge-routing.test.ts) — Given/When/Then for right / left / above / below, diagonal primary axis, vertical tie-break, and that a position swap changes handles. No domain types.
- [`tests/ui/to-react-flow.test.ts`](../../tests/ui/to-react-flow.test.ts) — default tree still `s-bottom` / `t-top`; relocated child gets a new pair; handles absent from domain snapshot; parent with multiple children renders multiple outgoing edges.
- [`tests/workspace/chat-layout.test.ts`](../../tests/workspace/chat-layout.test.ts) — `openChatForNode` applies domain `focusNode`, opens chat, follow-focus binds to that node, does **not** set `inspectorOpen`, does not write the semantic store.
- [`tests/ui/node-chat.test.tsx`](../../tests/ui/node-chat.test.tsx) — click `node-chat-*` opens the panel bound to that node; Inspector stays closed when it was closed; body click still opens Inspector and does not open Chat.
- Node content assertion: goal text visible; long goal does not explode layout (`data-testid` on `.node-meta`).

[`tests/ui/xyflow-stub.tsx`](../../tests/ui/xyflow-stub.tsx) already renders `LearningNode`, so the Chat button will appear in existing UI tests. Optionally surface derived `sourceHandle` on stub edges if a canvas-level test needs it; do not turn the stub into a second routing engine.

**Regression (must stay green):** `tree-interactions`, `workspace-shell`, `chat-layout`, `chat-binding`, `multi-project`, `semantic-persistence`, `conversation/store`, `blocking-children`, `frontier-and-parking`, `learning-loop`, `import-boundary`.

No new e2e required for the first slice: handle geometry is unit-tested. Add e2e only if unit tests cannot express a failed attachment.

## Non-goals

- Redesign of the entire Learning Tree UI
- Frontier-as-edge or new domain relationship types
- **Multi-parent semantic relationships** (separate Domain/Product decision if ever needed)
- Conversation history inside graph nodes
- Persisted `sourceHandle` / `targetHandle`
- Elk / Dagre / custom pathfinding
- Workspace or Domain architecture redesign
- M4 or other future-milestone work

## Planning gate

| Item | Status |
| --- | --- |
| Requirement ready | true |
| Canonical plan written | this file |
| Plan approved | false — revised; awaiting re-review |
| Implementation | blocked until `plan_approved=true` |
| Next expected actor | chatgpt (Plan re-review) |
