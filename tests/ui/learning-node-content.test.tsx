/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TreeNodeView } from "../../src/application/index.js";
import { LearningNode } from "../../src/ui/tree/LearningNode.js";
import type { LearningFlowNode } from "../../src/ui/tree/to-react-flow.js";
import { LocaleProvider } from "../../src/ui/i18n/index.js";

function baseNode(
  overrides: Partial<TreeNodeView> & Pick<TreeNodeView, "id" | "question">,
): TreeNodeView {
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
    canComplete: false,
    ...overrides,
  };
}

function renderNode(data: TreeNodeView) {
  render(
    <LocaleProvider locale="en-US">
      <LearningNode data={{ ...data } as LearningFlowNode["data"]} />
    </LocaleProvider>,
  );
}

describe("LearningNode content", () => {
  it("shows the goal detail line on the canvas node", () => {
    renderNode(
      baseNode({
        id: "n1",
        question: "What is React?",
        goal: "Understand component rendering",
      }),
    );
    expect(screen.getByTestId("node-goal-n1")).toHaveTextContent(
      "Understand component rendering",
    );
  });

  it("keeps showing the goal on the canvas node even when a summary exists (TASK-006)", () => {
    renderNode(
      baseNode({
        id: "n1b",
        question: "What is React?",
        goal: "Understand component rendering",
        summary: "A UI library for building interfaces",
      }),
    );
    expect(screen.getByTestId("node-goal-n1b")).toHaveTextContent(
      "Understand component rendering",
    );
    expect(screen.queryByTestId("node-context-n1b")).not.toBeInTheDocument();
  });

  it("keeps long goal text in a clamped meta line", () => {
    renderNode(
      baseNode({
        id: "n2",
        question: "Short title",
        goal: "A".repeat(240),
      }),
    );
    const meta = screen.getByTestId("node-goal-n2");
    expect(meta).toHaveClass("node-meta");
    expect(meta.textContent?.length).toBeGreaterThan(100);
  });

  it("shows child progress when direct children exist", () => {
    renderNode(
      baseNode({
        id: "n3",
        question: "Parent question",
        childCount: 2,
        completedChildCount: 1,
        progressPercent: 50,
      }),
    );
    expect(screen.getByTestId("node-progress-n3")).toHaveTextContent(
      "2 sub-questions · 50% completed",
    );
  });

  it("omits child progress on leaf nodes", () => {
    renderNode(
      baseNode({
        id: "n4",
        question: "Leaf question",
      }),
    );
    expect(screen.queryByTestId("node-progress-n4")).not.toBeInTheDocument();
  });
});
