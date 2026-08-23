/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TreeNodeView } from "../../src/application/index.js";
import { LearningNode } from "../../src/ui/tree/LearningNode.js";
import type { LearningFlowNode } from "../../src/ui/tree/to-react-flow.js";
import { LocaleProvider } from "../../src/ui/i18n/index.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function baseNode(
  overrides: Partial<TreeNodeView> & Pick<TreeNodeView, "id" | "question">,
): TreeNodeView {
  return {
    goal: "Goal",
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
    isProjectRoot: false,
    ...overrides,
  };
}

describe("node outer frame removal", () => {
  it("renders question content on a single .learning-node surface", () => {
    render(
      <LocaleProvider locale="en-US">
        <LearningNode
          data={
            {
              ...baseNode({
                id: "n1",
                question: "What is the outer frame?",
                isCurrentFocus: true,
              }),
            } as LearningFlowNode["data"]
          }
        />
      </LocaleProvider>,
    );

    const node = screen.getByText("What is the outer frame?").closest(
      ".learning-node",
    );
    expect(node).not.toBeNull();
    expect(node?.parentElement?.classList.contains("learning-node-shell")).toBe(
      false,
    );
    expect(node?.querySelector(".learning-node")).toBeNull();
    expect(node?.classList.contains("focused")).toBe(true);
  });

  it("keeps focus/selected chrome on one border without outline-offset theater", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/ui/styles.css"),
      "utf8",
    );
    const focusedBlock = css.match(/\.learning-node\.focused\s*\{[^}]+\}/)?.[0];
    expect(focusedBlock).toBeDefined();
    expect(focusedBlock).not.toContain("outline-offset");
    expect(focusedBlock).toContain("outline: none");
    expect(focusedBlock).toContain(
      "border-color: var(--color-learning-selected)",
    );
    expect(focusedBlock).toContain("box-shadow: none");

    expect(css).toContain(".react-flow__node-learningNode.selected");
    expect(css).toMatch(
      /\.react-flow__node-learningNode\.selected[\s\S]*?border:\s*none/,
    );
  });
});
