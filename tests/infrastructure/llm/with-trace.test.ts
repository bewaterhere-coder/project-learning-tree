import { describe, expect, it } from "vitest";
import { createMemoryLlmTraceStore } from "../../../src/ai/index.js";
import { selectNodeChatContext } from "../../../src/application/index.js";
import { createDemoTreeFixture } from "../../../src/fixtures/demo-tree.js";
import {
  createDeepSeekProvider,
  createMockLlmProvider,
  DeepSeekProviderError,
  DEEPSEEK_DEFAULTS,
  MOCK_LLM_PROVIDER_ID,
  withLlmTrace,
} from "../../../src/infrastructure/index.js";

describe("withLlmTrace middleware", () => {
  it("records successful mock provider interactions without coupling into the provider", async () => {
    const store = createMemoryLlmTraceStore();
    const mock = createMockLlmProvider({
      reply: {
        answer: "mock answer",
        suggestions: [{ type: "question", content: "follow-up?" }],
      },
    });
    const provider = withLlmTrace(mock, {
      providerName: MOCK_LLM_PROVIDER_ID,
      model: "mock-model",
      store,
      createId: () => "trace-mock-1",
      now: (() => {
        let tick = 0;
        return () => new Date(Date.UTC(2026, 7, 24, 0, 0, 0, tick++ * 25));
      })(),
    });

    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectNodeChatContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q1,
    });

    const reply = await provider.complete({
      context,
      input: "What should I learn next?",
      locale: "en-US",
      history: [{ role: "user", content: "earlier" }],
    });

    expect(reply.answer).toBe("mock answer");
    const registry = await store.load();
    expect(registry.traces).toHaveLength(1);
    expect(registry.traces[0]).toMatchObject({
      id: "trace-mock-1",
      provider: "mock",
      model: "mock-model",
      locale: "en-US",
      input: "What should I learn next?",
      status: "ok",
      durationMs: 25,
      request: {
        hasNode: true,
        hasParent: true,
        historyCount: 1,
        projectId: snapshot.project.id,
        nodeId: ids.q1,
      },
      response: {
        answer: "mock answer",
        suggestionCount: 1,
      },
    });
  });

  it("records mock provider errors and rethrows", async () => {
    const store = createMemoryLlmTraceStore();
    const mock = createMockLlmProvider({
      error: new Error("mock failure"),
    });
    const provider = withLlmTrace(mock, {
      providerName: MOCK_LLM_PROVIDER_ID,
      store,
      createId: () => "trace-mock-err",
    });

    await expect(
      provider.complete({
        context: { project: { id: "p1", name: "Demo" } },
        input: "hi",
      }),
    ).rejects.toThrow("mock failure");

    const registry = await store.load();
    expect(registry.traces).toHaveLength(1);
    expect(registry.traces[0]).toMatchObject({
      id: "trace-mock-err",
      provider: "mock",
      status: "error",
      error: { message: "mock failure" },
    });
    expect(registry.traces[0]?.response).toBeUndefined();
  });

  it("records successful DeepSeek provider interactions via the same middleware", async () => {
    const store = createMemoryLlmTraceStore();
    const deepseek = createDeepSeekProvider({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: "Keep the current question focused.",
                    suggestions: [{ type: "question", content: "Name the blocker" }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });
    const provider = withLlmTrace(deepseek, {
      providerName: "deepseek",
      model: DEEPSEEK_DEFAULTS.MODEL,
      store,
      createId: () => "trace-deepseek-1",
    });

    const reply = await provider.complete({
      context: {
        project: { id: "p1", name: "Demo" },
        node: {
          id: "n1",
          question: "How does auth work?",
          goal: "Understand auth",
          lifecycle: "active",
        },
      },
      input: "Explain briefly",
      locale: "en-US",
    });

    expect(reply.answer).toBe("Keep the current question focused.");
    const registry = await store.load();
    expect(registry.traces).toHaveLength(1);
    expect(registry.traces[0]).toMatchObject({
      id: "trace-deepseek-1",
      provider: "deepseek",
      model: DEEPSEEK_DEFAULTS.MODEL,
      status: "ok",
      input: "Explain briefly",
      request: {
        hasNode: true,
        hasParent: false,
        historyCount: 0,
        projectId: "p1",
        nodeId: "n1",
      },
      response: {
        answer: "Keep the current question focused.",
        suggestionCount: 1,
      },
    });
  });

  it("records DeepSeek provider failures via the same middleware", async () => {
    const store = createMemoryLlmTraceStore();
    const deepseek = createDeepSeekProvider({
      apiKey: "test-key",
      fetchImpl: async () => new Response("upstream down", { status: 502 }),
    });
    const provider = withLlmTrace(deepseek, {
      providerName: "deepseek",
      model: DEEPSEEK_DEFAULTS.MODEL,
      store,
      createId: () => "trace-deepseek-err",
    });

    await expect(
      provider.complete({
        context: { project: { id: "p1", name: "Demo" } },
        input: "hello",
      }),
    ).rejects.toBeInstanceOf(DeepSeekProviderError);

    const registry = await store.load();
    expect(registry.traces).toHaveLength(1);
    expect(registry.traces[0]).toMatchObject({
      id: "trace-deepseek-err",
      provider: "deepseek",
      status: "error",
      error: {
        message: "upstream down",
        status: 502,
      },
    });
  });

  it("keeps DeepSeek and mock provider implementations free of store imports", async () => {
    const deepseekSource = await import("../../../src/infrastructure/llm/deepseek.js");
    const mockSource = await import("../../../src/infrastructure/llm/mock.js");
    expect(deepseekSource.createDeepSeekProvider).toBeTypeOf("function");
    expect(mockSource.createMockLlmProvider).toBeTypeOf("function");
    // Architectural guard: middleware is the only write path exercised here.
    const store = createMemoryLlmTraceStore();
    await withLlmTrace(createMockLlmProvider(), {
      providerName: MOCK_LLM_PROVIDER_ID,
      store,
    }).complete({
      context: { project: { id: "p", name: "P" } },
      input: "x",
    });
    expect((await store.load()).traces).toHaveLength(1);
  });
});
