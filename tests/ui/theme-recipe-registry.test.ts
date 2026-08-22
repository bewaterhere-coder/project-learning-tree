import { describe, expect, it } from "vitest";
import {
  getThemeRecipe,
  THEME_RECIPES,
  THEME_STYLE_VAR_KEYS,
} from "../../src/ui/theme/theme-recipe.js";
import { DEFAULT_THEME_RECIPE_ID } from "../../src/workspace/index.js";

describe("theme recipe registry", () => {
  it("exposes exactly the four planned recipes in stable order", () => {
    expect(THEME_RECIPES.map((recipe) => recipe.id)).toEqual([
      "rose-pine",
      "catppuccin",
      "everforest",
      "nord",
    ]);
  });

  it("resolves every semantic token for light and dark on each recipe", () => {
    for (const recipe of THEME_RECIPES) {
      for (const scheme of ["light", "dark"] as const) {
        const vars = recipe.resolve(scheme);
        for (const key of THEME_STYLE_VAR_KEYS) {
          expect(vars[key], `${recipe.id}/${scheme}/${key}`).toBeTruthy();
          expect(String(vars[key]).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("falls back to the evaluation default for missing or unknown ids", () => {
    expect(getThemeRecipe(undefined).id).toBe(DEFAULT_THEME_RECIPE_ID);
    expect(getThemeRecipe("not-a-recipe").id).toBe(DEFAULT_THEME_RECIPE_ID);
    expect(DEFAULT_THEME_RECIPE_ID).toBe("rose-pine");
  });
});
