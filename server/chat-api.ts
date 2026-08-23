import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { NodeLifecycle } from "../src/domain/index.js";
import {
  createDeepSeekProvider,
  resolveDeepSeekApiKey,
  type NodeChatHistoryMessage,
  type NodeChatRequest,
} from "../src/infrastructure/llm/index.js";

const DEFAULT_PORT = 8787;

export function createChatApiServer(options: {
  port?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const apiKey = options.apiKey ?? resolveDeepSeekApiKey();
  const provider = apiKey
    ? createDeepSeekProvider({ apiKey, fetchImpl: options.fetchImpl })
    : undefined;

  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      writeJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, {
        ok: true,
        provider: provider ? "deepseek" : "unconfigured",
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/chat") {
      if (!provider) {
        writeJson(response, 503, {
          error: "DeepSeek API key is not configured. Set DEEPSEEK_API_KEY.",
        });
        return;
      }

      try {
        const body = await readJsonBody(request);
        const parsed = parseChatRequest(body);
        if (parsed === undefined) {
          writeJson(response, 400, { error: "Invalid chat request payload." });
          return;
        }
        const reply = await provider.complete(parsed);
        writeJson(response, 200, reply);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected chat API failure.";
        writeJson(response, 502, { error: message });
      }
      return;
    }

    writeJson(response, 404, { error: "Not found" });
  });

  server.listen(options.port ?? DEFAULT_PORT);
  return server;
}

function parseChatRequest(value: unknown): NodeChatRequest | undefined {
  if (!isRecord(value) || typeof value.input !== "string" || !isRecord(value.context)) {
    return undefined;
  }
  const context = value.context;
  if (!isRecord(context.project)) {
    return undefined;
  }
  const project = context.project;
  if (typeof project.id !== "string" || typeof project.name !== "string") {
    return undefined;
  }

  const request: NodeChatRequest = {
    context: {
      project: {
        id: project.id,
        name: project.name,
        source: typeof project.source === "string" ? project.source : undefined,
      },
    },
    input: value.input,
    locale: value.locale === "zh-CN" ? "zh-CN" : "en-US",
  };

  if (isRecord(context.node)) {
    const node = context.node;
    if (
      typeof node.id === "string" &&
      typeof node.question === "string" &&
      typeof node.goal === "string" &&
      typeof node.lifecycle === "string"
    ) {
      request.context.node = {
        id: node.id,
        question: node.question,
        goal: node.goal,
        lifecycle: node.lifecycle as NodeLifecycle,
      };
    }
  }

  if (isRecord(context.parentNode)) {
    const parent = context.parentNode;
    if (typeof parent.id === "string" && typeof parent.question === "string") {
      request.context.parentNode = {
        id: parent.id,
        question: parent.question,
      };
    }
  }

  if (Array.isArray(value.history)) {
    const history: NodeChatHistoryMessage[] = [];
    for (const entry of value.history) {
      if (!isRecord(entry) || typeof entry.content !== "string") {
        continue;
      }
      if (entry.role === "user" || entry.role === "assistant") {
        history.push({ role: entry.role, content: entry.content });
      }
    }
    request.history = history;
  }

  return request;
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw === "" ? {} : JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
