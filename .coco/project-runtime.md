# Project Runtime Contract

## Purpose

Define the default runtime behavior for this ChatGPT Project.

All conversations inside this ChatGPT Project inherit this project context automatically.
No repeated project binding command is required.

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
  workflow: github-pr-development
```

## Default Context

Inside this project:

- All relevant discussions belong to this project by default.
- Repository information should not be requested repeatedly.
- Project workflow rules apply to all development conversations.

## Development Workflow

Code changes follow:

```
Requirement
    ↓
TASK
    ↓
PR
    ↓
Cursor Implementation
    ↓
Review
    ↓
Acceptance
    ↓
Merge
```

## Cursor Workflow

Development requests must include:

- TASK ID
- Repository
- Branch
- PR context
- Implementation requirements

Rules:

- One requirement uses one PR.
- Do not reuse unrelated PRs.
- Do not modify main directly.
- Complete implementation before review.

## Command Resolution

Project commands should use this workflow.

Examples:

`review TASK-x`

Review the implementation against requirements.

`验收 TASK-x`

Validate acceptance criteria.

`merge PR-x`

Update project completion state after merge.

## Develop Workflow Contract Binding

The project uses the following workflow contracts:

```
.coco/develop-workflow.md
.coco/task-state-model.md
```

When these contracts exist, they are the Source of Truth for development execution.

Rules:

- Do not replace project workflow with generic development workflow.
- Do not skip workflow stages.
- Current task stage determines allowed actions.
- Review and Acceptance are separate gates.

## Runtime Contract Health

Runtime loading status must be visible in project state.

```yaml
runtime_contract:
  version: 1.1
  revision: e51681c16556935a841ef0bb97735706dfecf447
  source: GitHub
  branch: main
  health: loaded
```

Rules:

- Version identifies Contract semantic version.
- Revision identifies the exact Git commit.
- Runtime state should report whether the loaded Contract matches the latest revision.
- Stale Contract state requires refresh before workflow execution.

## State

Project state should track:

```yaml
project_state:
  current_task:
  active_pr:
  completed_tasks:

runtime_health:
  source:
  branch:
  revision:
  health:
```
