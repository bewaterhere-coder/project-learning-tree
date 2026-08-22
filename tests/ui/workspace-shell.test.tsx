/** @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  applyNodeDragStop,
  createMemoryPreferenceStorage,
  saveWorkspacePreferences,
  setInspectorOpen,
  updateSelectedLayout,
  updateShell,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("project sidebar", () => {
  it("shows completion, active question, and blocked signal for each project", () => {
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    const itemA = screen.getByTestId(
      `project-item-${projectA.snapshot.project.id}`,
    );
    const itemB = screen.getByTestId(
      `project-item-${projectB.snapshot.project.id}`,
    );
    expect(itemA).toHaveTextContent("M2 Demo Tree");
    expect(itemB).toHaveTextContent("M2.1 Demo Tree B");
    expect(
      screen.getByTestId(`project-completion-${projectA.snapshot.project.id}`),
    ).toHaveAttribute("data-completion", String(1 / 5));
    expect(
      screen.getByTestId(`project-active-${projectA.snapshot.project.id}`),
    ).toHaveTextContent("Q1");
    expect(
      screen.getByTestId(`project-blocked-${projectA.snapshot.project.id}`),
    ).toHaveTextContent("1 open sub-questions");
    expect(
      screen.getByTestId(`project-active-${projectB.snapshot.project.id}`),
    ).toHaveTextContent("Alpha");
  });

  it("shows Project B tree after clicking Project B", async () => {
    const user = userEvent.setup();
    const { workspace, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );
    expect(screen.getByTestId(`node-${projectB.ids.alpha}`)).toBeInTheDocument();
    expect(screen.getByTestId(`node-${projectB.ids.alpha1}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
    expect(
      within(screen.getByTestId("tree-nodes")).queryByText("Q1"),
    ).not.toBeInTheDocument();
  });

  it("can collapse and restore the sidebar without changing selection", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    await user.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("project-list")).toBeNull();
    await user.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(
      screen.getByTestId(`project-item-${projectA.snapshot.project.id}`),
    ).toHaveAttribute("data-selected", "true");
  });

  it("keeps sidebar width across project switches", async () => {
    const user = userEvent.setup();
    const { workspace, projectB } = createDemoWorkspaceFixture();
    const resized = updateShell(workspace, { projectSidebarWidth: 320 });
    render(
      <App
        initialWorkspace={resized}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.getByTestId("project-sidebar")).toHaveAttribute(
      "data-width",
      "320",
    );
    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );
    expect(screen.getByTestId("project-sidebar")).toHaveAttribute(
      "data-width",
      "320",
    );
  });
});

describe("inspector column", () => {
  it("renders as a layout sibling of the tree canvas, not an overlay", () => {
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const canvas = screen.getByTestId("tree-canvas");
    const pane = screen.getByTestId("inspector-pane");
    expect(canvas).not.toContainElement(pane);
    expect(canvas.parentElement).toContainElement(pane);
    expect(screen.queryByTestId("inspector-overlay")).toBeNull();
  });

  it("can close without changing Current Focus and reopen on the same focus", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    await user.click(screen.getByTestId("inspector-close"));
    expect(screen.queryByTestId("node-inspector")).toBeNull();
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-focus",
      "true",
    );

    await user.click(screen.getByTestId("inspector-open"));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
  });

  it("opens on node click and restores width per project", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const prepared = updateSelectedLayout(
      setInspectorOpen(workspace, false),
      { inspectorWidth: 360 },
    );
    render(
      <App
        initialWorkspace={prepared}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.queryByTestId("node-inspector")).toBeNull();
    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId("inspector-pane")).toHaveAttribute(
      "data-width",
      "360",
    );

    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );
    expect(screen.getByTestId("inspector-pane")).toHaveAttribute(
      "data-width",
      "400",
    );
  });
});

describe("workspace layout restore", () => {
  it("restores node positions and viewport after switching projects", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const positioned = applyNodeDragStop(
      updateSelectedLayout(workspace, {
        viewport: { x: 10, y: 20, zoom: 1.2 },
      }),
      { [projectA.ids.q2]: { x: 77, y: 88 } },
    );
    render(
      <App
        initialWorkspace={positioned}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-x",
      "77",
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-y",
      "88",
    );
    expect(screen.getByTestId("tree-nodes")).toHaveAttribute(
      "data-viewport-zoom",
      "1.2",
    );

    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );
    await user.click(
      screen.getByTestId(`project-item-${projectA.snapshot.project.id}`),
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-x",
      "77",
    );
    expect(screen.getByTestId("tree-nodes")).toHaveAttribute(
      "data-viewport-zoom",
      "1.2",
    );
  });

  it("keeps locale across project switches", async () => {
    const user = userEvent.setup();
    const { workspace, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("locale-zh"));
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("项目");
    await user.click(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    );
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("项目");
    await user.click(screen.getByTestId("settings-open"));
    expect(screen.getByTestId("locale-zh")).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});

describe("node dragging", () => {
  it("lets a LearningNode drag and keeps parent/child plus connectable false", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    const canvas = screen.getByTestId("tree-nodes");
    expect(canvas).toHaveAttribute("data-nodes-draggable", "true");
    expect(canvas).toHaveAttribute("data-nodes-connectable", "false");
    expect(canvas).toHaveAttribute("data-edges-reconnectable", "false");
    expect(canvas).toHaveAttribute("data-delete-key", "none");
    const beforeX = screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute(
      "data-x",
    );
    await user.click(screen.getByTestId(`node-drag-${projectA.ids.q2}`));
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).not.toHaveAttribute(
      "data-x",
      beforeX,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q11}`)).toHaveAttribute(
      "data-parent",
      projectA.ids.q1,
    );
  });

  it("restores a dragged position after reloading workspace preferences", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    const moved = applyNodeDragStop(workspace, {
      [projectA.ids.q2]: { x: 210, y: 310 },
    });
    saveWorkspacePreferences(storage, moved);

    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-x",
      "210",
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-y",
      "310",
    );
  });
});

describe("i18n catalogs", () => {
  it("covers Project Sidebar and Inspector chrome in en-US and zh-CN", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("Projects");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Learn Tree");
    expect(
      within(screen.getByTestId("node-inspector")).getByRole("heading", {
        level: 2,
      }),
    ).toHaveTextContent("Question details");
    expect(screen.getByTestId("inspector-dod-heading")).toHaveTextContent(
      "Completion criteria",
    );
    expect(screen.getByTestId("inspector-summary-heading")).toHaveTextContent(
      "Reflection",
    );
    expect(screen.queryByTestId("action-activate")).toBeNull();
    expect(screen.queryByTestId("inspector-lifecycle")).toBeNull();
    expect(screen.getByTestId(`node-complete-${projectA.ids.q2}`)).toHaveTextContent(
      "Mark complete",
    );

    await user.click(screen.getByTestId(`node-${projectA.ids.q1}`));
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q1");
    expect(screen.getByTestId(`node-add-child-${projectA.ids.q1}`)).toBeInTheDocument();

    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("locale-zh"));
    expect(screen.getByTestId("sidebar-title")).toHaveTextContent("项目");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("知识树");
    expect(
      within(screen.getByTestId("node-inspector")).getByRole("heading", {
        level: 2,
      }),
    ).toHaveTextContent("问题详情");
    expect(screen.getByTestId("inspector-dod-heading")).toHaveTextContent("达成条件");
    expect(screen.getByTestId("inspector-summary-heading")).toHaveTextContent("心得");
    expect(screen.getByTestId(`node-complete-${projectA.ids.q1}`)).toHaveTextContent(
      "已完成",
    );
    expect(document.documentElement.lang).toBe("zh-CN");

    const inspector = screen.getByTestId("node-inspector").textContent ?? "";
    const chrome = document.body.textContent ?? "";
    for (const forbidden of [
      "Open",
      "Active",
      "Parked",
      "Closed",
      "Blocked",
      "Dismiss",
      "Cannot close",
      "without a summary",
      "unsatisfied",
      "satisfied",
      "Start learning",
      "开始学习",
      "学习中",
    ]) {
      expect(chrome).not.toContain(forbidden);
    }
    expect(inspector).not.toMatch(/\bopen\b/i);
    expect(inspector).not.toMatch(/\bactive\b/i);
    expect(inspector).not.toMatch(/\bclosed\b/i);
    expect(inspector).not.toMatch(/\bparked\b/i);
  });
});
