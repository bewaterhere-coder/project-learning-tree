export {
  createGitHubRepositoryEvidenceProvider,
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  GITHUB_USER_AGENT,
  type GitHubRepositoryEvidenceProviderOptions,
} from "./github/repository-evidence.js";
export { createHttpChatProvider, toNodeChatContext } from "./chat/http-chat-provider.js";
export {
  createDeepSeekProvider,
  DeepSeekProviderError,
  resolveDeepSeekApiKey,
  resolveDeepSeekRuntimeConfig,
  DEEPSEEK_DEFAULTS,
  parseNodeChatAiResponse,
  type LlmProvider,
  type LlmProviderConfig,
  type NodeChatAiResponse,
  type NodeChatRequest,
} from "./llm/index.js";
