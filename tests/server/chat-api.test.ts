import { request as httpRequest } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createChatApiServer } from "../../server/chat-api.js";
import { createMemoryLlmTraceStore } from "../../src/ai/index.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";
import { selectNodeChatContext } from "../../src/application/index.js";
import {
  createMockLlmProvider,
  MOCK_LLM_PROVIDER_ID,
} from "../../src/infrastructure/index.js";

describe("chat api server", () => {
  let server: ReturnType<typeof createChatApiServer> | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
        return;
      }
      resolve();
    });
    server = undefined;
  });

  it("returns 503 when DeepSeek is not configured", async () => {
    server = createChatApiServer({ port: 0, apiKey: undefined });
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = serverPort(server);

    const response = await postJson(port, {
      context: { project: { id: "p1", name: "Demo" } },
      input: "hi",
    });

    expect(response.status).toBe(503);
  });

  it("returns structured chat replies from the configured provider", async () => {
    const traceStore = createMemoryLlmTraceStore();
    server = createChatApiServer({
      port: 0,
      apiKey: "test-key",
      traceStore,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: "Try clarifying the parent question.",
                    suggestions: [{ type: "question", content: "Restate the goal" }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = serverPort(server);

    const { snapshot, ids } = createDemoTreeFixture();
    const context = selectNodeChatContext(snapshot, {
      kind: "node",
      projectId: snapshot.project.id,
      nodeId: ids.q1,
    });
    const response = await postJson(port, { context, input: "help", locale: "en-US" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      answer: "Try clarifying the parent question.",
      suggestions: [{ type: "question", content: "Restate the goal" }],
    });

    const traces = await traceStore.load();
    expect(traces.traces).toHaveLength(1);
    expect(traces.traces[0]).toMatchObject({
      provider: "deepseek",
      status: "ok",
      input: "help",
    });
  });

  it("traces mock provider calls when injected", async () => {
    const traceStore = createMemoryLlmTraceStore();
    server = createChatApiServer({
      port: 0,
      provider: createMockLlmProvider({
        reply: {
          answer: "mock via api",
          suggestions: [],
        },
      }),
      providerName: MOCK_LLM_PROVIDER_ID,
      model: "mock-model",
      traceStore,
    });
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = serverPort(server);

    const response = await postJson(port, {
      context: { project: { id: "p1", name: "Demo" } },
      input: "ping",
      locale: "en-US",
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ answer: "mock via api", suggestions: [] });

    const traces = await traceStore.load();
    expect(traces.traces).toHaveLength(1);
    expect(traces.traces[0]).toMatchObject({
      provider: "mock",
      model: "mock-model",
      status: "ok",
      input: "ping",
    });
  });

  it("lists and details traces recorded by chat, then clears them", async () => {
    const traceStore = createMemoryLlmTraceStore();
    server = createChatApiServer({
      port: 0,
      provider: createMockLlmProvider({
        reply: { answer: "listed", suggestions: [{ type: "question", content: "next?" }] },
      }),
      providerName: MOCK_LLM_PROVIDER_ID,
      model: "mock-model",
      traceStore,
    });
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = serverPort(server);

    await postJson(port, {
      context: { project: { id: "p1", name: "Demo" } },
      input: "inspect me",
      locale: "en-US",
    });

    const list = await requestJson(port, "GET", "/api/llm-traces");
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({
      total: 1,
      traces: [
        {
          status: "ok",
          provider: "mock",
          model: "mock-model",
          inputPreview: "inspect me",
          projectId: "p1",
          suggestionCount: 1,
        },
      ],
    });
    const id = (list.body as { traces: Array<{ id: string }> }).traces[0]?.id;
    expect(id).toBeTruthy();

    const detail = await requestJson(port, "GET", `/api/llm-traces/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id,
      input: "inspect me",
      response: { answer: "listed", suggestionCount: 1 },
    });

    const missing = await requestJson(port, "GET", "/api/llm-traces/missing-id");
    expect(missing.status).toBe(404);

    const cleared = await requestJson(port, "DELETE", "/api/llm-traces");
    expect(cleared.status).toBe(204);
    const after = await requestJson(port, "GET", "/api/llm-traces");
    expect(after.body).toEqual({ traces: [], total: 0 });
  });

  it("filters llm traces by status=error", async () => {
    const traceStore = createMemoryLlmTraceStore();
    server = createChatApiServer({
      port: 0,
      provider: createMockLlmProvider({
        error: new Error("forced failure"),
      }),
      providerName: MOCK_LLM_PROVIDER_ID,
      traceStore,
    });
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const port = serverPort(server);

    const chat = await postJson(port, {
      context: { project: { id: "p1", name: "Demo" } },
      input: "fail please",
    });
    expect(chat.status).toBe(502);

    const badQuery = await requestJson(port, "GET", "/api/llm-traces?status=nope");
    expect(badQuery.status).toBe(400);

    const list = await requestJson(port, "GET", "/api/llm-traces?status=error");
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({
      total: 1,
      traces: [{ status: "error", errorMessage: "forced failure", inputPreview: "fail please" }],
    });
  });
});

function serverPort(server: ReturnType<typeof createChatApiServer> | undefined): number {
  const address = server?.address();
  return typeof address === "object" && address ? address.port : 0;
}

function postJson(
  port: number,
  payload: unknown,
): Promise<{ status: number; body: unknown }> {
  return requestJson(port, "POST", "/api/chat", payload);
}

function requestJson(
  port: number,
  method: string,
  path: string,
  payload?: unknown,
): Promise<{ status: number; body: unknown }> {
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: body
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body),
            }
          : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode ?? 500,
            body: raw === "" ? {} : JSON.parse(raw),
          });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}
