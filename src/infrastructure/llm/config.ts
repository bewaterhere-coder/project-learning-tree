export const DEEPSEEK_DEFAULTS = {
  BASE_URL: "https://api.deepseek.com",
  MODEL: "deepseek-reasoner",
} as const;

export interface DeepSeekRuntimeConfig {
  baseUrl: string;
  model: string;
}

export function resolveDeepSeekRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeepSeekRuntimeConfig {
  const baseUrl = env.DEEPSEEK_BASE_URL?.trim();
  const model = env.DEEPSEEK_MODEL?.trim();
  return {
    baseUrl: baseUrl && baseUrl.length > 0 ? baseUrl : DEEPSEEK_DEFAULTS.BASE_URL,
    model: model && model.length > 0 ? model : DEEPSEEK_DEFAULTS.MODEL,
  };
}
