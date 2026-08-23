import { describe, expect, it } from "vitest";
import { selectNodeChatContext } from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";

describe("node chat context", () => {
  it("includes only project, current node, and parent node", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectNodeChatContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q11,
    });

    expect(context.project.name).toBe("M2 Demo Tree");
    expect(context.node?.question).toBe("Q1.1");
    expect(context.parentNode?.question).toBe("Q1");
    expect(Object.keys(context)).toEqual(["project", "node", "parentNode"]);
    expect(context.node && "definitionOfDone" in context.node).toBe(false);
    expect(context.node && "unresolvedBlockingChildren" in context.node).toBe(false);
  });

  it("includes project-only context for project chat", () => {
    const { snapshot } = createDemoTreeFixture();
    const context = selectNodeChatContext(snapshot, {
      kind: "project",
      projectId: snapshot.project.id,
    });

    expect(context.project.id).toBe(snapshot.project.id);
    expect(context.node).toBeUndefined();
    expect(context.parentNode).toBeUndefined();
  });
});
