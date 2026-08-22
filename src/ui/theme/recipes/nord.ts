import type { ResolvedColorScheme } from "../../../workspace/index.js";
import { NORD } from "../palettes/nord.js";
import {
  clusterWash,
  edgeFromBorder,
  type ThemeRecipe,
  type ThemeStyleVars,
} from "../theme-recipe.js";

function resolve(scheme: ResolvedColorScheme): ThemeStyleVars {
  const n = NORD;
  const light = scheme === "light";
  // Light: Snow Storm backgrounds; dark: Polar Night.
  const canvas = light ? n.nord6 : n.nord0;
  const surface = light ? n.nord5 : n.nord1;
  const elevated = light ? n.nord4 : n.nord2;
  const node = light ? n.nord6 : n.nord2;
  const textPrimary = light ? n.nord0 : n.nord6;
  const textSecondary = light ? n.nord2 : n.nord4;
  const textMuted = light ? n.nord3 : n.nord3;
  const borderDefault = light ? n.nord4 : n.nord3;
  const borderStrong = light ? n.nord3 : n.nord3;
  return {
    "--color-bg-canvas": canvas,
    "--color-bg-surface": surface,
    "--color-bg-elevated": elevated,
    "--color-bg-node": node,
    "--color-text-primary": textPrimary,
    "--color-text-secondary": textSecondary,
    "--color-text-muted": textMuted,
    "--color-text-inverse": light ? n.nord6 : n.nord0,
    "--color-border-default": borderDefault,
    "--color-border-strong": borderStrong,
    "--color-border-accent": n.nord8,
    "--color-accent": n.nord10,
    "--color-accent-hover": n.nord8,
    "--color-accent-subtle": light
      ? clusterWash(n.nord8, 18)
      : clusterWash(n.nord10, 22),
    "--color-success": n.nord14,
    "--color-warning": n.nord13,
    "--color-danger": n.nord11,
    "--color-learning-active": light
      ? clusterWash(n.nord14, 22)
      : clusterWash(n.nord14, 18),
    "--color-learning-selected": n.nord8,
    "--color-learning-parked": light
      ? clusterWash(n.nord13, 22)
      : clusterWash(n.nord12, 18),
    "--color-learning-completed": light ? n.nord4 : n.nord1,
    "--color-focus-ring": n.nord8,
    "--color-edge-quiet": edgeFromBorder(borderDefault, light ? 55 : 50),
    "--color-edge-default": edgeFromBorder(borderStrong, light ? 70 : 65),
    "--color-cluster-0": clusterWash(n.nord10, light ? 12 : 14),
    "--color-cluster-1": clusterWash(n.nord14, light ? 11 : 13),
    "--color-cluster-2": clusterWash(n.nord13, light ? 11 : 13),
    "--color-cluster-3": clusterWash(n.nord15, light ? 11 : 13),
    "--color-cluster-4": clusterWash(n.nord12, light ? 11 : 13),
    "--color-backdrop": light
      ? "color-mix(in srgb, #2e3440 35%, transparent)"
      : "color-mix(in srgb, #2e3440 55%, transparent)",
    "--shadow-node": light
      ? "0 6px 16px rgba(46, 52, 64, 0.08)"
      : "0 8px 18px rgba(0, 0, 0, 0.28)",
    "--shadow-overlay": light
      ? "-4px 0 18px rgba(46, 52, 64, 0.08)"
      : "-4px 0 16px rgba(0, 0, 0, 0.28)",
  };
}

export const nordRecipe: ThemeRecipe = {
  id: "nord",
  labelKey: "app.recipeNord",
  resolve,
};
