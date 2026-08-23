import { request as httpRequest } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createChatApiServer } from "../../server/chat-api.js";
import { createDemoTreeFixture } from "../../src/fixtures/demo-tree.js";
import { selectNodeChatContext } from "../../src/application/index.js";

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
    server = createChatApiServer({
      port: 0,
      apiKey: "test-key",
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
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
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
    req.write(body);
    req.end();
  });
}
