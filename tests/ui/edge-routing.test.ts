import { describe, expect, it } from "vitest";
import {
  deriveEdgeHandles,
  SOURCE_HANDLES,
  TARGET_HANDLES,
} from "../../src/ui/tree/edge-routing.js";

describe("deriveEdgeHandles", () => {
  it("routes to the right when the target is right of the source", () => {
    expect(deriveEdgeHandles({ x: 0, y: 0 }, { x: 100, y: 10 })).toEqual({
      sourceHandle: SOURCE_HANDLES.right,
      targetHandle: TARGET_HANDLES.left,
    });
  });

  it("routes to the left when the target is left of the source", () => {
    expect(deriveEdgeHandles({ x: 100, y: 0 }, { x: 0, y: 10 })).toEqual({
      sourceHandle: SOURCE_HANDLES.left,
      targetHandle: TARGET_HANDLES.right,
    });
  });

  it("routes downward when the target is below the source", () => {
    expect(deriveEdgeHandles({ x: 0, y: 0 }, { x: 10, y: 100 })).toEqual({
      sourceHandle: SOURCE_HANDLES.bottom,
      targetHandle: TARGET_HANDLES.top,
    });
  });

  it("routes upward when the target is above the source", () => {
    expect(deriveEdgeHandles({ x: 0, y: 100 }, { x: 10, y: 0 })).toEqual({
      sourceHandle: SOURCE_HANDLES.top,
      targetHandle: TARGET_HANDLES.bottom,
    });
  });

  it("prefers vertical routing on diagonal ties", () => {
    expect(deriveEdgeHandles({ x: 0, y: 0 }, { x: 50, y: 50 })).toEqual({
      sourceHandle: SOURCE_HANDLES.bottom,
      targetHandle: TARGET_HANDLES.top,
    });
  });

  it("changes handles when relative placement swaps", () => {
    const before = deriveEdgeHandles({ x: 0, y: 0 }, { x: 120, y: 0 });
    const after = deriveEdgeHandles({ x: 0, y: 0 }, { x: 0, y: -120 });
    expect(before).toEqual({
      sourceHandle: SOURCE_HANDLES.right,
      targetHandle: TARGET_HANDLES.left,
    });
    expect(after).toEqual({
      sourceHandle: SOURCE_HANDLES.top,
      targetHandle: TARGET_HANDLES.bottom,
    });
  });
});
