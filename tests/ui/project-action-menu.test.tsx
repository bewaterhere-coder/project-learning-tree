/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  archiveProject,
  createMemoryPreferenceStorage,
  updateShell,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function mockRect(
  element: Element,
  rect: { top: number; left: number; width: number; height: number },
) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: rect.left,
    y: rect.top,
    top: rect.top,
    left: rect.left,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    toJSON: () => ({}),
  } as DOMRect);
}

function distance(
  a: { top: number; left: number; right: number; bottom: number },
  b: { top: number; left: number; right: number; bottom: number },
) {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  return Math.hypot(dx, dy);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("project action menus", () => {
  it("anchors Archive to Project A when Project B is selected", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );

    const triggerA = screen.getByTestId(
      `project-actions-${projectA.snapshot.project.id}`,
    );
    const triggerB = screen.getByTestId(
      `project-actions-${projectB.snapshot.project.id}`,
    );
    mockRect(triggerA, { top: 80, left: 220, width: 28, height: 24 });
    mockRect(triggerB, { top: 220, left: 220, width: 28, height: 24 });

    await user.click(triggerA);
    const menu = screen.getByTestId(`project-menu-${projectA.snapshot.project.id}`);
    expect(menu).toHaveAttribute("data-anchor-id", projectA.snapshot.project.id);
    expect(menu).toHaveTextContent("Archive");
    expect(
      screen.queryByTestId(`project-menu-${projectB.snapshot.project.id}`),
    ).not.toBeInTheDocument();

    const menuRect = {
      top: Number.parseFloat(menu.style.top),
      left: Number.parseFloat(menu.style.left),
      right: Number.parseFloat(menu.style.left) + menu.getBoundingClientRect().width,
      bottom: Number.parseFloat(menu.style.top) + 40,
    };
    const aRect = triggerA.getBoundingClientRect();
    const bRect = triggerB.getBoundingClientRect();
    expect(distance(menuRect, aRect)).toBeLessThan(distance(menuRect, bRect));
    expect(menuRect.top).toBe(108);
  });

  it("anchors Restore to the archived row that opened it", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const archived = updateShell(
      archiveProject(workspace, projectA.snapshot.project.id),
      { archivedPaneOpen: true },
    );
    render(
      <App
        initialWorkspace={archived}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const trigger = screen.getByTestId(
      `archived-actions-${projectA.snapshot.project.id}`,
    );
    mockRect(trigger, { top: 360, left: 220, width: 28, height: 24 });
    await user.click(trigger);
    const menu = screen.getByTestId(`archived-menu-${projectA.snapshot.project.id}`);
    expect(menu).toHaveAttribute("data-anchor-id", projectA.snapshot.project.id);
    expect(menu).toHaveTextContent("Restore");
    expect(Number.parseFloat(menu.style.top)).toBe(388);
  });

  it("flips above the trigger when the viewport would clip it and stays attached", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const trigger = screen.getByTestId(
      `project-actions-${projectA.snapshot.project.id}`,
    );
    mockRect(trigger, { top: 700, left: 220, width: 28, height: 24 });
    await user.click(trigger);
    const menu = screen.getByTestId(`project-menu-${projectA.snapshot.project.id}`);
    expect(menu).toHaveAttribute("data-placement", "above");
    expect(Number.parseFloat(menu.style.top)).toBe(656);
  });

  it("closes on outside click and moves when another trigger is opened", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(
      screen.getByTestId(`project-actions-${projectA.snapshot.project.id}`),
    );
    expect(
      screen.getByTestId(`project-menu-${projectA.snapshot.project.id}`),
    ).toBeInTheDocument();
    fireEvent.scroll(screen.getByTestId("project-list"));
    expect(
      screen.queryByTestId(`project-menu-${projectA.snapshot.project.id}`),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByTestId(`project-actions-${projectA.snapshot.project.id}`),
    );
    await user.click(
      screen.getByTestId(`project-actions-${projectB.snapshot.project.id}`),
    );
    expect(
      screen.queryByTestId(`project-menu-${projectA.snapshot.project.id}`),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`project-menu-${projectB.snapshot.project.id}`),
    ).toHaveAttribute("data-anchor-id", projectB.snapshot.project.id);
  });
});
