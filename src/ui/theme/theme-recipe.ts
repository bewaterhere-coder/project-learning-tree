import type { ResolvedColorScheme, ThemeRecipeId } from "../../workspace/index.js";
import { DEFAULT_THEME_RECIPE_ID } from "../../workspace/index.js";
import { catppuccinRecipe } from "./recipes/catppuccin.js";
import { everforestRecipe } from "./recipes/everforest.js";
import { nordRecipe } from "./recipes/nord.js";
import { rosePineRecipe } from "./recipes/rose-pine.js";

/** CSS custom properties set by recipes (semantic contract). */
export const THEME_STYLE_VAR_KEYS = [
  "--color-bg-canvas",
  "--color-bg-surface",
  "--color-bg-elevated",
  "--color-bg-node",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-text-inverse",
  "--color-border-default",
  "--color-border-strong",
  "--color-border-accent",
  "--color-accent",
  "--color-accent-hover",
  "--color-accent-subtle",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-learning-active",
  "--color-learning-selected",
  "--color-learning-parked",
  "--color-learning-completed",
  "--color-focus-ring",
  "--color-edge-quiet",
  "--color-edge-default",
  "--color-cluster-0",
  "--color-cluster-1",
  "--color-cluster-2",
  "--color-cluster-3",
  "--color-cluster-4",
  "--color-backdrop",
  "--shadow-node",
  "--shadow-overlay",
] as const;

export type ThemeStyleVarKey = (typeof THEME_STYLE_VAR_KEYS)[number];
export type ThemeStyleVars = Record<ThemeStyleVarKey, string>;

export interface ThemeRecipe {
  id: ThemeRecipeId;
  labelKey:
    | "app.recipeRosePine"
    | "app.recipeCatppuccin"
    | "app.recipeEverforest"
    | "app.recipeNord";
  resolve(scheme: ResolvedColorScheme): ThemeStyleVars;
}

export const THEME_RECIPES: readonly ThemeRecipe[] = [
  rosePineRecipe,
  catppuccinRecipe,
  everforestRecipe,
  nordRecipe,
] as const;

const byId = new Map<ThemeRecipeId, ThemeRecipe>(
  THEME_RECIPES.map((recipe) => [recipe.id, recipe]),
);

export function getThemeRecipe(id: string | undefined): ThemeRecipe {
  if (id !== undefined && byId.has(id as ThemeRecipeId)) {
    return byId.get(id as ThemeRecipeId)!;
  }
  return byId.get(DEFAULT_THEME_RECIPE_ID)!;
}

export function clusterWash(hex: string, percent: number): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`;
}

export function edgeFromBorder(border: string, percent: number): string {
  return `color-mix(in srgb, ${border} ${percent}%, transparent)`;
}
