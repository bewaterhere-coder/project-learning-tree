import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve(process.cwd(), "src/ui/styles.css");
const grabPath = resolve(process.cwd(), "src/ui/assets/cursors/canvas-grab.svg");
const grabbingPath = resolve(
  process.cwd(),
  "src/ui/assets/cursors/canvas-grabbing.svg",
);

describe("TASK-011 light-mode canvas cursor contract", () => {
  it("ships 32×32 dual-tone grab/grabbing assets", () => {
    expect(existsSync(grabPath)).toBe(true);
    expect(existsSync(grabbingPath)).toBe(true);

    for (const path of [grabPath, grabbingPath]) {
      const svg = readFileSync(path, "utf8");
      expect(svg).toMatch(/\bwidth="32"/);
      expect(svg).toMatch(/\bheight="32"/);
      expect(svg).toMatch(/viewBox="0 0 32 32"/);
      expect(svg).toMatch(/#F7F4EF/i);
      expect(svg).toMatch(/#1C1917/i);
    }
  });

  it("applies custom cursors only to light-theme XYFlow pane states", () => {
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toMatch(
      /html\[data-theme="light"\]\s*\.react-flow__pane\.draggable\s*\{[^}]*cursor:\s*url\("\.\/assets\/cursors\/canvas-grab\.svg"\)\s+14\s+3,\s*grab;/s,
    );
    expect(css).toMatch(
      /html\[data-theme="light"\]\s*\.react-flow__pane\.dragging\s*\{[^}]*cursor:\s*url\("\.\/assets\/cursors\/canvas-grabbing\.svg"\)\s+14\s+8,\s*grabbing;/s,
    );

    expect(css).not.toMatch(
      /html\[data-theme="dark"\][^{]*\.react-flow__pane\.(draggable|dragging)/,
    );
    expect(css).not.toMatch(
      /html\[data-theme="dark"\][^\{]*cursor:\s*url\([^)]*canvas-grab/,
    );
  });

  it("does not add speculative cursor:text hardening in this task", () => {
    const css = readFileSync(stylesPath, "utf8");
    const addedBlocks = [
      ...css.matchAll(
        /html\[data-theme="light"\]\s*\.react-flow__pane\.(?:draggable|dragging)\s*\{[^}]+\}/g,
      ),
    ].map((match) => match[0]);

    expect(addedBlocks).toHaveLength(2);
    for (const block of addedBlocks) {
      expect(block).not.toMatch(/cursor:\s*text/);
    }
  });
});
