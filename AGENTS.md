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

## Project workflow bootstrap

Before a project-development command or workflow-sensitive action, load `.coco/bootstrap.md` and follow its required load order. In particular, commands such as `发送需求给 Cursor`, `#开发评审 TASK-<id>`, and `#开发验收 TASK-<id>` require `.coco/development.yaml` and the DevForge workflow binding to be resolved first. Legacy Review/验收 forms remain compatibility aliases only.

Loading project contracts restores context only. It does not authorize or start a workflow action.

## Verification

Every material domain state transition requires unit tests. A milestone is not complete until its acceptance tests pass.

## Scope discipline

The MVP is local-first. Do not add accounts, collaboration, server infrastructure, RAG, vector databases, heavy knowledge graphs, course-builder features, mobile apps, or plugin ecosystems unless the product spec is explicitly changed.
