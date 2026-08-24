# Project Runtime Contract

## Purpose

Define the default runtime behavior for this ChatGPT Project.

All conversations inside this ChatGPT Project inherit this project context automatically.
No repeated project binding command is required.

## Project Bootstrap

Bootstrap contract:

```
.coco/bootstrap.md
```

When entering this project, bootstrap restores project context before workflow execution.

Important:

```
Load Runtime
      ≠
Execute Workflow
```

## Project Bootstrap Invocation

Bootstrap MUST be checked when:

- ChatGPT Project session starts
- Project context is entered
- Runtime Contract status is requested
- Development Workflow execution begins

Execution order:

```
Chat Session Start
      ↓
Project Bootstrap
      ↓
Project Runtime Contract
      ↓
Coco Runtime Resolution
      ↓
Development Workflow Contracts
```

## Project Scope

Project context priority:

```
Coco Runtime
    >
Project Runtime Contract
    >
Conversation
```

## Project Identity

```yaml
project:
  name: project-learning-tree
  repository: bewaterhere-coder/project-learning-tree
```

## Development Workflow Binding

This project does not own a standalone development workflow.

It inherits the Coco Development System contracts.

```yaml
workflow_binding:
  source: bewaterhere-coder/Coco-AI-OS
  core:
    contract: contracts/development/workflow-core.md
  task:
    contract: contracts/development/task-contract.md
  review:
    contract: contracts/development/review-contract.md
  acceptance:
    contract: contracts/development/acceptance-contract.md
  adapter:
    development:
      - cursor
```

Project-specific development rules belong to this project and should not redefine the global workflow core.

## Default Context

Inside this project:

- All relevant discussions belong to this project by default.
- Repository information should not be requested repeatedly.
- Bound workflow contracts apply to development conversations.

## Runtime Contract Health

Runtime loading status must be visible in project state.

```yaml
runtime_contract:
  expected:
    source:
      repository: bewaterhere-coder/Coco-AI-OS
      branch: main
      manifest: coco.runtime.yaml
    workflow:
      id: project_development
      version: 1.0
    revision_policy: canonical_main

  loaded:
    version:
    revision:
    health: unknown
```

Rules:

- Expected records the canonical Runtime source and compatible Workflow required by this project.
- `revision_policy: canonical_main` resolves the current canonical revision; this project must not pin an unrelated project commit as the Coco Runtime revision.
- Loaded records the Runtime Contract actually resolved in the current session.
- A project file must not assume the current session has loaded the canonical Runtime.
- Stale Contract state requires refresh before workflow execution.

Runtime Contract states:

```text
loaded:
  Current session matches the resolved canonical revision and compatible Workflow version.

outdated:
  Current session loaded an older revision.

unknown:
  Runtime resolution has not been executed.

unavailable:
  Canonical Runtime source cannot be reached.
```

## Project State Version

Project state and runtime contract use separate version tracking.

```yaml
project_state:
  version: 1.0
```

Rules:

- Runtime Contract version tracks workflow and execution rules.
- Project State version tracks project goals, milestones, tasks and progress.
- Updating workflow contracts does not modify project state version.
- Updating project milestones or project progress does not modify runtime contract version.

## State Output Requirements

`项目状态` output must include both Runtime Health and Project State version.

Example:

```yaml
runtime_health:
  source_repository: bewaterhere-coder/Coco-AI-OS
  source_branch: main
  workflow_id: project_development
  contract_version: 1.1
  revision_policy: canonical_main
  loaded_revision:
  health: unknown

project_state:
  version: 1.0
```

## State

Project state should track:

```yaml
project_state:
  version: 1.0
  current_task:
  active_pr:
  completed_tasks:

runtime_health:
  source:
  branch:
  revision:
  health:
```
