/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import { createRejectingRepositoryEvidenceProvider } from "../fixtures/repository-evidence.js";
import {
  applyNodeDragStop,
  archiveProject,
  createMemoryPreferenceStorage,
  createWorkspace,
  createWorkspaceProject,
  saveSemanticWorkspace,
  setSelectedViewport,
  updateSelectedLayout,
  updateShell,
  WORKSPACE_SEMANTIC_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

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

describe("production workspace UI", () => {
  it("starts empty without demo projects", () => {
    render(<App preferenceStorage={createMemoryPreferenceStorage()} />);
    expect(screen.getByTestId("workspace-empty")).toBeInTheDocument();
    expect(screen.queryByText("M2 Demo Tree")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-create-open")).toBeInTheDocument();
  });

  it("validates an empty GitHub URL locally", async () => {
    const user = userEvent.setup();
    render(<App preferenceStorage={createMemoryPreferenceStorage()} />);
    await user.click(screen.getByTestId("project-create-open"));
    await user.click(screen.getByTestId("project-create-submit"));
    expect(
      screen.getByText("Enter a GitHub repository URL."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("domain-error")).not.toBeInTheDocument();
  });

  it("creates a project from URL only and shows the generated first learning layer", async () => {
    const user = userEvent.setup();
    render(
      <App
        preferenceStorage={createMemoryPreferenceStorage()}
        evidenceProvider={createRejectingRepositoryEvidenceProvider()}
      />,
    );
    await user.click(screen.getByTestId("project-create-open"));
    await user.type(screen.getByTestId("project-source-input"), "openai/agents");
    await user.click(screen.getByTestId("project-create-submit"));
    expect(await screen.findByTestId("bootstrap-summary")).toBeInTheDocument();
    expect(screen.getByTestId("project-list")).toHaveTextContent("agents");
    expect(screen.getByTestId("tree-nodes").querySelectorAll("[data-node-id]").length).toBeGreaterThan(
      0,
    );
    const recommended = screen.getByTestId("bootstrap-recommended").querySelector("button");
    expect(recommended).not.toBeNull();
    await user.click(recommended!);
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(screen.getByTestId("inspector-dod-heading")).toHaveTextContent(
      "Completion criteria",
    );
    expect(screen.getByTestId("inspector-summary-heading")).toBeInTheDocument();
    expect(screen.queryByTestId("action-activate")).toBeNull();
    expect(screen.queryByTestId("inspector-lifecycle")).toBeNull();
    expect(screen.queryByTestId("active-stack")).not.toHaveTextContent(
      recommended!.textContent ?? "---",
    );
    await user.click(screen.getByTestId("add-core-question"));
    await user.type(screen.getByTestId("core-question-input"), "How do agents plan?");
    await user.type(screen.getByTestId("core-goal-input"), "Explain the loop");
    await user.click(screen.getByTestId("core-question-submit"));
    expect(screen.getByText("How do agents plan?")).toBeInTheDocument();
  });

  it("archives and restores a project, including the last active project", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(screen.getByTestId(`project-actions-${projectA.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-archive-${projectA.snapshot.project.id}`));
    expect(
      screen.queryByTestId(`project-item-${projectA.snapshot.project.id}`),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    ).toHaveAttribute("data-selected", "true");
    await user.click(screen.getByTestId("archived-toggle"));
    expect(screen.getByTestId("archived-list")).toHaveTextContent("M2 Demo Tree");
    await user.click(screen.getByTestId(`archived-actions-${projectA.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-restore-${projectA.snapshot.project.id}`));
    expect(
      screen.getByTestId(`project-item-${projectA.snapshot.project.id}`),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId(`project-actions-${projectB.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-archive-${projectB.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-actions-${projectA.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-archive-${projectA.snapshot.project.id}`));
    expect(screen.getByTestId("workspace-empty")).toBeInTheDocument();
  });

  it("deletes an archived project after confirmation and leaves cancel unchanged", async () => {
    const user = userEvent.setup();
    const { workspace, projectA, projectB } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);

    await user.click(screen.getByTestId(`project-actions-${projectA.snapshot.project.id}`));
    expect(
      screen.queryByTestId(`project-delete-${projectA.snapshot.project.id}`),
    ).not.toBeInTheDocument();
    await user.click(screen.getByTestId(`project-archive-${projectA.snapshot.project.id}`));

    await user.click(screen.getByTestId("archived-toggle"));
    await user.click(screen.getByTestId(`archived-actions-${projectA.snapshot.project.id}`));
    expect(
      screen.getByTestId(`project-restore-${projectA.snapshot.project.id}`),
    ).toBeInTheDocument();
    await user.click(screen.getByTestId(`project-delete-${projectA.snapshot.project.id}`));
    expect(screen.getByTestId("delete-confirm-dialog")).toHaveTextContent("M2 Demo Tree");
    await user.click(screen.getByTestId("delete-confirm-cancel"));
    expect(screen.queryByTestId("delete-confirm-dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("archived-list")).toHaveTextContent("M2 Demo Tree");

    await user.click(screen.getByTestId(`archived-actions-${projectA.snapshot.project.id}`));
    await user.click(screen.getByTestId(`project-delete-${projectA.snapshot.project.id}`));
    await user.click(screen.getByTestId("delete-confirm-submit"));
    expect(screen.queryByTestId("archived-list")).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`project-item-${projectB.snapshot.project.id}`),
    ).toBeInTheDocument();
  });

  it("enters Product Empty Workspace after deleting the final archived project", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    let prepared = archiveProject(workspace, projectA.snapshot.project.id);
    prepared = archiveProject(prepared, prepared.projects[1]!.projectId);
    render(
      <App
        initialWorkspace={prepared}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(screen.getByTestId("archived-toggle"));
    const firstId = prepared.projects[0]!.projectId;
    await user.click(screen.getByTestId(`archived-actions-${firstId}`));
    await user.click(screen.getByTestId(`project-delete-${firstId}`));
    await user.click(screen.getByTestId("delete-confirm-submit"));
    const secondId = prepared.projects[1]!.projectId;
    await user.click(screen.getByTestId(`archived-actions-${secondId}`));
    await user.click(screen.getByTestId(`project-delete-${secondId}`));
    await user.click(screen.getByTestId("delete-confirm-submit"));
    expect(screen.getByTestId("workspace-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("archived-toggle")).not.toBeInTheDocument();
  });
});

describe("persistence write channels", () => {
  it("does not write the semantic store for layout, locale, or theme changes", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = trackingStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);
    storage.writes.length = 0;
    await user.click(screen.getByTestId(`node-drag-${projectA.ids.q2}`));
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-dark"));
    await user.click(screen.getByTestId("locale-zh"));
    await user.click(screen.getByTestId("sidebar-toggle"));
    expect(storage.writes.includes(WORKSPACE_SEMANTIC_KEY)).toBe(false);
  });

  it("writes the semantic store when creating a project", async () => {
    const user = userEvent.setup();
    const storage = trackingStorage();
    render(
      <App
        preferenceStorage={storage}
        evidenceProvider={createRejectingRepositoryEvidenceProvider()}
      />,
    );
    storage.writes.length = 0;
    await user.click(screen.getByTestId("project-create-open"));
    await user.type(screen.getByTestId("project-source-input"), "openai/agents");
    await user.click(screen.getByTestId("project-create-submit"));
    expect(await screen.findByTestId("bootstrap-summary")).toBeInTheDocument();
    expect(storage.writes.includes(WORKSPACE_SEMANTIC_KEY)).toBe(true);
  });

  it("rehydrates created and archived projects from the semantic store", async () => {
    const storage = createMemoryPreferenceStorage();
    let workspace = await createWorkspaceProject(
      createWorkspace([]),
      { name: "Kept" },
      sequentialFixturePorts(40),
    );
    workspace = archiveProject(workspace, workspace.projects[0]!.projectId);
    saveSemanticWorkspace(storage, workspace);
    render(<App preferenceStorage={storage} />);
    expect(screen.getByTestId("workspace-empty")).toBeInTheDocument();
    expect(screen.getByTestId("archived-toggle")).toBeInTheDocument();
  });
});

describe("theme controls", () => {
  it("applies light, dark, and system to the document", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("shell")).toHaveAttribute("data-theme", "dark");
    await user.click(screen.getByTestId("theme-light"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByTestId("shell")).toHaveAttribute("data-theme", "light");
    await user.click(screen.getByTestId("theme-system"));
    expect(["light", "dark"]).toContain(document.documentElement.dataset.theme);
  });
});

describe("selected vs active visual hooks", () => {
  it("keeps focus and lifecycle channels distinct", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-lifecycle",
      "open",
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-lifecycle",
      "active",
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-focus",
      "false",
    );
  });
});

describe("unused layout helpers stay preference-only", () => {
  it("exposes the layout mutators used by write-isolation coverage", () => {
    const { workspace, projectA } = createDemoWorkspaceFixture();
    expect(
      applyNodeDragStop(workspace, { [projectA.ids.q1]: { x: 1, y: 2 } }).projects[0]
        ?.snapshot,
    ).toBe(workspace.projects[0]?.snapshot);
    expect(
      setSelectedViewport(workspace, { x: 0, y: 0, zoom: 1 }).projects[0]?.snapshot,
    ).toBe(workspace.projects[0]?.snapshot);
    expect(updateSelectedLayout(workspace, { inspectorOpen: false })).not.toBe(
      undefined,
    );
    expect(updateShell(workspace, { colorScheme: "dark" }).shell.colorScheme).toBe(
      "dark",
    );
  });
});
