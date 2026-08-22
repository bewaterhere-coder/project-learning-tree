# TASK-005 — Question Interaction Clarification

Status: Authoritative requirement addendum for TASK-005

This clarification incorporates the latest product discussion and narrows the interaction model further. It does not create a new task or milestone.

## Core product rule

> Question is the learning unit. Clicking and discussing a Question is already learning.

Do not model learning as an explicit user-started session or workflow.

## 1. Remove explicit learning-start interaction

The product must not require or present a separate learning-start step such as:

- 开始学习 / Start Learning
- 进入学习
- 继续学习
- 暂停学习
- 当前学习节点
- 未开始
- 学习中
- Active Learning

A user clicking a Question is already engaging with that learning unit. No additional action is required to make the Question "active" or "in learning".

Do not add persisted state solely to represent whether a user has started learning a Question.

If existing domain code contains learning-state concepts that are not needed for another confirmed capability, they must not leak into the primary UI.

## 2. Keep Question state minimal

For user-facing Question completion, the only meaningful state needed for this UX is whether the Question has been completed/understood.

Preferred UI model:

```text
Question
├─ default: not completed (usually no explicit label needed)
└─ completed: explicit completion mark
```

Do not introduce a multi-step learning-state machine to represent progress.

Progress should be derived from real Question-tree structure and completion data, not from a synthetic "learning session" lifecycle.

## 3. Node is the interaction surface

Operations that naturally belong to a Question must be performed from the Question node itself.

Question node responsibilities:

- Click/select the Question
- Chat/discuss the Question
- Add a child Question
- Mark/represent completion where applicable
- Show child count
- Show derived completion progress where useful

The canvas tree already expresses parent/child navigation. Do not duplicate this interaction model in the details panel.

## 4. Remove redundant actions from the right-side details panel

The right-side Question details panel must not contain redundant actions such as:

- 聊聊这个问题
- 添加子问题
- 返回上一个问题 / 返回父问题
- 开始学习
- 学习中 / Active state controls

These operations are either available directly on the node or already represented by the tree structure.

The details panel is not a second copy of the Question node UI.

## 5. Right-side details panel is for knowledge deposition

The Question details panel should be intentionally narrow and primarily display/edit two kinds of information:

### 达成条件

What must be true for this Question to count as understood/completed.

This is the concrete completion criterion for the Question.

### 心得

The user's accumulated understanding, conclusions, notes, insights, or learning record for this Question.

The panel may contain minimal supporting metadata only when genuinely useful, but it should not become an action dashboard.

Product boundary:

> Node = interaction surface.
>
> Detail panel = knowledge deposition surface.

## 6. Direct interaction flow

Target flow:

```text
Click Question
  ↓
Read / focus Question
  ↓
Chat directly or add child Question directly from node
  ↓
Capture 达成条件 / 心得 in details
  ↓
Mark complete when understood
```

Explicitly reject this flow:

```text
Click Question
  ↓
Start Learning
  ↓
Enter Learning State
  ↓
Open Details
  ↓
Click Chat
```

The extra ceremony has no product value and must be removed.

## 7. Acceptance additions for TASK-005

TASK-005 is not accepted unless all of the following are true:

- [ ] No user-facing "开始学习" action remains in the primary Question flow.
- [ ] No user-facing "未开始 / 学习中 / Active Learning" lifecycle is required to use a Question.
- [ ] Clicking/selecting a Question is sufficient to enter its learning context.
- [ ] Chat is directly available from the Question node.
- [ ] Add-child is directly available from the Question node.
- [ ] The details panel does not duplicate Chat.
- [ ] The details panel does not duplicate Add Child Question.
- [ ] The details panel does not contain "返回上一个问题 / 返回父问题" navigation that duplicates the visible tree.
- [ ] The details panel does not contain Start Learning or learning-state controls.
- [ ] The details panel primarily contains 达成条件 and 心得.
- [ ] User-facing completion semantics remain simple: default/incomplete vs completed, without a synthetic learning-session lifecycle.
- [ ] Progress is derived from actual Question-tree/completion data rather than start-learning state.

## Cursor implementation instruction

Use this document together with `docs/requirements/TASK-005-simplify-question-tree-ux.md` as the current TASK-005 requirement set.

This clarification wins if any older TASK-005 wording implies:

- a separate Start Learning step;
- a learning-session/active-node lifecycle;
- Chat/Add Child actions in the details panel;
- parent/back navigation inside the details panel.

Stay on the existing TASK-005 branch and PR. Do not create another task or pull request for this clarification.
