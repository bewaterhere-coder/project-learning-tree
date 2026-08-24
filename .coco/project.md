# Project Context — Project Learning Tree

## Identity

- Project ID: `project-learning-tree`
- Name: Project Learning Tree
- Repository: `bewaterhere-coder/project-learning-tree`
- Default branch: `main`

## Product Model

Project Learning Tree is an open-source experiment in node-centered AI learning for complex technical projects. Learning is organized around Learning Nodes/questions rather than one ever-growing conversation.

Core thesis:

> Conversation belongs to a Learning Node. A Learning Node does not belong to a Conversation.

The tree is progressively materialized: blocking questions become child nodes; adjacent non-blocking questions move to the Learning Frontier.

## Current Goal

Continue evolving the Learning Tree MVP beyond M3 Node Conversation, including M4 Project Learning Bootstrap. The Coco Project Learning Contract remains the canonical methodology; Learning Tree executes it through a versioned adapter rather than becoming a second contract. Preserve the domain/state boundaries established by the existing product and architecture documents.

## Important Architecture Context

- React + TypeScript + Vite.
- `@xyflow/react` renders the Tree UI from `DomainSnapshot`; the graph UI is not the source of truth.
- The pure domain engine owns state transitions and has no dependency on React, persistence, LLM providers, GitHub, or network APIs.
- Repository evidence is loaded through an injected application port; `src/framework` only normalizes that evidence and does not fetch.
- The Coco Project Learning Contract is the canonical methodology. `src/framework` is Learning Tree's versioned executable adapter of that contract.
- `DomainSnapshot` is the semantic source of truth.
- Workspace/UI preferences are separate from semantic persistence.
- AI is an advisor; the domain engine remains authoritative.

## Recovery Entry Points

Read only as needed for the current task:

- `.coco/bootstrap.md` — project workflow bootstrap and load order.
- `.coco/development.yaml` — canonical DevForge Runtime, workflow, adapter and artifact binding.
- `.coco/project-runtime.md` — human-readable Runtime compatibility and health expectations.
- `.coco/workflow-binding.md` — DevForge Workflow Core and Cursor adapter compatibility guide.
- `.coco/project-overrides.md` — project-specific development rules.
- `.coco/task-state-model.md` — project development stages and gates.
- `AGENTS.md`
- `docs/product/interaction-spec.md`
- `docs/product/domain-model.md`
- `docs/milestones/`
- `docs/design/`

Operational task state should be derived from current GitHub Issues, Pull Requests, reviews, checks, and repository reality rather than copied into this file.

## Durable Constraints

- Do not duplicate GitHub task/PR/CI state here.
- Current code and verified repository reality outrank stale documentation.
- Update durable architecture/decision/project knowledge when code changes invalidate it.
- Keep this file a lightweight recovery surface, not a second knowledge base.
