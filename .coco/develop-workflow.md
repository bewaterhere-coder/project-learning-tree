# Develop Workflow Contract

## Purpose

Define the canonical development workflow for learntree.

## Workflow

```
Requirement Discussion
        ↓
Requirement Ready
        ↓
Task Created
        ↓
Cursor Plan
        ↓
ChatGPT Plan Review
        ↓
Plan Approved
        ↓
Cursor Implementation
        ↓
Implementation Review
        ↓
Acceptance
        ↓
Acceptance Approved
        ↓
Merge PR
        ↓
Read-back Verify
        ↓
Done
```

## Gate Rules

### Plan

Implementation cannot start before:

```
plan_approved = true
```

### Acceptance

Merge cannot start before:

```
acceptance_approved = true
```

### Done

Task completion requires:

```
merge_verified = true
```

## Actor Responsibility

ChatGPT:
- Requirement clarification
- Plan review
- Acceptance review

Cursor:
- Plan creation
- Implementation
- Tests

GitHub:
- PR persistence
- Merge state
- Final verification

## Rules

- One requirement uses one Task/PR flow.
- Do not skip stages.
- Review is not Acceptance.
- Acceptance is not Merge.
- Existing workflow contract has priority over generic workflows.
