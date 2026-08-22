import { describe, expect, it } from "vitest";
import {
  selectBoundConversationIdentity,
  selectFocusDiffersFromChat,
} from "../../src/application/index.js";

describe("chat binding resolution", () => {
  it("follow-focus uses the focused node and otherwise project chat", () => {
    expect(
      selectBoundConversationIdentity("p1", "n1", { mode: "follow-focus" }),
    ).toEqual({ kind: "node", projectId: "p1", nodeId: "n1" });
    expect(
      selectBoundConversationIdentity("p1", undefined, { mode: "follow-focus" }),
    ).toEqual({ kind: "project", projectId: "p1" });
  });

  it("pinned stays on the pinned node even when focus is missing or different", () => {
    expect(
      selectBoundConversationIdentity("p1", "n2", {
        mode: "pinned",
        projectId: "p1",
        nodeId: "n1",
      }),
    ).toEqual({ kind: "node", projectId: "p1", nodeId: "n1" });
    expect(
      selectBoundConversationIdentity("p1", undefined, {
        mode: "pinned",
        projectId: "p1",
        nodeId: "n1",
      }),
    ).toEqual({ kind: "node", projectId: "p1", nodeId: "n1" });
  });

  it("detects when viewing differs from chatting", () => {
    expect(
      selectFocusDiffersFromChat("n2", { kind: "node", projectId: "p1", nodeId: "n1" }),
    ).toBe(true);
    expect(
      selectFocusDiffersFromChat("n1", { kind: "node", projectId: "p1", nodeId: "n1" }),
    ).toBe(false);
  });
});
