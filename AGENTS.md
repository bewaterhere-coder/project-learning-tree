# Project Learning Tree — Agent Instructions

## Product principle

Conversation belongs to a Learning Node. A Learning Node does not belong to a Conversation.

## Tree principle

The learning tree is progressively materialized. Never eagerly generate a complete knowledge tree.

Only blocking questions become child nodes. Non-blocking adjacent questions belong in the Learning Frontier.

## Architecture

The domain layer must not depend on React, persistence, LLM providers, GitHub, network APIs, or browser APIs.

Dependencies point inward:

```text
UI / Infrastructure
        ↓
Workspace
        ↓
Application
        ↓
Domain
```

## AI boundary

LLMs propose learning actions. The domain engine validates and executes state changes. LLM output must never directly mutate domain state.

## Development rule

Implement one milestone at a time. Do not implement future milestone functionality unless required by an explicit current-milestone invariant.

## Verification

Every material domain state transition requires unit tests. A milestone is not complete until its acceptance tests pass.

## Scope discipline

The MVP is local-first. Do not add accounts, collaboration, server infrastructure, RAG, vector databases, heavy knowledge graphs, course-builder features, mobile apps, or plugin ecosystems unless the product spec is explicitly changed.
