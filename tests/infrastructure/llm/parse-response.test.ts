import { describe, expect, it } from "vitest";
import { parseNodeChatAiResponse } from "../../../src/infrastructure/index.js";

describe("parseNodeChatAiResponse", () => {
  it("parses answer and suggestions", () => {
    expect(
      parseNodeChatAiResponse({
        answer: "Focus on the parent goal first.",
        suggestions: ["Review the parent question", "Write a short summary"],
      }),
    ).toEqual({
      answer: "Focus on the parent goal first.",
      suggestions: ["Review the parent question", "Write a short summary"],
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseNodeChatAiResponse({ answer: "ok" })).toBeUndefined();
    expect(parseNodeChatAiResponse({ suggestions: [] })).toBeUndefined();
  });
});
