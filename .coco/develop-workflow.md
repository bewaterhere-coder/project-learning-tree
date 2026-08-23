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
4. Write task-specific Development Constraints into Task PR
5. Write Acceptance Criteria into Task PR
6. Set next_expected_actor = Cursor
7. Return a compact Cursor context handoff prompt

## Cursor Handoff Boundary

The Cursor prompt is a context handoff, not a duplicate requirement or policy document.

The handoff should contain only the minimum information Cursor needs to locate the task context and perform the next action:

- Task ID
- Repository
- Task PR number or URL
- Requirement Artifact location
- Development Constraints location
- Acceptance Criteria location
- Current workflow stage
- Current expected action

For the initial handoff, the expected action is:

```
Read the Task PR context and create an implementation plan.
Do not implement before ChatGPT approves the plan.
```

Do not copy the full requirement, task constraints, acceptance criteria, or project workflow into the Cursor prompt when those already exist in the Task PR or project contracts.

The prompt exists primarily to tell Cursor where the canonical development material lives and what it should do next.

## Task PR Development Constraint Boundary

Task-specific development constraints belong to the Task PR because different requirements may have different constraints.

The Task PR is the canonical container for the current requirement and should contain, directly or through referenced artifacts:

- Requirement
- Scope and out-of-scope boundaries
- Development Constraints
- Technical Constraints or Notes when needed
- Acceptance Criteria
- Cursor Plan
- Review findings
- Acceptance findings

Do not move task-specific constraints into global `.coco` project contracts.

Project contracts define only reusable project-level workflow rules.

## Cursor PR Boundary

Task PR must exist before Cursor starts work.

Cursor does not create development PR.

Cursor works inside the existing Task PR lifecycle.

Cursor responsibilities:

- Read the existing Task PR context
- Analyze requirement
- Create implementation plan
- Implement only after plan approval
- Add tests
- Update existing Task PR

Not Cursor responsibilities:

- Create Task
- Create Requirement Artifact
- Create PR
- Decide workflow transition

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
- Task-specific development constraints belong to Task PR, not global project contracts.
- Development plans belong to Task PR, not main.
- Implementation changes happen only inside Task branch/PR.
- Review records belong to Task PR.
- main only receives changes after Acceptance Approved.

## Artifact Output Boundary

Formal project artifacts must be generated as managed Artifacts.

Applicable artifacts:

- Requirement Artifact
- Development Constraints
- Acceptance Criteria
- Plan Review
- Implementation Review
- Acceptance Report

Rules:

- Do not use raw chat Markdown as the canonical project document.
- Artifact content is the source document for project workflow.
- Project files and PR content should reference the Artifact lifecycle.
- Cursor handoff prompts should reference canonical artifacts instead of duplicating them.

## User Output Boundary

Workflow execution may maintain full internal state, but user-facing output should only contain the information required for the current action unless the user explicitly asks for workflow or runtime details.

After `发送需求给 Cursor`, user-facing output should normally contain only:

- Task ID
- PR information
- Cursor handoff prompt
- ChatGPT next action

Do not dump internal workflow reasoning, state-machine details, or repeated task constraints into the user-facing response.

## Stage Actions

### Requirement Stage

ChatGPT actions:

- Confirm requirement
- Create TASK Artifact after explicit trigger
- Create Task PR after explicit trigger
- Write requirement into Task PR
- Write task-specific Development Constraints and Acceptance Criteria into Task PR
- Generate compact Cursor context handoff after Task PR is ready

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

- Read Task PR requirement and constraints
- Analyze requirement
- Create implementation plan
- Define technical approach
- Define tests and risks

ChatGPT actions:

- Review Cursor plan
- Approve plan or return plan changes

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

Generate fix guidance and Cursor handoff.
Return to Cursor on the same Task PR.

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
- Task PR creation and task-context persistence
- Compact Cursor context handoff generation
- Plan review
- Acceptance review

Cursor:
- Read existing Task PR context
- Plan creation
- Implementation after plan approval
- Tests
- Existing PR updates

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
- Task-specific constraints belong to the Task PR.
- Cursor prompt is a context pointer, not a duplicated contract.
