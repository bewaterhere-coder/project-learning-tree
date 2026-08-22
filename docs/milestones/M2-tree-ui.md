# M2 — Tree UI

## Goal

Implement a minimal Tree UI so a user can observe and operate an existing Learning Tree without AI, persistence, or chat.

M2 verifies:

> Tree UI can clearly express Learning Node, Active Stack, Current Focus, Derived Blocked, and basic learning state.

M1 Domain Engine is frozen. M2 must not redesign the Domain Model.

## Core invariant

```text
DomainSnapshot is the single source of truth.
```

Data flow:

```text
DomainSnapshot
→ Application Selectors
→ TreeViewModel
→ XYFlow Node[] / Edge[]
```

Forbidden:

```text
XYFlow Node[] → reverse source of truth
```

Every business-state change must come from a Domain operation’s new `DomainSnapshot`.

UI local state may store viewport, zoom, hover, panel expand/collapse, and other purely visual chrome.

UI local state must not store node lifecycle, `activeStack`, `currentFocusNodeId`, blocked, Definition of Done satisfaction, Evidence relationships, or parent/child relationships.

## Deliverables

- Thin `src/application` command/selector layer
- Tree canvas (`@xyflow/react`) with parent/child edges
- Four-channel visuals: lifecycle, Active Stack, Current Focus, derived Blocked
- Read-only Node Inspector
- Actions: focus, activate, park, resume, close, returnToParent
- DomainError display
- Demo fixture built only through public Domain operations
- Unit tests for selectors, commands, UI interactions, and import/state boundaries

## Architecture

```text
src/ui  +  src/fixtures
        ↓
src/application
        ↓
src/domain         (frozen M1)
```

- UI never assigns `lifecycle`, `activeStack`, or `currentFocusNodeId`.
- `@xyflow/react` must not appear in `src/domain` or `src/application`.
- Application maps UI commands 1:1 onto existing Domain operations. It does not compose extra focus/stack mutations.
- Activate always calls `activateNode`. UI copy differs by node kind:
  - Root / Core Question → `开始学习`
  - Blocking Child → `进入这个问题`

## Fixture builders

`src/fixtures` may expose reusable builders such as:

```text
createDemoTreeFixture
createBlockedBranchFixture
createClosableNodeFixture
```

Builders may only call public Domain operations. They must not patch `DomainSnapshot` or write lifecycle / activeStack / blocked directly. UI tests should reuse builders instead of replaying a full Domain workflow by hand.

## Constraints

- No AI Chat, LLM providers, GitHub ingestion, IndexedDB/Dexie, auth, backend, RAG, or collaboration.
- No Frontier UI, Focus Panel conversation, Reopen UI, or create-blocking-child UI.
- No drag-to-change-parent and no free-form mind map editing.
- Do not start M3.

## Exit criteria

M2 is complete only when the M2 acceptance scenarios pass, Domain tests still pass, DomainSnapshot remains the only business source of truth, and the completion checklist in the M2 plan is satisfied.
