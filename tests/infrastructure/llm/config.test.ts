import { describe, expect, it } from "vitest";
import {
  DEEPSEEK_DEFAULTS,
  resolveDeepSeekRuntimeConfig,
} from "../../../src/infrastructure/index.js";

describe("deepseek runtime config", () => {
  it("defaults to deepseek-reasoner and central base URL", () => {
    expect(DEEPSEEK_DEFAULTS.MODEL).toBe("deepseek-reasoner");
    expect(DEEPSEEK_DEFAULTS.BASE_URL).toBe("https://api.deepseek.com");
    expect(resolveDeepSeekRuntimeConfig({})).toEqual({
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-reasoner",
    });
  });

  it("allows overriding model and base URL from environment", () => {
    expect(
      resolveDeepSeekRuntimeConfig({
        DEEPSEEK_MODEL: "deepseek-chat",
        DEEPSEEK_BASE_URL: "https://example.test",
      }),
    ).toEqual({
      baseUrl: "https://example.test",
      model: "deepseek-chat",
    });
  });
});
