# Learntree Development Workflow Binding

## Purpose

This project no longer maintains a standalone development workflow.

The canonical workflow is provided by DevForge.

Source:

```
bewaterhere-coder/DevForge
devforge.runtime.yaml
system/development-project-registry.yaml
workflows/workflow-registry.yaml
contracts/development/workflow-core.md
```

## Workflow Binding

```yaml
runtime:
  manifest: devforge.runtime.yaml
  project_registry: system/development-project-registry.yaml
  workflow_registry: workflows/workflow-registry.yaml

workflow:
  source: bewaterhere-coder/DevForge
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
- `#开发评审 TASK-<id>` → review the current Plan or implementation gate.
- `#开发验收 TASK-<id>` → run the Acceptance gate.

Legacy forms `Review TASK-<id> Plan`, `Review TASK-<id> PR`, and `验收 TASK-<id>` remain DevForge 1.x compatibility aliases.

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
- Global workflow rules belong to DevForge.
