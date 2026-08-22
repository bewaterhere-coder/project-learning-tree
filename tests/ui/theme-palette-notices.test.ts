import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THEME_PALETTE_NOTICES_PATH,
  THEME_PALETTE_PROVENANCE,
} from "../../src/ui/theme/palettes/provenance.js";

describe("theme palette notices", () => {
  it("ships a notices artifact covering all four palette copyrights", () => {
    const absolute = resolve(process.cwd(), THEME_PALETTE_NOTICES_PATH);
    const text = readFileSync(absolute, "utf8");
    expect(THEME_PALETTE_PROVENANCE).toHaveLength(4);
    for (const entry of THEME_PALETTE_PROVENANCE) {
      expect(text).toContain(entry.copyright);
      expect(text).toContain(entry.sourceUrl);
      expect(text.toLowerCase()).toContain("mit license");
    }
    expect(text).toMatch(/Ros[eé] Pine/i);
    expect(text).toContain("Catppuccin");
    expect(text).toContain("Everforest");
    expect(text).toContain("Nord");
  });
});
