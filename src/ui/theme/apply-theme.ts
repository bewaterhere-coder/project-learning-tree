import type {
  ColorScheme,
  PreferenceStorage,
  ResolvedColorScheme,
  ThemeRecipeId,
} from "../../workspace/index.js";
import { reconcileThemeHint, resolveColorScheme } from "../../workspace/index.js";
import { getThemeRecipe, THEME_STYLE_VAR_KEYS } from "./theme-recipe.js";

export function systemPrefersDark(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function applyThemeStyleVars(
  recipeId: ThemeRecipeId | string | undefined,
  resolved: ResolvedColorScheme,
): void {
  const recipe = getThemeRecipe(recipeId);
  const vars = recipe.resolve(resolved);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeRecipe = recipe.id;
  root.style.colorScheme = resolved;
  for (const key of THEME_STYLE_VAR_KEYS) {
    root.style.setProperty(key, vars[key]);
  }
}

/** @deprecated Prefer applyThemeStyleVars with recipe id; kept for call-site clarity. */
export function applyResolvedTheme(resolved: ResolvedColorScheme): void {
  applyThemeStyleVars(undefined, resolved);
}

export function applyWorkspaceTheme(
  storage: PreferenceStorage,
  colorScheme: ColorScheme,
  themeRecipeId?: ThemeRecipeId | string,
): ResolvedColorScheme {
  const resolved = reconcileThemeHint(storage, colorScheme, systemPrefersDark());
  applyThemeStyleVars(themeRecipeId, resolved);
  return resolved;
}

export function resolvedFromScheme(colorScheme: ColorScheme): ResolvedColorScheme {
  return resolveColorScheme(colorScheme, systemPrefersDark());
}
