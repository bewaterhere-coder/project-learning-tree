import { resolveDeepSeekRuntimeConfig } from "./config.js";
import { parseNodeChatAiResponse } from "./parse-response.js";
import { buildNodeChatMessages } from "./prompt.js";
import type {
  LlmProvider,
  LlmProviderConfig,
  NodeChatAiResponse,
  NodeChatRequest,
} from "./types.js";

export class DeepSeekProviderError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DeepSeekProviderError";
    this.status = status;
  }
}

export function createDeepSeekProvider(config: LlmProviderConfig): LlmProvider {
  const runtime = resolveDeepSeekRuntimeConfig();
  const baseUrl = config.baseUrl ?? runtime.baseUrl;
  const model = config.model ?? runtime.model;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async complete(request: NodeChatRequest): Promise<NodeChatAiResponse> {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: buildNodeChatMessages(request),
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const detail = await safeReadText(response);
        throw new DeepSeekProviderError(
          detail || `DeepSeek request failed with status ${response.status}`,
          response.status,
        );
      }

      const payload = (await response.json()) as DeepSeekCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new DeepSeekProviderError("DeepSeek returned an empty response");
      }

      const parsed = parseStructuredContent(content);
      if (parsed === undefined) {
        throw new DeepSeekProviderError("DeepSeek returned invalid JSON content");
      }
      return parsed;
    },
  };
}

interface DeepSeekCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function parseStructuredContent(content: string): NodeChatAiResponse | undefined {
  try {
    return parseNodeChatAiResponse(JSON.parse(content));
  } catch {
    return undefined;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}

export function resolveDeepSeekApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const apiKey = env.DEEPSEEK_API_KEY?.trim();
  return apiKey === "" ? undefined : apiKey;
}

export { resolveDeepSeekRuntimeConfig, DEEPSEEK_DEFAULTS } from "./config.js";
