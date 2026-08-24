# Project Bootstrap Contract

## Purpose

Define how a new ChatGPT conversation restores learntree project context.

## Bootstrap Rule

Entering this project should restore context before any workflow action.

Load order:

```
.coco/project.md
        ↓
.coco/project-runtime.md
        ↓
.coco/workflow-binding.md
        ↓
.coco/project-overrides.md
        ↓
.coco/task-state-model.md
        ↓
.coco/project-state.md (if exists)
```

Every required path above must be read successfully before the Development Workflow is reported as loaded. Optional project state may be absent.

## Important Boundary

Loading project contracts only restores context.

It does not automatically execute workflow actions.

```
Load Workflow
      ≠
Start Development
```

## Requirement Discussion Boundary

When a user discusses an idea or requirement:

Allowed:

- discuss requirement
- refine scope
- compare solutions
- analyze risks

Not allowed:

- create Task
- create PR
- call Cursor
- enter implementation stage

## Development Trigger

Only explicit user intent starts development workflow.

Example:

```
发送需求给 Cursor
```

Then:

```
Create Task
        ↓
Create PR
        ↓
Write Requirement Artifact
        ↓
Wait for Cursor Plan
```

## State Restoration

After loading contracts:

- report Runtime Health
- report current Project State
- report current Task Stage
- wait for user action
