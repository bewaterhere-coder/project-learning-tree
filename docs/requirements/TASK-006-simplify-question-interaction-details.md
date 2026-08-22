---
task_id: TASK-006
title: Simplify question interaction and details panel
repository: bewaterhere-coder/project-learning-tree
task_ref: task/TASK-006-simplify-question-interaction-details
integration_ref: main
pr:
  number: null
  head_ref: task/TASK-006-simplify-question-interaction-details
  base_ref: main
  state: pending
development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: cursor
artifacts:
  plan: ../plans/TASK-006-plan.md
transport:
  type: github-pr
---

# TASK-006 — Simplify Question Interaction and Details Panel

## Goal

Remove redundant learning workflow and duplicated actions from the Question Details UI.

The product model should be:

> A Question is the learning unit. Clicking, reading, chatting about, and extending that Question is already learning.

Users should not need to explicitly "start learning" a Question or manage a learning-session state before using it.

## Product Principle

```text
Question Node = primary interaction surface
Question Details = knowledge / reflection surface
```

Do not duplicate node operations inside the right-side details panel.

## Problem

The current right-side details experience contains actions and navigation that are redundant with the Question node itself, including patterns such as:

- 开始学习 / Start Learning
- 聊聊这个问题
- 添加子问题
- 返回上一个问题 / parent-question navigation
- 未开始 / 学习中 / Active Learning style states

These interactions make the product feel like a workflow/state machine instead of a question-driven learning tree.

The tree itself already expresses parent/child navigation, and node-level affordances can already support chat and child-question creation.

## Requirements

### 1. Remove explicit learning-start UX

There must be no required "Start Learning" step for a Question.

Remove or stop exposing primary-flow concepts such as:

- 开始学习
- 进入学习
- 暂停学习
- 继续学习
- 未开始
- 学习中
- Active Learning
- Current Learning Node

Clicking/focusing a Question is sufficient to interact with it.

Do not add persisted state solely to track whether a user has "started learning" a Question.

Existing internal domain state may remain if required by confirmed architecture, but it must not leak into the primary UI unless it has clear user value.

### 2. Question node is the primary interaction surface

The Question node/card should own the common operations related to that Question.

At minimum, the node interaction model should support:

- click/focus Question
- open contextual chat for the Question
- add a child Question
- show child count when useful
- show completion/progress when useful
- mark/represent completion according to the existing completion model

Do not require the user to open Details merely to perform these operations.

### 3. Remove duplicated actions from the right-side Details panel

The Question Details panel must not duplicate operations already available on the node.

Remove from the Details panel:

- “聊聊这个问题” / Chat action
- “添加子问题” / Add child question action
- “返回上一个问题” or equivalent parent/back navigation
- “开始学习” or equivalent learning activation actions
- explicit learning-state controls whose only purpose is to model Start / Learning / Pause / Resume

The tree structure itself is the parent/child navigation model. Do not create a second navigation system inside Details.

### 4. Details panel becomes a knowledge/reflection surface

The right-side Question Details panel should be intentionally minimal.

Its primary user-facing content should be:

#### 达成条件

What must be understood, answered, verified, or completed for this Question to be considered complete.

Use the current criterion / Definition-of-Done capability where appropriate, but present it with user-facing language such as `达成条件` in zh-CN.

#### 心得

A learner-owned reflection / learning record for the Question.

This is where the user can capture conclusions, understanding, observations, or lessons learned.

Prefer the label `心得` in zh-CN rather than implementation-oriented terminology such as `Summary` or `Learning Record` when the user-facing meaning is the learner's own understanding.

Small supporting metadata may remain only when it materially helps understanding, but the panel must not become another action dashboard.

### 5. Keep completion semantics simple in the UI

For this UX, the meaningful user-facing state is primarily:

```text
not completed -> completed
```

The default/not-completed state usually does not need a prominent textual badge.

Do not introduce or preserve a visible learning-state machine just to express progress.

Progress should come from actual learning structure and completion facts, for example child-question completion, not from whether the user clicked a Start Learning button.

### 6. Direct question interaction is the learning flow

Expected user flow:

```text
click Question
→ read / inspect it
→ chat about it when needed
→ add child Questions when deeper questions emerge
→ record 达成条件 / 心得
→ complete when understood
```

Not:

```text
click Question
→ Start Learning
→ enter Learning state
→ open Details
→ click Chat
→ add child through Details
→ manage lifecycle state
```

### 7. zh-CN copy

When locale is `zh-CN`, all new/changed user-facing strings in this task must use Chinese.

Preferred labels:

- 达成条件
- 心得
- 添加子问题
- 已完成

Do not expose raw engineering terms such as `Active`, `Learning State`, `Definition of Done`, `Frontier`, or `Blocking` unless another confirmed requirement explicitly needs them user-facing.

## Constraints

- Preserve contextual node chat behavior and conversation persistence.
- Preserve real Question → child Question graph relationships.
- Avoid introducing new persisted UI-only state.
- Prefer removing UI ceremony over redesigning the Domain unless code evidence shows the Domain itself blocks the intended UX.
- Do not duplicate Question navigation in the Details panel.
- Do not depend on another unmerged task/PR as the canonical source for this requirement. If implementation overlaps another active branch, surface the conflict in the Plan rather than silently reusing or merging task identity.

## Non-goals

This task does not include:

- GitHub project creation redesign
- Project/Root node removal
- project metadata/details redesign
- API key/provider settings
- LLM provider implementation
- broad visual-system redesign
- new learning methodology
- a new mastery/state-machine architecture

## Acceptance Criteria

- [ ] A Question has no required “开始学习 / Start Learning” interaction.
- [ ] Primary UI no longer presents `未开始 / 学习中 / Active Learning` ceremony for Questions.
- [ ] Clicking/focusing a Question is sufficient to begin interacting with it.
- [ ] Question node/card exposes direct contextual Chat access.
- [ ] Question node/card exposes direct child-question creation.
- [ ] Details panel does not contain a duplicate Chat action.
- [ ] Details panel does not contain a duplicate Add Child Question action.
- [ ] Details panel does not contain parent/back navigation that duplicates tree navigation.
- [ ] Details panel does not contain Start/Pause/Resume learning controls.
- [ ] Details panel primarily exposes `达成条件` and `心得` in zh-CN.
- [ ] Completion/progress does not depend on an explicit Start Learning state.
- [ ] No new persisted state is introduced solely for “learning started / learning active”.
- [ ] Existing contextual chat persistence is not regressed.
- [ ] Existing Question parent/child graph behavior is not regressed.
- [ ] New/changed zh-CN copy is fully localized.

## Cursor Handoff

Start in **Plan mode**.

1. Read this Requirement as the canonical TASK-006 scope.
2. Inspect the current Question node/card, Details/Contextual Workspace, node actions, lifecycle UI, conversation binding, completion/readiness UI, and semantic persistence.
3. Write `docs/plans/TASK-006-plan.md` on this same branch.
4. Explicitly identify which current Start/Active/Learning-state UI can be removed without changing Domain semantics.
5. Identify where `达成条件` maps to the current criterion/DoD model and where `心得` maps to the current summary/learning-record model.
6. Identify any overlap/conflict with other active PRs, but do not reuse another task or PR and do not change TASK-006 identity.
7. Do not implement production code until Plan review approves `plan_approved=true`.
8. Commit and push the Plan to this same branch / PR. Do not work on `main` and do not create another PR for TASK-006.
