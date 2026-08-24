import { describe, expect, it } from "vitest";
import {
  CONVERSATION_STORE_KEY,
  createMemoryConversationStore,
  emptyConversation,
} from "../../../src/conversation/index.js";
import {
  createMemoryLlmTraceStore,
  LLM_TRACE_MAX_ENTRIES,
  LLM_TRACE_STORE_KEY,
  parseLlmTraceRegistry,
  type LLMInteractionTrace,
} from "../../../src/ai/index.js";
import {
  createMemoryPreferenceStorage,
  WORKSPACE_PREFERENCES_KEY,
  WORKSPACE_SEMANTIC_KEY,
} from "../../../src/workspace/index.js";

describe("llm interaction trace persistence", () => {
  it("saves traces under plt.llm_trace.v1 only", async () => {
    const storage = createMemoryPreferenceStorage();
    const store = createMemoryLlmTraceStore({}, storage);
    await store.append(sampleTrace("t1"));

    expect(storage.getItem(LLM_TRACE_STORE_KEY)).toContain('"provider":"mock"');
    expect(storage.getItem(LLM_TRACE_STORE_KEY)).toContain("hello");
    expect(storage.getItem(WORKSPACE_PREFERENCES_KEY)).toBeNull();
    expect(storage.getItem(WORKSPACE_SEMANTIC_KEY)).toBeNull();
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toBeNull();
  });

  it("does not mix conversation messages into the llm trace store", async () => {
    const storage = createMemoryPreferenceStorage();
    const traces = createMemoryLlmTraceStore({}, storage);
    const conversations = createMemoryConversationStore({}, storage);

    await conversations.save({
      ...emptyConversation({ kind: "node", projectId: "p", nodeId: "n1" }),
      messages: [
        {
          id: "m1",
          role: "user",
          content: "conversation-only",
          createdAt: "2026-08-24T00:00:00.000Z",
        },
      ],
    });
    await traces.append(sampleTrace("t-isolated"));

    const registry = await traces.load();
    expect(registry.traces).toHaveLength(1);
    expect(JSON.stringify(registry)).not.toContain("conversation-only");
    expect(storage.getItem(CONVERSATION_STORE_KEY)).toContain("conversation-only");
    expect(storage.getItem(LLM_TRACE_STORE_KEY)).not.toContain("conversation-only");
  });

  it("rejects conversation and domain keys in the llm trace store", () => {
    expect(
      parseLlmTraceRegistry({
        version: 1,
        traces: [],
        conversations: {},
      }),
    ).toBeUndefined();
    expect(
      parseLlmTraceRegistry({
        version: 1,
        traces: [],
        snapshot: {},
      }),
    ).toBeUndefined();
    expect(
      parseLlmTraceRegistry({
        version: 1,
        traces: [],
        messages: [],
      }),
    ).toBeUndefined();
  });

  it("trims to LLM_TRACE_MAX_ENTRIES", async () => {
    const store = createMemoryLlmTraceStore();
    for (let i = 0; i < LLM_TRACE_MAX_ENTRIES + 5; i += 1) {
      await store.append(sampleTrace(`t-${i}`, `input-${i}`));
    }
    const registry = await store.load();
    expect(registry.traces).toHaveLength(LLM_TRACE_MAX_ENTRIES);
    expect(registry.traces[0]?.id).toBe("t-5");
    expect(registry.traces.at(-1)?.id).toBe(`t-${LLM_TRACE_MAX_ENTRIES + 4}`);
  });

  it("clear empties the persisted registry", async () => {
    const storage = createMemoryPreferenceStorage();
    const store = createMemoryLlmTraceStore({}, storage);
    await store.append(sampleTrace("t1"));
    await store.clear();
    expect(await store.load()).toEqual({ traces: [] });
    expect(storage.getItem(LLM_TRACE_STORE_KEY)).toBe(
      JSON.stringify({ version: 1, traces: [] }),
    );
  });
});

function sampleTrace(id: string, input = "hello"): LLMInteractionTrace {
  return {
    id,
    createdAt: "2026-08-24T00:00:00.000Z",
    completedAt: "2026-08-24T00:00:00.050Z",
    durationMs: 50,
    provider: "mock",
    model: "mock-model",
    locale: "en-US",
    input,
    request: {
      hasNode: true,
      hasParent: false,
      historyCount: 0,
      projectId: "p1",
      nodeId: "n1",
    },
    response: {
      answer: "ok",
      suggestionCount: 1,
    },
    status: "ok",
  };
}
