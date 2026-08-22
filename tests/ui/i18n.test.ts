import { describe, expect, it } from "vitest";
import { messages } from "../../src/ui/i18n/messages.js";

describe("i18n message catalogs", () => {
  it("covers Project Sidebar and Inspector keys in en-US and zh-CN", () => {
    const required = [
      "sidebar.title",
      "sidebar.collapse",
      "sidebar.expand",
      "sidebar.blocked",
      "sidebar.noActiveQuestion",
      "inspector.title",
      "inspector.close",
      "inspector.open",
      "inspector.noFocus",
      "inspector.question",
      "actions.startLearning",
      "actions.enterQuestion",
    ] as const;

    for (const key of required) {
      expect(messages["en-US"][key].length).toBeGreaterThan(0);
      expect(messages["zh-CN"][key].length).toBeGreaterThan(0);
      expect(messages["zh-CN"][key]).not.toBe(messages["en-US"][key]);
    }
  });
});
