import { describe, expect, it } from "vitest";
import {
  createDeepSeekProvider,
  DeepSeekProviderError,
} from "../../../src/infrastructure/index.js";
import { createDemoTreeFixture } from "../../../src/fixtures/demo-tree.js";
import { selectNodeChatContext } from "../../../src/application/index.js";

describe("deepseek provider", () => {
  it("calls the chat completions endpoint and parses structured JSON", async () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectNodeChatContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q1,
    });
    let capturedBody = "";
    const provider = createDeepSeekProvider({
      apiKey: "test-key",
      fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: "Keep working from the current question.",
                    suggestions: ["Compare with the parent goal"],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const reply = await provider.complete({
      context,
      input: "What next?",
      locale: "en-US",
    });

    expect(reply).toEqual({
      answer: "Keep working from the current question.",
      suggestions: ["Compare with the parent goal"],
    });
    expect(capturedBody).toContain('"response_format":{"type":"json_object"}');
    expect(capturedBody).toContain("Parent node:");
    expect(capturedBody).not.toContain("unresolvedBlockingChildren");
  });

  it("throws when the API returns a non-OK status", async () => {
    const provider = createDeepSeekProvider({
      apiKey: "test-key",
      fetchImpl: async () => new Response("bad gateway", { status: 502 }),
    });

    await expect(
      provider.complete({
        context: {
          project: { id: "p1", name: "Demo" },
        },
        input: "hello",
      }),
    ).rejects.toBeInstanceOf(DeepSeekProviderError);
  });
});
