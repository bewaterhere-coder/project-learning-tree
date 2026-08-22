---
task_id: TASK-007
title: UI Theme Recipe System
status: plan_review
requirement: ../requirements/TASK-007-ui-theme-recipe-system.md
---

# TASK-007 Plan — UI Theme Recipe System

This is the canonical implementation plan for TASK-007. It records code evidence from the Planning Gate and the smallest change that satisfies the acceptance criteria **after** ChatGPT plan approval.

**Gate:** `plan_review` — Plan revised after REQUEST CHANGES; awaiting ChatGPT re-review (`plan_approved` remains `false`) before any product implementation.

**Hard constraints (Plan + Implementation):**

- No Tailwind, shadcn, tweakcn, or new component frameworks.
- No Domain / learning-semantics changes.
- No layout, font, spacing, Chat, Details, or Project UX redesign — color/theme infrastructure only.
- Independent of TASK-005 / TASK-006 scope even where files overlap.

## Review revisions (PR #28)

Three blocking findings addressed in this revision:

1. **Everforest variant is binding** — TASK-007 evaluation uses **Medium for both light and dark**. Soft is out of scope for this task; implementation must not reopen Soft-vs-Medium.
2. **Visual A/B is 4 × 2 = 8 screenshots** — same representative product scene for every recipe × resolved scheme pair. Partial dark smoke coverage is insufficient.
3. **Third-party attribution is mandatory** — vendored palette data must preserve upstream copyright/license notice text (not a bare “MIT” label). Prefer `docs/third-party/theme-palettes.md` as the repository-level notices artifact, with each palette source file pointing to it (and/or embedding the same notice block).

### Binding decisions (confirmed in review — no longer open)

| Decision | Binding choice |
| --- | --- |
| Rosé Pine dark | **Moon** (not Main) |
| Preference schema | Keep `LAYOUT_VERSION = 2`; missing/unknown `themeRecipeId` → `DEFAULT_THEME_RECIPE_ID` deterministically |
| Palette source | Local typed tables only; **no** palette npm dependencies |
| Evaluation default | **Rosé Pine** via one constant; permanent product default remains an Acceptance decision |
| Axes | Theme Recipe ⊥ `system \| light \| dark` |
| Everforest | **Medium** light + **Medium** dark |
| Visual evidence | Exactly **8** comparable screenshots (4 recipes × 2 schemes), same scene |

---

## Goal

Introduce a thin **Theme Recipe Layer** that maps mature open-source palettes onto the existing semantic CSS token contract, and expose four recipes for in-product A/B comparison while preserving orthogonal `system | light | dark` behavior and preference/semantic persistence boundaries.

```text
Theme Recipe (palette family)
        ↓
Semantic UI Tokens (--color-*)
        ↓
Existing CSS / React / XYFlow surfaces
```

Orthogonal axis already present:

```text
Color Scheme preference  = system | light | dark
Resolved Scheme          = light | dark   (via resolveColorScheme + matchMedia)
```

---

## Current-state findings

### 1. Theme application today

[`src/ui/theme/apply-theme.ts`](../../src/ui/theme/apply-theme.ts) only applies **resolved scheme**:

- sets `document.documentElement.dataset.theme` to `"light" | "dark"`
- sets `document.documentElement.style.colorScheme`
- reconciles `plt.workspace.theme` hint via `reconcileThemeHint`

There is **no** recipe id, **no** CSS-variable injection, and **no** palette registry.

[`App.tsx`](../../src/ui/App.tsx) resolves scheme from `workspace.shell.colorScheme` + OS preference, then calls `applyResolvedTheme` in `useLayoutEffect`. Settings Menu exposes Appearance (`theme-switch`) only — language + `system|light|dark`.

### 2. Preference / colorScheme persistence

| Concept | Location | Notes |
| --- | --- | --- |
| Shell layout | `WorkspaceShellLayout` in [`types.ts`](../../src/workspace/types.ts) | `locale`, `colorScheme`, pane chrome — **no** recipe field |
| Preferences key | `plt.workspace.layout.v2` (`LAYOUT_VERSION = 2`) | Serialized by [`serializeWorkspacePreferences`](../../src/workspace/preferences.ts) |
| Legacy key | `plt.workspace.layout.v1` | Parsed; missing `colorScheme` defaults to `system` |
| Theme hint | `plt.workspace.theme` | Stores **resolved** light/dark only (boot FOUC hint) |
| Semantic store | `plt.workspace.semantic.v1` | Must never hold appearance prefs; `colorScheme` is already listed in `PREFERENCE_ONLY_KEYS` |

Preference writes: App `useEffect([workspace])` → `saveWorkspacePreferences` (layout always). Semantic writes only via `commit(..., true)`. Theme/recipe changes must use `commit(..., false)` like today's colorScheme toggles.

### 3. Semantic token contract already in CSS

[`src/ui/styles.css`](../../src/ui/styles.css) lines 1–83 define the hand-authored green/gray palette under `:root, [data-theme="light"]` and `[data-theme="dark"]`. Feature CSS almost entirely consumes `var(--color-*)`.

**Stable semantic contract (keep names; recipes supply values):**

| Token | Role |
| --- | --- |
| `--color-bg-canvas` | Tree / React Flow background plane |
| `--color-bg-surface` | Shell / sidebar / chrome base |
| `--color-bg-elevated` | Menus, dialogs, raised panels |
| `--color-bg-node` | Learning node card fill |
| `--color-text-primary` / `secondary` / `muted` / `inverse` | Text hierarchy + on-accent |
| `--color-border-default` / `strong` / `accent` | Borders |
| `--color-accent` / `hover` / `subtle` | Primary actions / rails |
| `--color-success` / `warning` / `danger` | Status (quiet on canvas) |
| `--color-learning-active` / `selected` / `parked` / `completed` | Node lifecycle cues |
| `--color-focus-ring` | Focus outline |
| `--color-edge-quiet` / `edge-default` | Graph edges (may stay `color-mix` of borders) |
| `--color-cluster-0` … `4` | Subtle cluster region fills |
| `--shadow-node` / `--shadow-overlay` | Elevation (already scheme-specific) |

Non-color tokens (`--radius-*`, `--space-*`, `--motion-*`, fonts) are **out of scope** — leave untouched.

### 4. Raw color cleanup scope

Inventory in `styles.css` (all hex/`rgba` usages):

| Location | Kind | Plan action |
| --- | --- | --- |
| `:root` / `[data-theme=light|dark]` token block (~60 hex + cluster mixes + shadow rgba) | Palette source of truth today | **Move values into recipe resolvers**; CSS retains variable *consumption* and structural rules. Keep minimal fallbacks on `:root` only if needed for first paint before JS. |
| `.confirm-dialog-backdrop` `rgba(20, 24, 32, 0.45)` | Hard-coded overlay | Introduce semantic `--color-backdrop` (recipe-supplied). |
| `var(--color-danger, #b42318)` fallback | Dead hex fallback | Drop raw fallback; use `var(--color-danger)` only. |
| Component TSX | Almost clean | `TreeCanvas` already uses `fill="var(--color-warning)"`; `LearningNode` uses `currentColor`. **No** palette-family names in components. |

No other UI files currently embed palette hex. Cleanup is concentrated in the token definition block + backdrop + danger fallback.

### 5. Node / edge / cluster / details / chat mapping (consumers)

| Surface | How colors are applied today |
| --- | --- |
| **Nodes** | `.learning-node` + lifecycle classes mix `--color-learning-*` into `--color-bg-node`; focus uses `--color-learning-selected`; stack rail uses `--color-accent`; blocked pip uses `--color-warning` |
| **Edges** | Classes `edge-quiet` / `edge-default` / `edge-active-stack` stroke semantic edge/accent tokens ([`to-react-flow.ts`](../../src/ui/tree/to-react-flow.ts)) |
| **Clusters** | `.knowledge-cluster.tone-N` → `--color-cluster-N` |
| **Details / inspector** | Shared chrome tokens (`bg-elevated`, text, border, danger/success/warning) |
| **Chat** | Same shell/elevated/border/accent tokens — no private palette |

Recipes must preserve **quiet** learning cues (mix percentages stay in CSS; recipes only change base token hues/values).

### 6. Settings + i18n

- Settings live in header `Menu` (`data-testid="settings-menu"`).
- i18n keys in [`messages.ts`](../../src/ui/i18n/messages.ts): `app.appearance`, `app.themeSystem|Light|Dark` (EN + zh-CN already).
- No recipe copy yet. Helper `openSettings` exists in E2E helpers.

### 7. Visual / Playwright infrastructure

| Path | Role |
| --- | --- |
| [`e2e/visual/workspace-surfaces.spec.ts`](../../e2e/visual/workspace-surfaces.spec.ts) | CI visual snapshots when `CI` or `E2E_VISUAL=1`; `toHaveScreenshot` |
| [`e2e/acceptance/m26-screenshots.spec.ts`](../../e2e/acceptance/m26-screenshots.spec.ts) | Opt-in `E2E_ACCEPTANCE_SHOTS=1` writes PNGs under `docs/milestones/...` |
| [`playwright.config.ts`](../../playwright.config.ts) | Fixed viewport 1280×720, `colorScheme: "light"`, Chromium only |

Reuse these patterns; do not invent a new visual stack.

### 8. Open TASK-005 / TASK-006 conflict surface

| Task | PR | Status (Planning Gate snapshot) | Overlap with TASK-007 |
| --- | --- | --- | --- |
| **TASK-005** | #26 `task/TASK-005-simplify-question-tree-ux` | Docs/plan only vs `main` — **no product CSS/App code yet** | Future UX work may touch App/Settings/styles; low immediate conflict |
| **TASK-006** | #27 `task/TASK-006-simplify-question-interaction-details` | Implementation on branch; touches `App.tsx`, `styles.css`, `messages.ts`, tree/details/chat | **Real merge risk** on those three files |

TASK-006 `styles.css` delta (~62 lines) adds/adjusts **feature rules** that already consume semantic tokens; it does **not** rewrite the `:root` palette block. Recipe work that relocates the token *definition* block and leaves consumption selectors alone should merge cleanly if both sides avoid drive-by reformatting.

---

## Architecture

### A. Theme Recipe types & registry

Proposed layout (filenames guidance; separation is binding):

```text
src/ui/theme/
  apply-theme.ts          # extend: scheme + recipe → DOM
  theme-recipe.ts         # types, token keys, DEFAULT id, registry API
  recipes/
    rose-pine.ts
    catppuccin.ts
    everforest.ts
    nord.ts
  palettes/
    provenance.ts         # pointers to notices artifact + shared citation helpers
    rose-pine.ts          # typed hex tables (Dawn / Moon)
    catppuccin.ts         # Latte / Mocha
    everforest.ts         # Medium light / Medium dark only
    nord.ts               # Snow Storm light mapping / Polar Night
```

Repository-level notices (required):

```text
docs/third-party/theme-palettes.md
```

**Types:**

```ts
export type ThemeRecipeId =
  | "rose-pine"
  | "catppuccin"
  | "everforest"
  | "nord";

export type SemanticColorTokenName =
  | "bg-canvas" | "bg-surface" | "bg-elevated" | "bg-node"
  | "text-primary" | "text-secondary" | "text-muted" | "text-inverse"
  | "border-default" | "border-strong" | "border-accent"
  | "accent" | "accent-hover" | "accent-subtle"
  | "success" | "warning" | "danger"
  | "learning-active" | "learning-selected" | "learning-parked" | "learning-completed"
  | "focus-ring"
  | "edge-quiet" | "edge-default"
  | "cluster-0" | "cluster-1" | "cluster-2" | "cluster-3" | "cluster-4"
  | "backdrop"
  | /* shadows as CSS values */ ;

export type SemanticColorTokens = Record</* CSS var suffix */, string>;

export interface ThemeRecipe {
  id: ThemeRecipeId;
  /** i18n message key for Settings label */
  labelKey: string;
  /** Resolve full semantic token map for a scheme */
  resolve(scheme: ResolvedColorScheme): SemanticColorTokens;
}
```

**Registry:**

- `THEME_RECIPES: readonly ThemeRecipe[]` — exactly four entries, stable order for Settings + screenshots.
- `getThemeRecipe(id): ThemeRecipe` — unknown → `DEFAULT_THEME_RECIPE_ID`.
- `DEFAULT_THEME_RECIPE_ID = "rose-pine"` — **single constant** for evaluation default; product default remains an acceptance decision after visual review (change only this constant + tests, never component CSS).
- Optional compatibility recipe for the current hand palette is **not** required for A/B; omit unless migration needs a temporary escape hatch (prefer not).

CSS variable naming: recipe output keys map 1:1 to `--color-${name}` (and `--shadow-node` / `--shadow-overlay` / `--color-backdrop`).

**DOM contract after apply:**

```text
<html
  data-theme="light|dark"           # resolved scheme (existing)
  data-theme-recipe="rose-pine|…"   # new, for tests/debug only
  style="--color-bg-canvas: …; …"
>
```

Components must **not** branch on `data-theme-recipe` for styling — only semantic vars.

### B. Semantic color token contract

Rules:

1. Feature CSS / TSX continues to reference **only** semantic `--color-*` / `--shadow-*`.
2. Forbidden in feature code: `latte-*`, `mocha-*`, `foam`, `nord8`, Everforest role names, etc.
3. Recipes may use palette role names **internally** when mapping into semantic tokens.
4. `edge-quiet` / `edge-default` may remain `color-mix(...)` expressions computed in the recipe (or derived from border tokens at resolve time) so CSS consumers stay stable.
5. Cluster tokens are low-alpha fills (preserve ~11–14% mix character) so regions stay background cues, not badges.
6. Learning state tokens stay desaturated structural fills — not saturated status pills.

### C. Light / dark mapping strategy (four recipes)

| Recipe | Light source | Dark source | Notes |
| --- | --- | --- | --- |
| **Rosé Pine** | **Dawn** | **Moon** | **Binding:** Moon (not Main). Moon’s surface ladder (`base` / `surface` / `overlay`) maps more clearly to canvas → surface → elevated → node than Main’s flatter dark. Accents: `pine`/`foam`/`iris`/`rose`/`gold`/`love` → accent / clusters / warning / danger (love → danger, gold → warning, iris → selected/focus). |
| **Catppuccin** | **Latte** | **Mocha** | Canonical requirement. Use Crust/Mantle/Base/Surface0–2 for surface ladder; Blue/Lavender/Sapphire/etc. for accent/clusters; Green/Yellow/Red/Peach for success/warning/danger/parked. |
| **Everforest** | **Medium light** | **Medium dark** | **Binding for TASK-007:** Medium × both schemes only. Do not select Soft at implementation time. Map Medium `bg0/bg1/bg2/bg3` → canvas/surface/elevated/node; `fg`/`grey*` → text; `green`/`yellow`/`red`/`orange`/`blue`/`purple`/`aqua` → accent/status/clusters. Keep status quiet. |
| **Nord** | Derived **light** from Snow Storm (`nord4–6`) + Frost accents | **Polar Night** (`nord0–3`) + Frost/Aurora | Nord has no first-party “Nord Light” product theme; light mapping uses Snow Storm backgrounds with Polar/Frost accents for text/accent. Dark uses Polar Night. Aurora (`nord11–15`) for danger/warning/clusters; Frost (`nord7–10`) for accent/selected. |

Each recipe file exports explicit `light` / `dark` maps and a short comment citing canonical role → semantic role.

### D. Palette package vs local typed tables (decision)

**Decision: vendor local typed palette tables under `src/ui/theme/palettes/` — do not add npm palette packages.**

| Option | Pros | Cons |
| --- | --- | --- |
| Add `@catppuccin/palette`, `@rose-pine/palette`, … | Canonical imports | Multiple deps for static hex; Everforest/Nord packaging inconsistent; runtime weight with no behavior |
| **Local typed tables (chosen)** | Zero new runtime deps; uniform API; explicit provenance; matches “avoid deps that add no real value” | Must copy hex carefully and cite licenses |

**Provenance / license (compliant attribution — binding):**

Saying “MIT” alone is **not** enough. Implementation must preserve the relevant upstream copyright notice and permission notice text.

| Palette | Canonical source | Upstream copyright (preserve) | License |
| --- | --- | --- | --- |
| Rosé Pine | https://github.com/rose-pine/palette (Dawn / Moon hex) | `Copyright (c) mvllow` | MIT |
| Catppuccin | https://github.com/catppuccin/palette (Latte / Mocha) | `Copyright (c) 2021 Catppuccin` | MIT |
| Everforest | https://github.com/sainnhe/everforest (Medium light/dark) | `Copyright (c) 2019 sainnhe` | MIT |
| Nord | https://github.com/nordtheme/nord | `Copyright (c) 2016-present Sven Greb <development@svengreb.de>` | MIT |

**Required delivery shape:**

1. Add `docs/third-party/theme-palettes.md` containing, for each palette: project name, source URL, full MIT license text including the copyright line above (or an equally complete notice block copied from the upstream LICENSE).
2. Each vendored palette module (`src/ui/theme/palettes/*.ts`) must cite that notices file in a file header (path + palette id). Optional: `provenance.ts` re-exports a constant map of `{ id, noticesPath, sourceUrl }` for tests.
3. Unit test (or import-boundary-style check) asserts the notices artifact exists and mentions all four palette ids / copyright strings.

Do **not** vendor CSS frameworks or theme engines — hex tables + compliant notices only.

### E. Orthogonality: Recipe × Color Scheme

```text
shell.themeRecipeId     // which palette family
shell.colorScheme       // system | light | dark   (unchanged)
resolvedScheme          // light | dark
applied tokens          // recipe.resolve(resolvedScheme)
```

- Changing recipe **must not** change `colorScheme`.
- Changing `colorScheme` / OS preference **must not** change `themeRecipeId`.
- `system` continues to follow `prefers-color-scheme` independently ([`resolveColorScheme`](../../src/workspace/defaults.ts) + existing `matchMedia` listener in App).
- Theme hint key remains resolved-scheme-only (no recipe in `plt.workspace.theme`).

### F. Preference persistence & migration

**Field:** add `themeRecipeId: ThemeRecipeId` to `WorkspaceShellLayout`.

**Schema version:** **keep `LAYOUT_VERSION = 2`** — no bump.

Rationale (document for review):

- v2 payloads without `themeRecipeId` remain valid JSON shape; parser defaults missing field to `DEFAULT_THEME_RECIPE_ID` (same pattern as optional `archivedPaneOpen` / legacy `colorScheme`).
- Bumping to v3 would force needless invalidation of otherwise-valid layouts.
- Storage key stays `plt.workspace.layout.v2`.

**Migration rules:**

| Stored state | Behavior |
| --- | --- |
| No preferences | Default shell → Rosé Pine + `colorScheme: system` |
| v1 / v2 without `themeRecipeId` | `themeRecipeId = DEFAULT_THEME_RECIPE_ID` (`rose-pine`) |
| Unknown recipe string | Fallback to default (deterministic) |
| Valid recipe id | Restore as-is |

**Also:**

- Extend `serializeWorkspacePreferences` shell slice to include `themeRecipeId`.
- Add `themeRecipeId` to `PREFERENCE_ONLY_KEYS` in [`semantic.ts`](../../src/workspace/persistence/semantic.ts) so semantic payloads cannot smuggle it.
- Recipe change: `commit(updateShell(..., { themeRecipeId }), false)` — assert semantic key not written (extend theme-resolution tests).

### G. Settings “配色方案” selector

In existing Settings `Menu`, **below** Appearance (`theme-switch`), add:

1. Label: `app.themeRecipe` → EN `"Color recipe"` / zh-CN `"配色方案"`.
2. Compact button row (reuse `.theme-switch` / `.locale-switch` layout patterns; shared active styles). Consider class `recipe-switch` if needed for test hooks only — no visual redesign.
3. One button per registry entry; `data-testid="theme-recipe-{id}"`; group `data-testid="theme-recipe-switch"`.
4. Brand names as proper nouns in both locales: Rosé Pine / Catppuccin / Everforest / Nord (no forced Chinese transliteration).
5. Immediate apply via existing preference autosave path + `useLayoutEffect` theme apply (no reload).

Do **not** add a dedicated Theme page.

### H. zh-CN localization

Add keys (EN + zh-CN) in `messages.ts`:

| Key | en-US | zh-CN |
| --- | --- | --- |
| `app.themeRecipe` | Color recipe | 配色方案 |
| `app.recipeRosePine` | Rosé Pine | Rosé Pine |
| `app.recipeCatppuccin` | Catppuccin | Catppuccin |
| `app.recipeEverforest` | Everforest | Everforest |
| `app.recipeNord` | Nord | Nord |

Cover with existing i18n test patterns / Settings assertion in zh-CN locale.

### I. Accessibility / contrast

During implementation (not Plan-only theater):

1. For each recipe × scheme, check practical contrast for:
   - `text-primary` on `bg-surface` / `bg-node` / `bg-elevated`
   - `text-secondary` / `text-muted` on `bg-surface` (muted may be AA Large only — document if so)
   - Accent button: `text-inverse` on `accent`
   - Focus ring / selected outline visible on canvas and node
   - Warning/danger icons/text on surface (not on saturated fills)
2. Target WCAG **AA** for primary text and controls; adjust mapping (not CSS structure) if a popular palette role fails.
3. Record a short contrast notes subsection in the recipe file or Plan follow-up during acceptance if any intentional tradeoff remains.
4. Do not assume popularity ⇒ accessibility.

### J. apply-theme expansion

Extend without breaking existing helpers:

```ts
applyWorkspaceTheme(storage, colorScheme, themeRecipeId)
  → resolved = reconcileThemeHint(...)
  → tokens = getThemeRecipe(themeRecipeId).resolve(resolved)
  → set data-theme, data-theme-recipe, CSS variables on documentElement
```

App `useLayoutEffect` deps: `resolvedTheme`, `themeRecipeId`, storage, systemDark.

First paint: `main.tsx` / boot path already applies theme hint where used; ensure recipe default applies before paint if a boot helper exists — if not, `:root` fallbacks = Rosé Pine light values until effect runs (acceptable; document).

---

## Testing strategy

### Unit / UI (Vitest)

| Case | Location (suggested) |
| --- | --- |
| Registry exposes exactly four recipes in stable order | `tests/ui/theme-recipe-registry.test.ts` |
| Each recipe resolves light **and** dark with every required semantic token populated (non-empty) | same |
| Unknown / missing recipe id → default | same + preferences parse |
| Legacy preference JSON without `themeRecipeId` → default recipe; `colorScheme` preserved | `tests/workspace/...` or preferences tests |
| Changing recipe updates DOM vars / `data-theme-recipe` **without** writing `WORKSPACE_SEMANTIC_KEY` | extend `tests/ui/theme-resolution.test.tsx` |
| `system` still tracks OS independently of recipe | extend theme-resolution tests |
| zh-CN Settings shows `配色方案` | i18n / product-workspace style UI test |
| `PREFERENCE_ONLY_KEYS` rejects semantic smuggling of `themeRecipeId` | semantic persistence test if pattern exists |

### E2E / visual A/B

**Binding:** produce **exactly 8** comparable screenshots — `4 recipes × 2 resolved schemes` — of the **same** representative product scene. Partial dark “smoke” coverage is not acceptable for TASK-007 evaluation.

1. **Opt-in acceptance screenshots:**  
   `e2e/acceptance/task-007-theme-recipes.spec.ts` gated by `E2E_ACCEPTANCE_SHOTS=1`.  
   Seed the **same** demo workspace ([`createDemoWorkspaceFixture`](../../src/fixtures/demo-workspace.js)). For each `(themeRecipeId, resolvedScheme)` pair: set recipe + force scheme (`light`/`dark`, not `system`), wait for shell/`data-theme`/`data-theme-recipe`, screenshot the same shell framing.  
   Output under `docs/milestones/task-007-theme-recipes/`:

   ```text
   light-rose-pine.png
   light-catppuccin.png
   light-everforest.png
   light-nord.png
   dark-rose-pine.png
   dark-catppuccin.png
   dark-everforest.png
   dark-nord.png
   ```

2. Acceptance harness must fail (or clearly report incomplete) if fewer than these eight files are produced for a shot run.

3. **Regression visual (optional thin):** one CI snapshot in `e2e/visual/` for default recipe light shell if cost is acceptable; otherwise keep visual CI unchanged and rely on the eight acceptance shots + unit token tests. The eight acceptance shots remain the Plan’s required A/B evidence regardless.

4. Do not assert pixel equality across recipes — screenshots are for **human A/B**, not cross-recipe snapshot matching.

### Commands before acceptance

`npm run typecheck`, `npm test`, `npm run build`, and relevant `npm run test:e2e` / acceptance shot generation.

---

## Implementation sequence (post–plan approval only)

1. Types + defaults + preference parse/serialize + semantic `PREFERENCE_ONLY_KEYS` (no UI yet).
2. `docs/third-party/theme-palettes.md` notices + Medium Everforest / Dawn·Moon / Latte·Mocha / Nord palette tables + recipe resolvers + registry + token completeness + notices presence tests.
3. Extend `apply-theme` + App wiring; strip/relocate CSS `:root` hex into recipes; add `--color-backdrop`.
4. Settings selector + i18n.
5. Theme-resolution / persistence / i18n tests.
6. Acceptance screenshot harness emitting all **8** recipe×scheme shots of one scene.
7. Contrast pass + mapping tweaks (still Medium Everforest only).
8. Rebase/merge awareness vs TASK-006 if still open (see below).

---

## Conflict handling with TASK-005 / TASK-006

| Risk | Handling |
| --- | --- |
| TASK-006 edits `App.tsx` Settings / inspector / chat | Keep recipe selector additive in Settings Menu only; avoid reformatting unrelated JSX. When merging, re-apply recipe block if Settings chunk conflicts. |
| TASK-006 edits `styles.css` feature rules | Do not restyle nodes/details/chat. Limit TASK-007 CSS edits to token **definitions**, backdrop token, and shared switch selectors if needed. |
| TASK-006 edits `messages.ts` | Add keys in alphabetical/local grouping without rewriting TASK-006 strings. |
| TASK-005 later touches project/tree UX | Out of scope; no shared requirement absorption. If both land, theme tokens remain the integration point. |
| Preference schema | TASK-007 owns `themeRecipeId`; other tasks must not overload `colorScheme`. |

**Policy:** TASK-007 remains an independent PR. Surface merge conflicts explicitly; never fold TASK-005/006 product scope into this branch.

---

## Out of scope (explicit)

- Tailwind / shadcn / tweakcn / component library replacement
- Font, spacing, radius, motion redesign
- Chat / Details / Project creation UX changes
- Domain lifecycle, tree topology, edge routing algorithms
- Choosing permanent product default beyond evaluation constant (acceptance decision)
- Accounts, collaboration, server themes

---

## Acceptance mapping

| Requirement AC | Plan coverage |
| --- | --- |
| Four selectable recipes | Registry + Settings |
| Light and dark each | `resolve(scheme)` per recipe |
| No palette-family names in consumers | Token contract + cleanup scope |
| Preference-only; no DomainSnapshot mutation | `commit(..., false)` + tests |
| `system\|light\|dark` intact | Orthogonal field + existing resolver |
| zh-CN Settings | i18n keys |
| Immediate coherent update | `useLayoutEffect` apply vars |
| Automated tests | Unit + UI + acceptance shots |
| Visual A/B | **8** screenshots: 4 recipes × light/dark, same scene |
| Tooling green | typecheck / test / build / e2e |
| No framework migration | Local tables + `docs/third-party/theme-palettes.md` |

---

## Confirmed decisions (closed)

Previously open Plan questions are closed by PR #28 review:

1. Rosé Pine dark = **Moon**.
2. Keep `LAYOUT_VERSION = 2`; missing/unknown `themeRecipeId` defaults deterministically to Rosé Pine.
3. Local typed palette tables only; no palette npm packages.
4. Evaluation default = **Rosé Pine** (`DEFAULT_THEME_RECIPE_ID`); permanent product default deferred to Acceptance.
5. Theme Recipe remains orthogonal to `system | light | dark`.
6. Everforest = **Medium** for light and dark.
7. Visual evidence = **8** acceptance screenshots under `docs/milestones/task-007-theme-recipes/` via `E2E_ACCEPTANCE_SHOTS=1` (not optional dark smoke; CI `toHaveScreenshot` for all eight is not required if the eight acceptance files are produced).

---

## Stop condition

This Plan revision addresses REQUEST CHANGES and returns to ChatGPT for re-review. `plan_approved` stays `false`. **No product implementation** until ChatGPT sets `plan_approved: true` and advances the Requirement stage.
