# Project Learning Tree

An open-source experiment in **node-centered AI learning** for complex technical projects.

Most AI learning tools are conversation-centered. Complex learning is naturally branching: one question reveals blockers, adjacent questions, evidence gaps, and stopping conditions. Project Learning Tree explores a different model where learning is organized around questions rather than one ever-growing chat.

## Core thesis

> Conversation belongs to a Learning Node. A Learning Node does not belong to a Conversation.

The learning tree is progressively materialized. The system should not eagerly generate a complete knowledge tree. Only questions that block the current learning goal become child nodes; adjacent but non-blocking questions move to the Learning Frontier.

## MVP loop

```text
Create Project
→ Generate Core Questions
→ Focus Node
→ Learn in Node Conversation
→ Discover Blocking Child or Frontier Item
→ Evaluate Definition of Done
→ Close Node
→ Return to Parent / Next Node
```

## Architecture direction

- React + TypeScript + Vite
- `@xyflow/react` for Tree UI (derived from DomainSnapshot; not a source of truth)
- Vitest
- Pure domain engine with no dependency on React, persistence, LLM providers, GitHub, or network APIs

Zustand and Dexie/IndexedDB remain deferred past M2.

AI is an advisor. The domain engine is the authority for state transitions. DomainSnapshot is the single source of truth.

## Start here

1. Read `AGENTS.md`.
2. Review `docs/product/interaction-spec.md` and `docs/product/domain-model.md`.
3. M1 Domain Engine is complete: `docs/milestones/M1-domain-engine.md`.
4. M2 Tree UI: `docs/milestones/M2-tree-ui.md`.

```bash
npm install
npm test
npm run typecheck
npm run dev
```

## Status

M1 Domain Engine is complete. M2 Tree UI is in progress.

## License

MIT
