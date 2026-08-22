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
- `@xyflow/react`
- Zustand
- Dexie / IndexedDB
- Vitest
- Pure domain engine with no dependency on React, persistence, LLM providers, GitHub, or network APIs

AI is an advisor. The domain engine is the authority for state transitions.

## Start here

1. Read `AGENTS.md`.
2. Review `docs/product/interaction-spec.md` and resolve open product questions.
3. Use Cursor Plan Mode for `docs/milestones/M1-domain-engine.md`.
4. Implement M1 only after the spec is accepted.

## Status

Product specification / pre-implementation.

## License

MIT
