/**
 * Theme palette provenance pointers.
 * Full copyright/license text: docs/third-party/theme-palettes.md
 */

import type { ThemeRecipeId } from "../../../workspace/index.js";

export const THEME_PALETTE_NOTICES_PATH =
  "docs/third-party/theme-palettes.md" as const;

export interface ThemePaletteProvenance {
  id: ThemeRecipeId;
  noticesPath: typeof THEME_PALETTE_NOTICES_PATH;
  sourceUrl: string;
  copyright: string;
}

export const THEME_PALETTE_PROVENANCE: readonly ThemePaletteProvenance[] = [
  {
    id: "rose-pine",
    noticesPath: THEME_PALETTE_NOTICES_PATH,
    sourceUrl: "https://github.com/rose-pine/palette",
    copyright: "Copyright (c) mvllow",
  },
  {
    id: "catppuccin",
    noticesPath: THEME_PALETTE_NOTICES_PATH,
    sourceUrl: "https://github.com/catppuccin/palette",
    copyright: "Copyright (c) 2021 Catppuccin",
  },
  {
    id: "everforest",
    noticesPath: THEME_PALETTE_NOTICES_PATH,
    sourceUrl: "https://github.com/sainnhe/everforest",
    copyright: "Copyright (c) 2019 sainnhe",
  },
  {
    id: "nord",
    noticesPath: THEME_PALETTE_NOTICES_PATH,
    sourceUrl: "https://github.com/nordtheme/nord",
    copyright:
      "Copyright (c) 2016-present Sven Greb <development@svengreb.de>",
  },
] as const;
