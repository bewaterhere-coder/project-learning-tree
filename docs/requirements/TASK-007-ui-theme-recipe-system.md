# TASK-007 — UI Theme Recipe System

```yaml
task_id: TASK-007
title: UI Theme Recipe System

development:
  stage: plan_review
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: chatgpt

artifacts:
  requirement: docs/requirements/TASK-007-ui-theme-recipe-system.md
  plan: docs/plans/TASK-007-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-007-ui-theme-recipe-system
```

## 1. Background

The current Learning Tree UI has a hand-authored green/gray palette in `src/ui/styles.css`. The structure is already mostly semantic-token based, but the actual palette lacks a coherent mature color system and produces an unattractive, inconsistent visual result.

The goal of this task is not to redesign layout or interaction. It is to introduce a thin **Theme Recipe Layer** that maps mature open-source palettes onto the existing semantic UI token system, then expose multiple recipes for direct visual comparison inside the real product.

This is an independent UI infrastructure task. Do not merge it into TASK-005 or TASK-006 even if the same CSS/UI files overlap.

## 2. Product Goal

Make Learning Tree able to switch between several coherent, production-quality color recipes without components depending on palette-specific raw colors.

The UI should continue to consume semantic roles such as:

- canvas background
- surface background
- elevated surface
- node surface
- primary / secondary / muted text
- default / strong / accent border
- accent
- success / warning / danger
- selected / active / parked / completed learning states
- graph edges
- cluster colors
- focus ring

A palette recipe is responsible for supplying those semantic roles.

## 3. Initial Theme Recipes

Provide four initial recipes for visual A/B evaluation:

1. **Rosé Pine**
   - Light: Rosé Pine Dawn
   - Dark: Rosé Pine Moon or main dark variant; choose the one that produces the clearest product hierarchy and document the decision in the Plan.

2. **Catppuccin**
   - Light: Latte
   - Dark: Mocha

3. **Everforest**
   - Light and dark variants derived from the canonical Everforest palette.

4. **Nord**
   - Light and dark mappings derived from the canonical Nord palette.

The existing hand-tuned palette may remain only as a migration/default compatibility recipe during implementation if needed, but it should not constrain the architecture.

## 4. Architecture Requirement

Introduce an explicit recipe abstraction under `src/ui/theme/` rather than spreading palette values through component CSS.

Conceptually:

```text
Theme Recipe
    ↓
Semantic UI Tokens
    ↓
Existing CSS / React / XYFlow surfaces
```

Expected direction, subject to Plan review:

```text
src/ui/theme/
  apply-theme.ts
  theme-recipe.ts
  recipes/
    rose-pine.ts
    catppuccin.ts
    everforest.ts
    nord.ts
```

Exact filenames are not binding; the architectural separation is.

### Mandatory rule

Components and feature CSS MUST NOT start using palette-specific names such as:

```text
latte-blue
mocha-mauve
rose-pine-foam
nord8
```

They should continue consuming semantic roles, for example:

```text
--color-bg-canvas
--color-bg-surface
--color-bg-node
--color-text-primary
--color-text-secondary
--color-text-muted
--color-border-default
--color-accent
--color-success
--color-warning
--color-danger
--color-learning-selected
--color-cluster-0
...
```

## 5. Current Theme Behavior Must Remain Intact

The project already supports `system | light | dark` color-scheme behavior. Preserve that distinction.

The new model should separate:

```text
Theme Recipe     = which palette family is used
Color Scheme     = system / light / dark
Resolved Scheme  = light / dark
```

Do not collapse recipe selection into the existing `colorScheme` field.

## 6. Theme Selection UI

Add a compact theme-recipe selector to the existing Settings surface so the four recipes can be compared in the real application.

Chinese UI should use Chinese copy when locale is `zh-CN`, for example:

```text
配色方案
Rosé Pine
Catppuccin
Everforest
Nord
```

No new full Theme page is required.

Switching recipe should update the application immediately without reload.

## 7. Persistence Boundary

Recipe choice is a **UI preference**, not semantic learning state.

Requirements:

- persist with workspace/layout preferences;
- never rewrite semantic DomainSnapshot solely because a recipe changes;
- preserve existing `system | light | dark` behavior;
- define backward-compatible default behavior for users with old preference data;
- document whether a preference schema bump is required and why.

Do not use a React effect that serializes the semantic workspace whenever visual preferences change.

## 8. Palette Source / Dependency Policy

Prefer canonical open-source palette values and keep provenance clear.

Potential sources include:

- `@catppuccin/palette`
- Rosé Pine palette package / canonical palette data
- canonical Everforest palette
- canonical Nord palette

However, do **not** automatically add large UI frameworks merely to obtain themes.

Explicitly out of scope:

- Tailwind migration
- shadcn migration
- tweakcn integration
- component-library replacement
- CSS framework replacement

Cursor must evaluate in the Plan whether tiny palette packages are worth adding versus vendoring a small typed palette table with license/provenance comments. Avoid runtime dependencies that add no real value.

## 9. Visual Mapping Principles

The recipes must preserve semantic hierarchy, not merely copy hex values.

### Surfaces

There must be perceptible but restrained distinction between:

```text
canvas
surface
node
raised/elevated UI
```

### Text

Primary, secondary and muted text must remain clearly ordered and readable in both schemes.

### Learning state colors

Do not turn nodes into saturated status badges.

- Active / selected / parked / completed should remain quiet structural cues.
- Focus and selection must remain distinguishable.
- Warning and danger must not dominate the canvas.

### Tree / cluster colors

Cluster colors can use palette accent families, but they should remain subtle background-region cues.

Edges should stay visually secondary to the nodes/questions.

### Accessibility

Plan and implementation must check practical contrast for core text, controls, focus rings and selected states. Do not assume a palette is accessible merely because it is popular.

## 10. Default Recipe Decision

Do not permanently choose the product default only from code preference.

Implementation should make all four recipes easy to compare. Initial default may be **Rosé Pine** for evaluation, but the final product default remains an acceptance decision after visual review.

The Plan should state how the default can be changed in one place without touching component styles.

## 11. Testing Requirements

At minimum cover:

1. recipe registry exposes exactly the intended recipes;
2. each recipe resolves both light and dark semantic tokens;
3. every required semantic token is populated;
4. changing recipe updates applied theme without semantic workspace mutation;
5. recipe selection persists and restores;
6. legacy preference data receives a deterministic fallback recipe;
7. `system` scheme continues to follow OS preference independently of recipe;
8. zh-CN Settings copy is localized;
9. existing UI behavior remains unchanged apart from color/theme selection.

Add visual evidence using the existing Playwright screenshot/acceptance infrastructure. At minimum produce comparable screenshots of the same representative tree in the four recipes, preferably in light scheme first; include dark coverage sufficient to catch broken mappings.

## 12. Out of Scope

Do not use this task to change:

- project creation flow;
- node information architecture;
- details-panel behavior;
- chat behavior;
- question lifecycle/domain semantics;
- tree topology/layout algorithms;
- font system;
- spacing system;
- component library;
- broad UI redesign unrelated to palette/theme infrastructure.

If TASK-005 / TASK-006 changes create merge conflicts, surface them explicitly. Do not absorb their requirement scope into TASK-007.

## 13. Acceptance Criteria

TASK-007 is acceptable when:

- Rosé Pine, Catppuccin, Everforest and Nord are independently selectable recipes;
- each recipe works with both light and dark resolved schemes;
- existing semantic CSS consumers do not depend on palette-family color names;
- recipe selection is a preference and does not mutate semantic project data;
- `system | light | dark` continues to function correctly;
- the selector works in Settings and is localized in zh-CN;
- switching recipes is immediate and visually coherent across shell, tree nodes, edges, clusters, details and chat surfaces;
- automated tests cover registry/mapping/persistence/theme resolution;
- visual screenshots allow direct A/B comparison;
- `npm run typecheck`, `npm test`, `npm run build`, and relevant E2E/visual checks pass;
- no Tailwind/shadcn/tweakcn migration is introduced.

## 14. Cursor Planning Gate

Cursor must begin in **Plan mode**.

Before implementation:

1. inspect the current theme preference schema and `apply-theme.ts`;
2. inspect semantic variables and direct raw-color usage in `src/ui/styles.css` and UI components;
3. identify which tokens truly form the stable semantic contract;
4. choose palette source strategy and record license/provenance considerations;
5. define recipe registry/types, persistence migration, Settings integration and visual-test strategy;
6. identify likely conflict areas with currently open TASK-005 / TASK-006 PRs;
7. write `docs/plans/TASK-007-plan.md` on this exact task branch;
8. update this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt` when the Plan is ready;
9. commit and push the Plan to the same branch/PR.

**Do not implement product code until ChatGPT reviews and approves the Plan.**

Do not create another Task, branch, or PR for planning/implementation of this same requirement.
