# Project Development Overrides

## Purpose

Define project-specific development rules for learntree.

The project inherits the global Development Workflow Core from DevForge.

This file only contains project-specific differences.

## Workflow Binding

Global workflow source:

```
bewaterhere-coder/DevForge:contracts/development/
```

Adapter:

```
Cursor Development Adapter
```

## Project Rules

### Architecture

- Learning Tree uses Node as the primary learning unit.
- Project context is represented through learning nodes.
- AI interaction is bound to Node Context.

### Technical Constraints

- Keep project-specific architecture decisions in this file or task PRs.
- Do not modify global workflow contracts for project requirements.

### Task Constraints

Task-specific requirements, implementation constraints and acceptance criteria belong to the Task PR.

## Non Goals

This file does not redefine:

- Development lifecycle
- Review process
- Acceptance process
- Cursor workflow

Those are inherited from global contracts.
