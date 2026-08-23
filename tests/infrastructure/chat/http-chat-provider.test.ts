import { describe, expect, it } from "vitest";
import { createHttpChatProvider, toNodeChatContext } from "../../../src/infrastructure/index.js";
import { selectLearningContext } from "../../../src/application/index.js";
import { createDemoTreeFixture } from "../../../src/fixtures/demo-tree.js";

describe("http chat provider", () => {
  it("posts minimal node context to the chat API", async () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const learningContext = selectLearningContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q11,
    });
    let capturedBody = "";
    const provider = createHttpChatProvider({
      apiUrl: "/api/chat",
      fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            answer: "Stay with the current node.",
            suggestions: ["Re-read the parent question"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const reply = await provider.complete({
      identity: { kind: "node", projectId: snapshot.project.id, nodeId: ids.q11 },
      context: learningContext,
      input: "What should I do?",
      locale: "en-US",
    });

    expect(reply.answer).toBe("Stay with the current node.");
    expect(reply.suggestions).toEqual(["Re-read the parent question"]);
    expect(reply.proposals).toEqual([]);
    const payload = JSON.parse(capturedBody) as {
      context: ReturnType<typeof toNodeChatContext>;
      input: string;
    };
    expect(payload.context.node?.question).toBe("Q1.1");
    expect(payload.context.parentNode?.question).toBe("Q1");
    expect(payload.context.node && "definitionOfDone" in payload.context.node).toBe(false);
  });
});
