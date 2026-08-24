import { describe, expect, it, vi } from "vitest";
import {
  createLlmTraceApiClient,
  resolveLlmTraceApiUrl,
} from "../../../src/infrastructure/index.js";

describe("llm trace api client", () => {
  it("resolves viewer URL from chat API URL", () => {
    expect(resolveLlmTraceApiUrl(undefined)).toBeUndefined();
    expect(resolveLlmTraceApiUrl("/api/chat")).toBe("/api/llm-traces");
    expect(resolveLlmTraceApiUrl("http://127.0.0.1:8787/api/chat")).toBe(
      "http://127.0.0.1:8787/api/llm-traces",
    );
  });

  it("lists and loads traces from HTTP responses", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/llm-traces?limit=10" && init?.method === "GET") {
        return new Response(
          JSON.stringify({
            total: 1,
            traces: [
              {
                id: "t1",
                createdAt: "2026-08-24T00:00:00.000Z",
                durationMs: 12,
                provider: "mock",
                status: "ok",
                inputPreview: "hello",
                projectId: "p1",
                suggestionCount: 0,
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url === "/api/llm-traces/t1") {
        return new Response(
          JSON.stringify({
            id: "t1",
            createdAt: "2026-08-24T00:00:00.000Z",
            completedAt: "2026-08-24T00:00:00.012Z",
            durationMs: 12,
            provider: "mock",
            input: "hello",
            request: {
              hasNode: false,
              hasParent: false,
              historyCount: 0,
              projectId: "p1",
            },
            response: { answer: "world", suggestionCount: 0 },
            status: "ok",
          }),
          { status: 200 },
        );
      }
      if (url === "/api/llm-traces" && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });

    const client = createLlmTraceApiClient({ apiUrl: "/api/llm-traces", fetchImpl });
    await expect(client.listTraces({ limit: 10 })).resolves.toMatchObject({
      total: 1,
      traces: [{ id: "t1", inputPreview: "hello" }],
    });
    await expect(client.getTrace("t1")).resolves.toMatchObject({
      id: "t1",
      response: { answer: "world" },
    });
    await expect(client.clearTraces()).resolves.toBeUndefined();
  });

  it("surfaces API error messages", async () => {
    const client = createLlmTraceApiClient({
      apiUrl: "/api/llm-traces",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "Trace not found" }), { status: 404 }),
    });
    await expect(client.getTrace("missing")).rejects.toThrow("Trace not found");
  });
});
