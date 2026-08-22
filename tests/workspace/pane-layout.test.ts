import { describe, expect, it } from "vitest";
import {
  ARCHIVED_COLLAPSE_THRESHOLD,
  clampArchivedPaneHeight,
  DEFAULT_ARCHIVED_PANE_HEIGHT,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_ARCHIVED_PANE_HEIGHT,
  MIN_SIDEBAR_WIDTH,
  resolveArchivedRelease,
  resolveSidebarRelease,
  SIDEBAR_COLLAPSE_THRESHOLD,
} from "../../src/workspace/index.js";

describe("sidebar pane release", () => {
  it("snaps widths between the collapse threshold and the minimum", () => {
    expect(resolveSidebarRelease(150, 260)).toEqual({
      open: true,
      size: MIN_SIDEBAR_WIDTH,
    });
  });

  it("collapses when the drag crosses the threshold and keeps the last width", () => {
    expect(
      resolveSidebarRelease(SIDEBAR_COLLAPSE_THRESHOLD, 320),
    ).toEqual({ open: false, size: 320 });
    expect(resolveSidebarRelease(40, 320)).toEqual({ open: false, size: 320 });
  });

  it("keeps a valid expanded width", () => {
    expect(resolveSidebarRelease(300, 260)).toEqual({ open: true, size: 300 });
  });

  it("falls back to the last expanded width when the drag value is invalid", () => {
    expect(resolveSidebarRelease(Number.NaN, DEFAULT_SIDEBAR_WIDTH)).toEqual({
      open: true,
      size: DEFAULT_SIDEBAR_WIDTH,
    });
  });
});

describe("archived pane release", () => {
  it("snaps short drags to the minimum height", () => {
    expect(resolveArchivedRelease(70, 168)).toEqual({
      open: true,
      size: MIN_ARCHIVED_PANE_HEIGHT,
    });
  });

  it("collapses when dragged through the threshold", () => {
    expect(
      resolveArchivedRelease(ARCHIVED_COLLAPSE_THRESHOLD, 200),
    ).toEqual({ open: false, size: 200 });
  });

  it("clamps against remaining sidebar height", () => {
    expect(resolveArchivedRelease(400, 168, 220)).toEqual({
      open: true,
      size: 100,
    });
  });

  it("defaults invalid heights", () => {
    expect(clampArchivedPaneHeight(Number.NaN)).toBe(DEFAULT_ARCHIVED_PANE_HEIGHT);
  });
});
