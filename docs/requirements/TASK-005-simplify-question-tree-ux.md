---
task_id: TASK-005
title: Simplify project creation and question tree UX
repository: bewaterhere-coder/project-learning-tree
task_ref: task/TASK-005-simplify-question-tree-ux
integration_ref: main
pr:
  number: null
  head_ref: task/TASK-005-simplify-question-tree-ux
  base_ref: main
  state: pending
development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    merge_verified: false
  next_expected_actor: cursor
artifacts:
  plan: ../plans/TASK-005-plan.md
---

# TASK-005 — Simplify Project Creation and Question Tree UX

## Goal

Simplify Learning Tree around one clear user model:

> Project is a container. Question is the learning object. Asking the question is the learning action. Child questions are how learning deepens.

The first screen after creating a GitHub project should immediately show useful learning questions, without a project/root node, learning-state ceremony, or ambiguous nested cards.

## Problem

The current product still exposes implementation concepts that users should not have to understand:

- Project/root nodes appear in the graph even though they are not learning questions.
- Initial questions are not presented as a clear first-level question set.
- Node visuals use an unclear outer-container + inner-card hierarchy.
- Users are asked to think in terms of starting/active/learning states before they can simply ask a question.
- Project creation asks for information that can be derived from the GitHub URL.
- Project metadata has no clear project-level details surface.
- Question nodes do not clearly show child count and progress.
- Chinese locale is not yet a complete Chinese experience, especially for generated content.

## Expected Product Model

```text
Project
├─ Project Details
└─ Question Tree
   ├─ Question A
   │  ├─ Child A1
   │  └─ Child A2
   ├─ Question B
   └─ Question C
```

Rules:

- Project is a container, not a graph node.
- Question is the only primary semantic node shown on the canvas.
- Asking/chatting about a Question is already learning; there is no separate “start learning” step.
- A Question may have one parent and multiple children.
- Child questions are created directly under the current Question.

## Requirements

### 1. Simplify GitHub project creation

Creating a project must require only one user-entered field:

```text
GitHub Repository URL
```

Example:

```text
https://github.com/Fission-AI/OpenSpec
```

Derive automatically:

```text
owner: Fission-AI
repository: OpenSpec
project name: OpenSpec
```

Requirements:

- GitHub URL is the only required input.
- Project name is derived from the repository segment.
- Invalid repository URLs produce a clear localized validation error.
- Do not require the user to duplicate repository name/owner/description during creation.
- Creation should not be blocked if optional GitHub metadata cannot be fetched.

### 2. Remove Project / Root nodes from the canvas

The canvas must not render a Project, Repository Root, or synthetic Root node.

After project creation, the canvas should directly display the initial top-level Questions.

Top-level Questions belong to the Project but have no parent Question:

```text
projectId = currentProjectId
parentQuestionId = null
```

Graph edges are only Question → Question relationships.

### 3. Add a project-level “项目详情 / Project Details” surface

Project information belongs outside the graph.

At minimum display:

- Project/repository name
- GitHub repository URL
- Project/repository description when available

The repository description must not be represented as a graph node.

### 4. Initial questions are the first learning surface

Creating a project should generate a useful first-level question set directly on the canvas.

For `zh-CN`, examples of the intended style are:

- 这个项目主要解决什么问题？
- 它的核心架构是怎样的？
- 它最重要的工作流怎么运转？
- 这个项目最值得学习的设计思想是什么？
- 如果我要使用或改造它，应该从哪里开始？

These are top-level Questions under the Project, not children of a Project node.

Automatic layout should make the set readable immediately.

### 5. One Question = one visual card

Remove the unclear visual pattern of:

```text
Outer Node Container
└─ Inner Content Card
```

A semantic Question must have one primary visual card.

Selection, hover, focus, completion, chat binding, and other visual states should be expressed on that same card rather than by adding a second semantic-looking shell.

### 6. Simplify Question card content

A Question card should prioritize:

- Question title
- Optional short description/context if useful
- Child question count
- Completion progress
- Chat action
- Add child question action

Example:

```text
┌──────────────────────────────┐
│ OpenSpec 为什么需要 artifact？ │
│                              │
│ 3 个子问题 · 已完成 60%       │
│                         💬  ＋ │
└──────────────────────────────┘
```

Do not expose runtime terminology such as:

- Start Learning / 开始学习
- 未开始 / 学习中 / Active Learning
- Active Node
- Frontier
- Blocking
- Mastery
- Definition of Done

unless a later product decision gives those terms explicit user-facing meaning.

### 7. Asking a question is the learning action

Remove any required interaction of:

```text
Question → Start Learning → Learning State → Chat
```

The intended interaction is:

```text
Question → Chat about this question
```

Users can open contextual chat directly for any Question.

No explicit “Start Learning” button or mandatory “learning/not learning” state should be required.

### 8. Child questions are a first-class direct operation

Each Question must provide a clear way to add a child question.

User-created child questions should be created directly beneath the current Question and connected by a real graph edge.

AI-generated Question Proposals, when accepted, should also become child Questions of the current Question directly. Do not force users through `blocking/frontier/activate/start` workflow concepts.

### 9. Show child count on Question nodes

For Questions with children, show real derived metadata such as:

```text
3 个子问题
```

or:

```text
3 个子问题 · 已完成 60%
```

Do not show noisy empty metadata like:

```text
0 个子问题 · 0%
```

A leaf Question may show `暂无子问题` or omit the metadata when cleaner.

Child count must be derived from the actual tree and update automatically when children change.

### 10. Show simple completion progress

For this UI pass, keep progress simple and understandable.

For a Question with direct children, progress may be derived as:

```text
completed direct children / total direct children
```

Example:

```text
5 个子问题 · 已完成 40%
```

Do not reintroduce a complex learning-state machine merely to calculate progress.

Leaf completion semantics may continue to use the existing domain behavior or be handled separately; do not expand this task unnecessarily.

### 11. Chinese locale means a complete Chinese experience

When `locale = zh-CN`, all localizable user-facing product content must use Chinese.

This includes:

- Buttons and menus
- Dialogs
- Empty states
- Validation/errors
- Project Details labels
- Question card metadata
- Initial generated Questions
- AI-generated/recommended child Questions
- Product-provided Chat prompts/system UI copy
- Proposal action labels

Examples:

```text
3 个子问题 · 已完成 60%
```

not:

```text
3 child questions · 60% complete
```

Technical identifiers may remain in their original form:

- Repository names
- GitHub owners
- URLs
- File paths
- API/class/function/variable names
- Code
- Technical terms where retaining the original term is clearer

For technical terminology, forms such as `产物（artifact）` are acceptable.

AI/content generation must receive the current locale. Static UI i18n alone is not sufficient.

Expected generation behavior for `zh-CN`:

```text
请使用中文回答。
生成的问题和子问题也使用中文。
技术专有名词可保留英文原词。
```

Switching locale affects newly generated product/AI content. Do not automatically translate or overwrite existing user-authored content.

### 12. Preserve clear dynamic edge routing

Continue the existing Node/edge UX direction:

- One Question can have multiple child edges.
- Connection handles/routes should use sensible sides based on relative positions.
- Avoid obviously crossing through card bodies or attaching to visually wrong sides.
- Parent/child structure must remain easy to read after automatic layout.

## First-screen target

After creating a repository, the user should see roughly:

```text
OpenSpec                         [项目详情]

这个项目主要解决什么问题？
它的核心架构是什么？
核心工作流怎么运转？
最值得学习的设计思想是什么？
如果我要使用它，应该从哪里开始？
```

The main canvas objects are Questions only.

The user should not need to understand `Root`, `Active`, `Frontier`, `Blocking`, `Project Node`, or a learning-state machine before learning can begin.

## Constraints

- Preserve the existing contextual-chat capability and conversation persistence where possible.
- Preserve existing semantic persistence unless migration is required by removing the synthetic Project/Root node representation.
- Do not silently discard existing user projects/questions during migration.
- Prefer derived UI state over adding new persisted UI-only state.
- Keep `locale` as the source of truth for UI and newly generated content language.
- Use actual graph relationships for parent/child structure; visual proximity alone is insufficient.

## Non-goals

Do not expand TASK-005 into:

- Real LLM provider implementation
- API Key settings
- Provider/model selection UI
- New complex mastery/learning-state architecture
- Deep GitHub code analysis
- A new milestone

Real Provider / API Key support is a separate task.

## Acceptance Criteria

- [ ] Adding a GitHub project requires only Repository URL as required user input.
- [ ] Project name is derived automatically from the GitHub URL.
- [ ] Canvas contains no Project / Repository Root / synthetic Root node.
- [ ] New projects open directly onto initial top-level Questions.
- [ ] Project has a separate localized Details surface.
- [ ] Repository description is shown at Project level, not as a Question node.
- [ ] One semantic Question renders as one primary visual card.
- [ ] No ambiguous outer-card / inner-card double visual hierarchy remains.
- [ ] Users can chat directly about any Question without “Start Learning”.
- [ ] User-visible `未开始/学习中/Active Learning` ceremony is removed from the primary flow.
- [ ] A Question can directly add child Questions.
- [ ] Accepted AI Question proposals can directly become child Questions.
- [ ] Parent/child Question relations create real graph edges.
- [ ] Question cards show actual child count when useful.
- [ ] Question cards show understandable completion progress when applicable.
- [ ] Leaf nodes do not mechanically show `0 个子问题 · 0%`.
- [ ] `zh-CN` localizes all localizable UI copy.
- [ ] Initial Questions generated in `zh-CN` are Chinese.
- [ ] Newly generated/recommended child Questions in `zh-CN` are Chinese.
- [ ] AI/content generation receives current locale.
- [ ] Existing authored content is not automatically rewritten merely because locale changes.
- [ ] One Question supports multiple child connections.
- [ ] Edge attachment/routing remains visually natural after layout.
- [ ] Existing contextual chat and persistence behavior are not unintentionally regressed.

## Cursor handoff

Start in **Plan mode**.

1. Read this requirement and inspect the current project-creation, workspace/project model, graph/node rendering, layout, localization, and conversation/provider seams.
2. Produce `docs/plans/TASK-005-plan.md` on this same task branch.
3. Identify any data migration needed to remove Project/Root nodes without data loss.
4. Identify which current learning-state concepts are domain-only versus actually required by UI contracts.
5. Identify how locale currently reaches generated initial questions and AI proposal generation.
6. Do **not** implement production changes until the plan is reviewed/approved.
7. Commit and push the plan to this same task branch / active PR; do not work on `main`.
