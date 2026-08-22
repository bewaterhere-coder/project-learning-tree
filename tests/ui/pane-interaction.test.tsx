/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  archiveProject,
  createMemoryPreferenceStorage,
  MIN_SIDEBAR_WIDTH,
  updateShell,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
}

if (typeof PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  Object.defineProperty(globalThis, "PointerEvent", {
    value: PointerEventPolyfill,
  });
}

function trackingStorage() {
  const inner = createMemoryPreferenceStorage();
  const writes: string[] = [];
  return {
    getItem: (key: string) => inner.getItem(key),
    setItem: (key: string, value: string) => {
      writes.push(key);
      inner.setItem(key, value);
    },
    writes,
  };
}

function pointer(
  handle: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup",
  x: number,
  y: number,
) {
  fireEvent(
    handle,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
      buttons: type === "pointerup" ? 0 : 1,
    }),
  );
}

function drag(
  handle: HTMLElement,
  from: number,
  to: number,
  axis: "x" | "y" = "x",
) {
  const start = axis === "x" ? [from, 10] : [10, from];
  const end = axis === "x" ? [to, 10] : [10, to];
  pointer(handle, "pointerdown", start[0]!, start[1]!);
  pointer(handle, "pointermove", end[0]!, end[1]!);
}

describe("pane interaction", () => {
  it("resizes the sidebar on release and does not write during the drag", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = trackingStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);
    storage.writes.length = 0;
    const orderBefore = [
      projectA.snapshot.project.id,
      projectB.snapshot.project.id,
    ];
    const handle = screen.getByTestId("sidebar-resize");
    drag(handle, 260, 320);
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-width", "320");
    expect(storage.writes).toEqual([]);
    pointer(handle, "pointerup", 320, 10);
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-width", "320");
    expect(storage.writes.includes(WORKSPACE_PREFERENCES_KEY)).toBe(true);
    expect(storage.writes.includes(WORKSPACE_SEMANTIC_KEY)).toBe(false);
    expect(workspace.projects.map((project) => project.projectId)).toEqual(orderBefore);
  });

  it("snaps a partial width back to the minimum instead of leaving a cramped pane", () => {
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const handle = screen.getByTestId("sidebar-resize");
    drag(handle, 260, 150);
    pointer(handle, "pointerup", 150, 10);
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute(
      "data-width",
      String(MIN_SIDEBAR_WIDTH),
    );
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-open", "true");
  });

  it("collapses when dragged past the threshold and restores the last expanded width", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={updateShell(workspace, { projectSidebarWidth: 300 })}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const handle = screen.getByTestId("sidebar-resize");
    drag(handle, 300, 40);
    pointer(handle, "pointerup", 40, 10);
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-width", "300");
    await user.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute("data-width", "300");
    expect(
      screen.getByTestId(`project-item-${projectA.snapshot.project.id}`),
    ).toBeInTheDocument();
  });

  it("grows archived height when dragged up and collapses when dragged down past the threshold", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = trackingStorage();
    const prepared = updateShell(archiveProject(workspace, projectA.snapshot.project.id), {
      archivedPaneOpen: true,
      archivedPaneHeight: 180,
    });
    render(<App initialWorkspace={prepared} preferenceStorage={storage} />);
    storage.writes.length = 0;
    const handle = screen.getByTestId("archived-resize");
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-size", "180");

    drag(handle, 180, 140, "y");
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-size", "220");
    expect(storage.writes).toEqual([]);
    pointer(handle, "pointerup", 10, 140);
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-size", "220");
    expect(storage.writes.includes(WORKSPACE_SEMANTIC_KEY)).toBe(false);

    pointer(handle, "pointerdown", 10, 140);
    pointer(handle, "pointermove", 10, 180);
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-size", "180");
    pointer(handle, "pointermove", 10, 400);
    pointer(handle, "pointerup", 10, 400);
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByTestId("archived-list")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("archived-toggle"));
    expect(screen.getByTestId("archived-pane")).toHaveAttribute("data-size", "220");
    expect(screen.getByTestId("archived-list")).toHaveTextContent("M2 Demo Tree");

    await user.click(screen.getByTestId(`archived-actions-${projectA.snapshot.project.id}`));
    const restore = screen.getByTestId(`project-restore-${projectA.snapshot.project.id}`);
    expect(restore).toBeVisible();
    await user.click(restore);
    expect(
      screen.getByTestId(`project-item-${projectA.snapshot.project.id}`),
    ).toBeInTheDocument();
    expect(prepared.projects.map((project) => project.projectId)).toEqual([
      projectA.snapshot.project.id,
      projectB.snapshot.project.id,
    ]);
  });

  it("keeps inspector as an overlay that reuses the shared divider", () => {
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const canvas = screen.getByTestId("tree-canvas");
    const overlay = screen.getByTestId("inspector-overlay");
    expect(canvas).toContainElement(overlay);
    expect(screen.getByTestId("inspector-resize")).toBeInTheDocument();
    expect(screen.queryByTestId("inspector-pane")).toBeNull();
  });
});
