import { describe, expect, it } from "vitest";
import { createStubProvider, parseChatReply } from "../../src/ai/index.js";
import { selectLearningContext } from "../../src/application/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";

describe("stub provider", () => {
  it("returns a structured ChatReply with proposals for node chat", async () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectLearningContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q1,
    });
    const reply = await createStubProvider().complete({
      identity: { kind: "node", projectId: snapshot.project.id, nodeId: ids.q1 },
      context,
      input: "What is still blocking?",
    });
    expect(reply.answer.length).toBeGreaterThan(0);
    expect(reply.proposals[0]?.type).toBe("question");
    expect(parseChatReply(reply)).toEqual(reply);
  });

  it("returns project chat without node proposals", async () => {
    const { snapshot } = createDemoTreeFixture();
    const context = selectLearningContext(snapshot, {
      kind: "project",
      projectId: snapshot.project.id,
    });
    const reply = await createStubProvider().complete({
      identity: { kind: "project", projectId: snapshot.project.id },
      context,
      input: "How is the project going?",
    });
    expect(reply.proposals).toEqual([]);
    expect(reply.answer).toContain("M2 Demo Tree");
  });

  it("can draft a learning summary rather than a transcript summary", async () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectLearningContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q11,
    });
    const reply = await createStubProvider().complete({
      identity: { kind: "node", projectId: snapshot.project.id, nodeId: ids.q11 },
      context,
      input: "整理当前学习结果",
    });
    expect(reply.proposals[0]?.type).toBe("summary");
    if (reply.proposals[0]?.type === "summary") {
      expect(reply.proposals[0].summary).not.toContain("user:");
    }
  });
});
