# TASK-008 — Complete Theme Semantic Colors

```yaml
task_id: TASK-008
title: Complete Theme Semantic Colors

related_to:
  - TASK-007
relation: follow-up-gap

development:
  stage: planning
  gates:
    requirement_ready: true
    plan_approved: false
    acceptance_approved: false
    completion_verified: false
  next_expected_actor: cursor

artifacts:
  requirement: docs/requirements/TASK-008-complete-theme-semantic-colors.md
  plan: docs/plans/TASK-008-plan.md

transport:
  type: github-pr
  repository: bewaterhere-coder/project-learning-tree
  branch: task/TASK-008-complete-theme-semantic-colors
```

## 1. Background

TASK-007 introduced selectable UI Theme Recipes, but visual acceptance shows that the theme mapping is incomplete: changing the recipe mainly changes container/node/surface colors while significant text, icon, border, interaction-state, and other foreground colors remain tied to the previous/default palette.

The result is not a coherent theme switch. Some recipes look like a differently colored frame wrapped around unchanged typography and controls, and contrast/readability can become inconsistent.

TASK-008 is an independent follow-up task. It does not reuse the TASK-007 branch/PR. Its purpose is to finish the semantic-color boundary so an entire recipe changes as one coordinated visual system.

## 2. Product Goal

When the user switches Theme Recipe, the application must change as a complete semantic color system rather than only recoloring boxes or backgrounds.

A recipe must coherently control at least:

- canvas/background surfaces;
- panel/card/node/elevated surfaces;
- primary text;
- secondary text;
- muted/metadata text;
- text displayed on accent/selected/destructive surfaces;
- default/strong/accent borders;
- primary/muted icons;
- accent/focus colors;
- hover/active/selected/focused states;
- success/warning/danger states;
- tree edges and cluster treatments;
- disabled state foreground/background where present.

The visual hierarchy must remain readable in both light and dark schemes.

## 3. Core Architecture Rule

Theme Recipes must map palette values into semantic color tokens. Product components must consume semantic tokens.

```text
Palette Recipe
    ↓
Semantic Color Tokens
    ↓
CSS / React / XYFlow consumers
```

Do not solve this by adding recipe-specific selectors throughout feature CSS.

Bad direction:

```text
[data-theme="catppuccin"] .node-title { ... }
[data-theme="nord"] .settings-label { ... }
```

Expected direction:

```text
--color-text-primary
--color-text-secondary
--color-text-muted
--color-text-on-accent
--color-icon-primary
--color-icon-muted
--color-border-default
--color-border-strong
--color-border-accent
--color-bg-hover
--color-bg-active
--color-bg-selected
--color-focus-ring
--color-success
--color-warning
--color-danger
```

Exact token names may differ after code inspection, but the semantic coverage is binding.

## 4. Hardcoded Color Audit

Cursor must audit the current UI for theme-bypassing color values, including but not limited to:

- direct hex/rgb/hsl color literals in feature CSS;
- fixed Tailwind-like/static class equivalents if any;
- legacy `gray`, `slate`, `white`, `black` foreground/background assumptions;
- inline React `style={{ color: ... }}` or equivalent;
- SVG/icon `fill` or `stroke` values that bypass semantic tokens;
- XYFlow node/edge/handle colors;
- hover/focus/selected/disabled colors that remain fixed across recipes.

A raw color is allowed only when it is intentionally part of the recipe definition/provenance layer or when the Plan documents why it is not theme-semantic.

The Plan must produce a concrete inventory of remaining bypasses before implementation.

## 5. Required Semantic Foreground Coverage

At minimum distinguish these roles where the UI uses them:

### Text

- `text-primary` — question text, main titles, primary content;
- `text-secondary` — descriptions and supporting copy;
- `text-muted` — metadata such as child count, progress, timestamps, helper text;
- `text-on-accent` — text on accent/selected primary controls;
- `text-danger` / `text-warning` when semantic status copy requires it;
- disabled text.

### Icons

- primary icon;
- muted/secondary icon;
- accent/selected icon;
- danger icon;
- disabled icon.

Icons should normally inherit semantic foreground color rather than embed independent palette values.

### Borders and focus

- default border;
- subtle/divider border;
- strong/emphasis border;
- selected/accent border;
- focus ring;
- destructive border where needed.

## 6. Interaction-State Coverage

Every recipe must provide coherent colors for the interactive states actually used by the product:

```text
default
hover
active/pressed
selected
focused
disabled
success
warning
danger
```

Do not leave hover/selected states on colors from another recipe.

Focus must remain clearly visible and distinct from selected/active state.

## 7. Surface + Foreground Pairing

Each semantic surface must be reviewed together with its foreground.

Examples:

```text
canvas            ↔ primary/secondary text
node surface       ↔ question/meta/icon colors
selected node      ↔ selected foreground + border
settings surface   ↔ labels/helper text/controls
accent button      ↔ text-on-accent
warning surface    ↔ warning foreground
```

Acceptance is based on the pair, not merely whether a CSS variable changes.

## 8. Theme Recipe Completeness Contract

Each registered recipe must populate the complete required semantic token set for both light and dark resolved schemes.

Implementation should make missing tokens fail loudly in development/tests rather than silently falling back to unrelated root CSS values.

Preferred properties:

- typed token contract or equivalent completeness check;
- one authoritative required-token set;
- no per-recipe accidental omissions;
- deterministic fallback behavior only for legacy persisted recipe selection, not for missing recipe token definitions.

## 9. Scope of UI Surfaces to Verify

Verify the theme across the real product, not only a demo component.

At minimum cover:

- app shell/header;
- project sidebar;
- Settings controls;
- tree canvas;
- question nodes;
- node metadata/progress/child-count text;
- node icons/actions;
- graph edges;
- cluster/region treatment;
- details/contextual panel;
- chat surface;
- buttons/inputs/selects;
- empty states;
- destructive/confirmation UI if present;
- hover, selected, focus, disabled states.

## 10. Accessibility / Contrast

Do practical contrast checks for core UI combinations in every recipe, light and dark.

At minimum:

- primary body/question text on primary surfaces;
- secondary and muted text on their real backgrounds;
- selected node text/background;
- primary/accent button text/background;
- focus rings against surrounding surfaces;
- warning/danger text or icons where used.

Do not assume upstream palette colors are directly usable as foreground colors. Semantic mapping may need restrained adjustments to preserve hierarchy and readability.

## 11. Persistence Boundary

This task must not change learning/domain semantics.

Theme Recipe and color-scheme selection remain UI preferences.

Changing any semantic color mapping must not cause semantic workspace persistence writes.

No new DomainSnapshot color fields.

## 12. Testing Requirements

Add or update automated coverage for at least:

1. every registered recipe exposes the complete required semantic token contract;
2. every recipe exposes that contract for both light and dark resolved schemes;
3. no token silently resolves through an unrelated old default because the recipe omitted it;
4. recipe switching updates foreground as well as background tokens;
5. text/icon/border state mappings change when recipe changes where expected;
6. theme switching does not mutate semantic workspace state;
7. legacy preference restore still resolves a valid recipe;
8. `system | light | dark` remains independent from recipe choice;
9. key UI controls keep focus/hover/selected/disabled semantics;
10. zh-CN rendering remains readable and unaffected functionally.

Where practical, add a lightweight static/test guard for obvious theme-bypassing raw colors outside approved recipe/provenance files.

## 13. Visual Acceptance Evidence

Use the existing Playwright visual/acceptance infrastructure.

Produce comparable screenshots using the same representative workspace/tree for all four recipes:

- Rosé Pine;
- Catppuccin;
- Everforest;
- Nord.

The evidence must show enough UI to review foreground colors, not only node rectangles. Include text, metadata, icons, Settings/controls or contextual UI, and selected/focus states.

Minimum:

- four comparable light-scheme screenshots;
- dark-scheme coverage sufficient to review all semantic foreground roles;
- at least one state-focused shot showing selected/focused/hover-capable controls.

## 14. Out of Scope

Do not use TASK-008 to change:

- layout or node geometry;
- typography/font family;
- spacing system;
- project creation flow;
- question/domain semantics;
- chat workflow;
- details information architecture;
- component-library/framework migration;
- adding new Theme Recipe families.

This task completes the existing recipe system; it does not redesign the product.

## 15. Acceptance Criteria

TASK-008 is acceptable when:

- switching Theme Recipe visibly and coherently changes foreground and background semantics across the product;
- main/secondary/muted text colors are recipe-aware;
- icons, borders, focus rings and interaction states are recipe-aware;
- all four recipes define a complete semantic-token set for light and dark;
- no major product surface remains visually tied to the old/default palette through accidental hardcoded colors;
- node question text, child-count/progress text and node actions are coherent with each recipe;
- Settings, sidebar, details and chat foregrounds participate in recipe changes;
- accessibility/contrast is practically acceptable for core combinations;
- theme switching remains preference-only and does not mutate semantic workspace state;
- automated completeness/persistence/theme-resolution tests pass;
- visual evidence makes the four recipes directly comparable;
- `npm run typecheck`, `npm test`, `npm run build`, and relevant E2E/visual checks pass.

## 16. Cursor Planning Gate

Cursor must begin in **Plan mode**.

Before implementation:

1. read this Requirement and TASK-007 implementation currently on `main`;
2. inspect the Theme Recipe registry/types/application code;
3. audit `src/ui/styles.css`, React components, SVG/icon/XYFlow styling and interaction-state rules for direct colors or legacy foreground assumptions;
4. produce a semantic-token coverage matrix: token/role → current consumer(s) → current source → required recipe mapping;
5. identify every missing/incomplete foreground, icon, border, interaction and state role;
6. decide whether the token contract should be extended or existing tokens should be reused;
7. define a test strategy that makes incomplete recipes fail instead of silently inheriting old values;
8. define visual evidence needed for acceptance;
9. write `docs/plans/TASK-008-plan.md` on this exact branch;
10. update this Requirement to `stage: plan_review` / `next_expected_actor: chatgpt` when the Plan is ready;
11. commit and push Plan + Requirement gate update to this same branch/PR.

**Do not implement product code until ChatGPT reviews and approves the Plan.**

Do not create another Task, branch, or PR for this requirement.
