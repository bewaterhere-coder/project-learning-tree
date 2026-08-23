import { describe, expect, it } from "vitest";
import { parseNodeChatAiResponse } from "../../../src/infrastructure/index.js";

describe("parseNodeChatAiResponse", () => {
  it("parses answer and structured question suggestions", () => {
    expect(
      parseNodeChatAiResponse({
        answer: "Focus on the parent goal first.",
        suggestions: [
          { type: "question", content: "Review the parent question" },
          { type: "question", content: "Write a short summary" },
        ],
      }),
    ).toEqual({
      answer: "Focus on the parent goal first.",
      suggestions: [
        { type: "question", content: "Review the parent question" },
        { type: "question", content: "Write a short summary" },
      ],
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseNodeChatAiResponse({ answer: "ok" })).toBeUndefined();
    expect(parseNodeChatAiResponse({ answer: "ok", suggestions: [] })).toEqual({
      answer: "ok",
      suggestions: [],
    });
    expect(
      parseNodeChatAiResponse({
        answer: "ok",
        suggestions: [{ type: "question", content: "" }],
      }),
    ).toBeUndefined();
    expect(
      parseNodeChatAiResponse({
        answer: "ok",
        suggestions: ["legacy string"],
      }),
    ).toBeUndefined();
  });
});
