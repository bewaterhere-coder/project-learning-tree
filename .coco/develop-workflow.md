# Develop Workflow Contract

## Purpose

Define the canonical development workflow for learntree.

Workflow is controlled by Stage + Action + Contract Gate.
A failed gate blocks transition to the next stage.

## Workflow

```
Requirement Discussion
        ↓
Requirement Ready
        ↓
Task Created + Task PR Created
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

## Workflow Trigger Boundary

Loading this workflow restores project context only.

Loading workflow does not automatically advance task state.

```
Workflow Loaded
    ≠
Workflow Executed
```

Requirement discussion must remain in discussion stage until an explicit development trigger is provided.

## Requirement Discussion Boundary

Allowed:

- Discuss requirement
- Clarify scope
- Compare solutions
- Refine acceptance criteria

Not allowed:

- Create Task automatically
- Create PR automatically
- Send to Cursor automatically
- Enter implementation workflow

## Development Trigger

Only explicit user intent starts the development workflow.

Example:

```
发送需求给 Cursor
```

Action:

1. Create TASK Artifact
2. Create corresponding Task PR
3. Write Requirement into Task PR
4. Set next_expected_actor = Cursor

## Task PR Boundary

```
main
  ↑
  |
Merge Only
  |
Task PR Lifecycle
```

Rules:

- Requirement documents belong to Task PR, not main.
- Development plans belong to Task PR, not main.
- Implementation changes happen only inside Task branch/PR.
- Review records belong to Task PR.
- main only receives changes after Acceptance Approved.

## Stage Actions

### Requirement Stage

ChatGPT actions:

- Confirm requirement
- Create TASK Artifact after explicit trigger
- Create Task PR after explicit trigger
- Write requirement into Task PR

Gate:

```
requirement_ready = true
pr_created = true
```

Fail:

Stop. Cannot enter Plan.

---

### Plan Stage

Cursor actions:

- Analyze requirement
- Create implementation plan
- Define technical approach
- Define tests and risks

Gate:

```
plan_exists = true
plan_review_passed = true
```

Fail:

Return to Cursor for plan adjustment.

Cannot implement.

---

### Implementation Stage

Cursor actions:

- Implement approved plan
- Add tests
- Update Task PR

Gate:

```
implementation_complete = true
tests_passed = true
```

Fail:

Return to Cursor.

Cannot enter Acceptance.

---

### Acceptance Stage

ChatGPT actions:

- Review requirement
- Review implementation
- Verify tests

Pass:

```
acceptance_approved = true
```

Continue to Merge.

Fail:

Generate fix prompt.
Return to Cursor.

---

### Merge Stage

GitHub actions:

- Merge approved PR
- Verify main state
- Update task state

Gate:

```
merge_verified = true
```

## Actor Responsibility

ChatGPT:
- Requirement clarification
- Task creation after explicit trigger
- Cursor prompt generation after Task creation
- Plan review
- Acceptance review

Cursor:
- Plan creation
- Implementation
- Tests
- PR updates

GitHub:
- Task PR persistence
- Merge
- Final state verification

## Rules

- One requirement uses one Task/PR flow.
- Do not skip stages.
- Failed contract blocks transition.
- Review is not Acceptance.
- Acceptance is not Merge.
- Existing workflow contract has priority over generic workflows.
- Workflow loading never automatically advances workflow state.
