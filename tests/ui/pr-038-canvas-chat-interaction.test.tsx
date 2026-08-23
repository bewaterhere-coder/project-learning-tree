/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  WORKSPACE_PREFERENCES_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("PR-038 canvas chat interaction polish", () => {
  it("disables multi-selection keys on the canvas host", () => {
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const host = screen.getByTestId("tree-nodes");
    expect(host).toHaveAttribute("data-multi-selection", "none");
    expect(host).toHaveAttribute("data-selection-key", "none");
  });

  it("dragging one node does not move sibling coordinates", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);

    const peer = screen.getByTestId(`node-${projectA.ids.q1}`);
    const peerX = peer.getAttribute("data-x");
    const peerY = peer.getAttribute("data-y");

    await user.click(screen.getByTestId(`node-drag-${projectA.ids.q2}`));

    await waitFor(() => {
      expect(screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x")).not.toBe(
        null,
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute("data-x", peerX);
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute("data-y", peerY);

    const prefs = storage.getItem(WORKSPACE_PREFERENCES_KEY) ?? "";
    expect(prefs).toContain(projectA.ids.q2);
  });

  it("rejects multi-node position batches so only the focused node moves", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    const peerBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-y"),
    };
    const focusBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-y"),
    };

    await user.click(screen.getByTestId(`node-multi-select-drag-${projectA.ids.q2}`));

    await waitFor(() => {
      expect(screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x")).not.toBe(
        focusBefore.x,
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-x",
      peerBefore.x,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-y",
      peerBefore.y,
    );
  });

  it("ships motion tokens and reduced-motion rules without node position transitions", () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../src/ui/styles.css",
    );
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--motion-slow:");
    expect(css).toContain("--motion-ease:");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/\.learning-node\s*\{[^}]*transition:/s);
    expect(css).not.toMatch(
      /\.learning-node\s*\{[^}]*(?:left|top|transform)\s*:[^;]*transition/s,
    );
  });
});
