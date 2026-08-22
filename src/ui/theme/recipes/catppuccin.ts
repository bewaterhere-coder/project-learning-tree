import type { ResolvedColorScheme } from "../../../workspace/index.js";
import { CATPPUCCIN_LATTE, CATPPUCCIN_MOCHA } from "../palettes/catppuccin.js";
import {
  clusterWash,
  edgeFromBorder,
  type ThemeRecipe,
  type ThemeStyleVars,
} from "../theme-recipe.js";

function resolve(scheme: ResolvedColorScheme): ThemeStyleVars {
  const p = scheme === "light" ? CATPPUCCIN_LATTE : CATPPUCCIN_MOCHA;
  const light = scheme === "light";
  return {
    "--color-bg-canvas": p.crust,
    "--color-bg-surface": p.mantle,
    "--color-bg-elevated": p.base,
    "--color-bg-node": p.base,
    "--color-text-primary": p.text,
    "--color-text-secondary": p.subtext1,
    "--color-text-muted": p.subtext0,
    "--color-text-inverse": light ? p.base : p.crust,
    "--color-border-default": light ? p.surface1 : p.surface0,
    "--color-border-strong": light ? p.surface2 : p.surface1,
    "--color-border-accent": p.teal,
    "--color-accent": p.teal,
    "--color-accent-hover": p.sapphire,
    "--color-accent-subtle": light ? p.surface0 : p.surface0,
    "--color-success": p.green,
    "--color-warning": p.yellow,
    "--color-danger": p.red,
    "--color-learning-active": light ? p.surface0 : p.surface0,
    "--color-learning-selected": p.blue,
    "--color-learning-parked": light
      ? clusterWash(p.peach, 16)
      : clusterWash(p.peach, 14),
    "--color-learning-completed": light ? p.surface1 : p.surface1,
    "--color-focus-ring": p.lavender,
    "--color-edge-quiet": edgeFromBorder(
      light ? p.surface1 : p.surface0,
      light ? 55 : 50,
    ),
    "--color-edge-default": edgeFromBorder(
      light ? p.surface2 : p.surface1,
      light ? 70 : 65,
    ),
    "--color-cluster-0": clusterWash(p.blue, light ? 12 : 14),
    "--color-cluster-1": clusterWash(p.teal, light ? 11 : 13),
    "--color-cluster-2": clusterWash(p.yellow, light ? 11 : 13),
    "--color-cluster-3": clusterWash(p.mauve, light ? 11 : 13),
    "--color-cluster-4": clusterWash(p.peach, light ? 11 : 13),
    "--color-backdrop": light
      ? "color-mix(in srgb, #4c4f69 35%, transparent)"
      : "color-mix(in srgb, #11111b 55%, transparent)",
    "--shadow-node": light
      ? "0 6px 16px rgba(76, 79, 105, 0.08)"
      : "0 8px 18px rgba(0, 0, 0, 0.28)",
    "--shadow-overlay": light
      ? "-4px 0 18px rgba(76, 79, 105, 0.08)"
      : "-4px 0 16px rgba(0, 0, 0, 0.28)",
  };
}

export const catppuccinRecipe: ThemeRecipe = {
  id: "catppuccin",
  labelKey: "app.recipeCatppuccin",
  resolve,
};
