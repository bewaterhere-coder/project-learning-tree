import type { ResolvedColorScheme } from "../../../workspace/index.js";
import {
  EVERFOREST_MEDIUM_DARK,
  EVERFOREST_MEDIUM_LIGHT,
} from "../palettes/everforest.js";
import {
  clusterWash,
  edgeFromBorder,
  type ThemeRecipe,
  type ThemeStyleVars,
} from "../theme-recipe.js";

function resolve(scheme: ResolvedColorScheme): ThemeStyleVars {
  const p =
    scheme === "light" ? EVERFOREST_MEDIUM_LIGHT : EVERFOREST_MEDIUM_DARK;
  const light = scheme === "light";
  return {
    "--color-bg-canvas": p.bgDim,
    "--color-bg-surface": p.bg0,
    "--color-bg-elevated": p.bg1,
    "--color-bg-node": p.bg1,
    "--color-text-primary": p.fg,
    "--color-text-secondary": light ? p.grey2 : p.grey2,
    "--color-text-muted": light ? p.grey1 : p.grey1,
    "--color-text-inverse": light ? p.bg0 : p.bg0,
    "--color-border-default": p.bg3,
    "--color-border-strong": p.bg5,
    "--color-border-accent": p.green,
    "--color-accent": p.green,
    "--color-accent-hover": p.aqua,
    "--color-accent-subtle": p.bgGreen,
    "--color-success": p.green,
    "--color-warning": p.yellow,
    "--color-danger": p.red,
    "--color-learning-active": p.bgGreen,
    "--color-learning-selected": p.blue,
    "--color-learning-parked": p.bgYellow,
    "--color-learning-completed": p.bg2,
    "--color-focus-ring": p.blue,
    "--color-edge-quiet": edgeFromBorder(p.bg3, light ? 55 : 50),
    "--color-edge-default": edgeFromBorder(p.bg5, light ? 70 : 65),
    "--color-cluster-0": clusterWash(p.blue, light ? 12 : 14),
    "--color-cluster-1": clusterWash(p.green, light ? 11 : 13),
    "--color-cluster-2": clusterWash(p.yellow, light ? 11 : 13),
    "--color-cluster-3": clusterWash(p.purple, light ? 11 : 13),
    "--color-cluster-4": clusterWash(p.orange, light ? 11 : 13),
    "--color-backdrop": light
      ? "color-mix(in srgb, #5c6a72 35%, transparent)"
      : "color-mix(in srgb, #232a2e 55%, transparent)",
    "--shadow-node": light
      ? "0 6px 16px rgba(92, 106, 114, 0.08)"
      : "0 8px 18px rgba(0, 0, 0, 0.28)",
    "--shadow-overlay": light
      ? "-4px 0 18px rgba(92, 106, 114, 0.08)"
      : "-4px 0 16px rgba(0, 0, 0, 0.28)",
  };
}

export const everforestRecipe: ThemeRecipe = {
  id: "everforest",
  labelKey: "app.recipeEverforest",
  resolve,
};
