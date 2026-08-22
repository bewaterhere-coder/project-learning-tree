import type { ResolvedColorScheme } from "../../../workspace/index.js";
import { ROSE_PINE_DAWN, ROSE_PINE_MOON } from "../palettes/rose-pine.js";
import {
  clusterWash,
  edgeFromBorder,
  type ThemeRecipe,
  type ThemeStyleVars,
} from "../theme-recipe.js";

function resolve(scheme: ResolvedColorScheme): ThemeStyleVars {
  const p = scheme === "light" ? ROSE_PINE_DAWN : ROSE_PINE_MOON;
  const light = scheme === "light";
  const borderDefault = light ? p.highlightMed : p.highlightMed;
  const borderStrong = light ? p.highlightHigh : p.highlightHigh;
  return {
    "--color-bg-canvas": p.base,
    "--color-bg-surface": light ? p.surface : p.surface,
    "--color-bg-elevated": light ? p.overlay : p.overlay,
    "--color-bg-node": light ? p.surface : p.overlay,
    "--color-text-primary": p.text,
    "--color-text-secondary": p.subtle,
    "--color-text-muted": p.muted,
    "--color-text-inverse": light ? p.surface : p.base,
    "--color-border-default": borderDefault,
    "--color-border-strong": borderStrong,
    "--color-border-accent": p.pine,
    "--color-accent": p.pine,
    "--color-accent-hover": p.foam,
    "--color-accent-subtle": light ? p.highlightLow : p.highlightLow,
    "--color-success": p.foam,
    "--color-warning": p.gold,
    "--color-danger": p.love,
    "--color-learning-active": light ? p.highlightLow : p.highlightLow,
    "--color-learning-selected": p.iris,
    "--color-learning-parked": light
      ? clusterWash(p.gold, 18)
      : clusterWash(p.gold, 16),
    "--color-learning-completed": light ? p.overlay : p.highlightMed,
    "--color-focus-ring": p.iris,
    "--color-edge-quiet": edgeFromBorder(borderDefault, light ? 55 : 50),
    "--color-edge-default": edgeFromBorder(borderStrong, light ? 70 : 65),
    "--color-cluster-0": clusterWash(p.foam, light ? 12 : 14),
    "--color-cluster-1": clusterWash(p.pine, light ? 11 : 13),
    "--color-cluster-2": clusterWash(p.gold, light ? 11 : 13),
    "--color-cluster-3": clusterWash(p.iris, light ? 11 : 13),
    "--color-cluster-4": clusterWash(p.rose, light ? 11 : 13),
    "--color-backdrop": light
      ? "color-mix(in srgb, #575279 35%, transparent)"
      : "color-mix(in srgb, #232136 55%, transparent)",
    "--shadow-node": light
      ? "0 6px 16px rgba(87, 82, 121, 0.08)"
      : "0 8px 18px rgba(0, 0, 0, 0.28)",
    "--shadow-overlay": light
      ? "-4px 0 18px rgba(87, 82, 121, 0.08)"
      : "-4px 0 16px rgba(0, 0, 0, 0.28)",
  };
}

export const rosePineRecipe: ThemeRecipe = {
  id: "rose-pine",
  labelKey: "app.recipeRosePine",
  resolve,
};
