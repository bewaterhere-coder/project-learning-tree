import type { ColorScheme, PreferenceStorage, ResolvedColorScheme } from "../../workspace/index.js";
import { reconcileThemeHint, resolveColorScheme } from "../../workspace/index.js";

export function systemPrefersDark(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function applyResolvedTheme(resolved: ResolvedColorScheme): void {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function applyWorkspaceTheme(
  storage: PreferenceStorage,
  colorScheme: ColorScheme,
): ResolvedColorScheme {
  const resolved = reconcileThemeHint(storage, colorScheme, systemPrefersDark());
  applyResolvedTheme(resolved);
  return resolved;
}

export function resolvedFromScheme(colorScheme: ColorScheme): ResolvedColorScheme {
  return resolveColorScheme(colorScheme, systemPrefersDark());
}
