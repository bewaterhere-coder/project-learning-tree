/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TreeNodeView } from "../../src/application/index.js";
import { LearningNode } from "../../src/ui/tree/LearningNode.js";
import type { LearningFlowNode } from "../../src/ui/tree/to-react-flow.js";

function baseNode(overrides: Partial<TreeNodeView> & Pick<TreeNodeView, "id" | "question">): TreeNodeView {
  return {
    goal: "",
    lifecycle: "open",
    isBlocked: false,
    unresolvedBlockerCount: 0,
    isOnActiveStack: false,
    isActiveStackLeaf: false,
    isCurrentFocus: false,
    childCount: 0,
    completedChildCount: 0,
    isCompleted: false,
    canCreateChild: true,
    ...overrides,
  };
}

function renderNode(data: TreeNodeView) {
  render(
    <LearningNode
      locale="en-US"
      data={{ ...data } as LearningFlowNode["data"]}
    />,
  );
}

describe("LearningNode content", () => {
  it("shows summary context on the canvas node when present", () => {
    renderNode(
      baseNode({
        id: "n1",
        question: "What is React?",
        summary: "A UI library for building interfaces",
      }),
    );
    expect(screen.getByTestId("node-context-n1")).toHaveTextContent(
      "A UI library for building interfaces",
    );
    expect(screen.queryByTestId("node-goal-n1")).not.toBeInTheDocument();
  });

  it("shows child progress when direct children exist", () => {
    renderNode(
      baseNode({
        id: "n2",
        question: "Parent question",
        childCount: 2,
        completedChildCount: 1,
        progressPercent: 50,
      }),
    );
    expect(screen.getByTestId("node-progress-n2")).toHaveTextContent(
      "2 sub-questions · 50% completed",
    );
  });

  it("omits child progress on leaf nodes", () => {
    renderNode(
      baseNode({
        id: "n3",
        question: "Leaf question",
      }),
    );
    expect(screen.queryByTestId("node-progress-n3")).not.toBeInTheDocument();
  });
});
