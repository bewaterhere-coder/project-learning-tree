/** @vitest-environment jsdom */

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSession, dispatchCommand } from "../../src/application/index.js";
import {
  applySelectedCommand,
  createWorkspace,
} from "../../src/workspace/index.js";
import { App } from "../../src/ui/App.js";
import { ChildAuthoringSection } from "../../src/ui/inspector/ChildAuthoringSection.js";
import {
  createClosableNodeFixture,
  createDemoTreeFixture,
  createMixedChildrenFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

describe("child authoring UI", () => {
  it("shows add-child on the node card and keeps zh-CN copy", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    expect(screen.getByTestId(`node-add-child-${ids.q2}`)).toHaveAttribute(
      "title",
      "Add a sub-question",
    );

    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("locale-zh"));
    expect(screen.getByTestId(`node-add-child-${ids.q2}`)).toHaveAttribute(
      "title",
      "添加子问题",
    );

    await user.click(screen.getByTestId("locale-en"));
    await user.click(screen.getByTestId(`node-${ids.q12}`));
    expect(screen.getByTestId(`node-add-child-${ids.q12}`)).toBeInTheDocument();
  });

  it("validates empty question and goal locally without a global banner", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.q2}`));
    await user.click(screen.getByTestId("authoring-submit"));
    expect(screen.getByTestId("authoring-question-error")).toHaveTextContent(
      "Enter a question.",
    );
    expect(screen.getByTestId("authoring-goal-error")).toHaveTextContent(
      "Enter a goal.",
    );
    expect(screen.queryByTestId("domain-error")).not.toBeInTheDocument();
  });

  it("creates an ordinary child on the tree without changing focus or stack", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createDemoTreeFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.q2}`));
    await user.type(screen.getByTestId("authoring-question"), "How is packaging done?");
    await user.type(screen.getByTestId("authoring-goal"), "Understand packaging");
    await user.click(screen.getByTestId("authoring-submit"));

    expect(screen.getAllByText("How is packaging done?").length).toBeGreaterThan(0);
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Q2");
    expect(screen.getByTestId("active-stack")).toHaveTextContent("Q1");
    expect(screen.getByTestId("active-stack")).not.toHaveTextContent(
      "How is packaging done?",
    );
    expect(screen.getByTestId(`node-${ids.q2}`)).toHaveAttribute(
      "data-blocked",
      "false",
    );
    expect(screen.queryByTestId("node-action-error")).not.toBeInTheDocument();
  });

  it("creates a child from the node card on a non-active parent", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);

    await user.click(screen.getByTestId(`node-add-child-${ids.parent}`));
    await user.type(screen.getByTestId("authoring-question"), "Need this first");
    await user.type(screen.getByTestId("authoring-goal"), "Unblock parent");
    await user.click(screen.getByTestId("authoring-submit"));

    expect(screen.getAllByText("Need this first").length).toBeGreaterThan(0);
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Parent");
  });

  it("hides add-child on a closed node", () => {
    const ports = sequentialFixturePorts(5200);
    const mixed = createMixedChildrenFixture(ports);
    const childActive = dispatchCommand(createSession(mixed.snapshot), {
      type: "activateNode",
      nodeId: mixed.ids.blocking,
    });
    const closableChild = createClosableNodeFixture(
      childActive.snapshot,
      mixed.ids.blocking,
      ports,
    );
    const childClosed = dispatchCommand(createSession(closableChild), {
      type: "closeNode",
      nodeId: mixed.ids.blocking,
    });
    const closableParent = createClosableNodeFixture(
      childClosed.snapshot,
      mixed.ids.parent,
      ports,
    );
    const parentClosed = dispatchCommand(createSession(closableParent), {
      type: "closeNode",
      nodeId: mixed.ids.parent,
    });
    const focused = dispatchCommand(parentClosed, {
      type: "focusNode",
      nodeId: mixed.ids.parent,
    });
    render(<App initialSnapshot={focused.snapshot} />);

    expect(screen.queryByTestId(`node-add-child-${mixed.ids.parent}`)).not.toBeInTheDocument();
  });

  it("keeps drag layout-only and never reparents", async () => {
    const user = userEvent.setup();
    const { snapshot, ids } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);
    expect(screen.getByTestId("tree-nodes")).toHaveAttribute(
      "data-nodes-connectable",
      "false",
    );
    await user.click(screen.getByTestId(`node-drag-${ids.ordinary}`));
    expect(screen.getByTestId(`node-${ids.ordinary}`)).toHaveAttribute(
      "data-parent",
      ids.parent,
    );
    expect(screen.getByTestId("inspector-question")).toHaveTextContent("Parent");
  });

  it("keeps the authoring draft when Domain rejects the command", async () => {
    const user = userEvent.setup();
    const { snapshot } = createDemoTreeFixture();
    function Harness() {
      const [error, setError] = useState<string>();
      return (
        <ChildAuthoringSection
          parentId="missing-parent"
          children={[]}
          availability={{
            canCreateChild: true,
            canCreateBlockingChild: false,
            canChangeBlockingRelationship: false,
          }}
          locale="en-US"
          authoringError={error}
          onCommand={(command) => {
            const next = dispatchCommand(createSession(snapshot), command);
            if (next.lastError) {
              setError("That question could not be found.");
              return false;
            }
            return true;
          }}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByTestId("action-add-sub-question"));
    await user.type(screen.getByTestId("authoring-question"), "Keep this question");
    await user.type(screen.getByTestId("authoring-goal"), "Keep this goal");
    await user.click(screen.getByTestId("authoring-submit"));
    expect(screen.getByTestId("authoring-error")).toBeInTheDocument();
    expect(screen.getByTestId("authoring-question")).toHaveValue("Keep this question");
    expect(screen.getByTestId("authoring-goal")).toHaveValue("Keep this goal");
  });

  it("does not use engineering terms in authoring copy", () => {
    const { snapshot, ids } = createMixedChildrenFixture();
    render(<App initialSnapshot={snapshot} />);
    const body = document.body.textContent ?? "";
    expect(body).not.toContain("Exploratory Child");
    expect(body).not.toContain("Blocking Child");
    expect(body).not.toContain("Ordinary Child");
    expect(body).not.toContain("阻塞子节点");
    expect(body).not.toContain("探索型子问题");
    expect(body).not.toContain("blockingChildIds");
    expect(body).not.toContain("childIds");
    expect(screen.getByTestId(`node-add-child-${ids.parent}`)).toBeInTheDocument();
  });
});
