/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TreeNodeView } from "../../src/application/index.js";
import { LearningNode } from "../../src/ui/tree/LearningNode.js";
import type { LearningFlowNode } from "../../src/ui/tree/to-react-flow.js";
import { LocaleProvider } from "../../src/ui/i18n/index.js";

function renderNode(data: TreeNodeView) {
  render(
    <LocaleProvider locale="en-US">
      <LearningNode data={{ ...data } as LearningFlowNode["data"]} />
    </LocaleProvider>,
  );
}

describe("LearningNode content", () => {
  it("shows the goal detail line on the canvas node", () => {
    renderNode({
      id: "n1",
      question: "What is React?",
      goal: "Understand component rendering",
      lifecycle: "open",
      isBlocked: false,
      unresolvedBlockerCount: 0,
      isOnActiveStack: false,
      isActiveStackLeaf: false,
      isCurrentFocus: false,
      isProjectRoot: false,
    });
    expect(screen.getByTestId("node-goal-n1")).toHaveTextContent(
      "Understand component rendering",
    );
  });

  it("keeps long goal text in a clamped meta line", () => {
    renderNode({
      id: "n2",
      question: "Short title",
      goal: "A".repeat(240),
      lifecycle: "open",
      isBlocked: false,
      unresolvedBlockerCount: 0,
      isOnActiveStack: false,
      isActiveStackLeaf: false,
      isCurrentFocus: false,
      isProjectRoot: false,
    });
    const meta = screen.getByTestId("node-goal-n2");
    expect(meta).toHaveClass("node-meta");
    expect(meta.textContent?.length).toBeGreaterThan(100);
  });
});
