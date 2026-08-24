# Learntree Development Workflow Binding

## Purpose

This project no longer maintains a standalone development workflow.

The canonical workflow is provided by Coco Development Core.

Source:

```
Coco-AI-OS
contracts/development/workflow-core.md
```

## Workflow Binding

```yaml
workflow:
  source: Coco-AI-OS
  contract: contracts/development/workflow-core.md
  id: project_development
  version: 1.0

adapter:
  development:
    - cursor
```

## Project Commands

Project commands are resolved only after `.coco/bootstrap.md` has loaded this binding:

- `发送需求给 Cursor` → enter Requirement handoff for the current project.
- `Review TASK-<id> Plan` → run the Plan Review gate.
- `Review TASK-<id> PR` → run the Implementation Review gate.
- `验收 TASK-<id>` → run the Acceptance gate.

Loading this binding never executes a command by itself.

## Project Usage

This project uses:

- Development Workflow Core
- Task Contract
- Review Contract
- Acceptance Contract
- Cursor Development Adapter

## Project Overrides

Project-specific rules belong here.

Examples:

- Architecture constraints
- Testing requirements
- Repository conventions
- Technology decisions

Do not duplicate global workflow rules here.

## Cursor Adapter Usage

Cursor execution follows:

```
Core Workflow
      +
Cursor Development Adapter
```

Cursor reads task-specific information from the Task PR:

- Requirement
- Development Constraints
- Acceptance Criteria
- Plan

Cursor Prompt only provides context location and next action.

## Current Project Rules

- One requirement uses one Task/PR flow.
- Task-specific constraints belong to Task PR.
- Project-level rules belong to project overrides.
- Global workflow rules belong to Coco Development Core.
