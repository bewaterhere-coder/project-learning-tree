import { describe, expect, it } from "vitest";
import {
  createSession,
  dispatchCommand,
  isAuthoringCommand,
  presentDomainError,
  selectCoreQuestionAuthoring,
} from "../../src/application/index.js";
import {
  createProject,
  defaultPorts,
} from "../../src/domain/index.js";
import { isMessageKey } from "../../src/ui/i18n/messages.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

describe("addCoreQuestion application command", () => {
  it("creates a top-level core question through Domain", () => {
    const ports = sequentialFixturePorts();
    const created = createProject({ name: "P" }, ports);
    if (!created.ok) {
      throw new Error("expected project");
    }
    const session = createSession(created.snapshot);
    const next = dispatchCommand(
      session,
      { type: "addCoreQuestion", question: "How?", goal: "Know" },
      sequentialFixturePorts(8),
    );
    expect(next.lastError).toBeUndefined();
    expect(next.snapshot.pass.projectRootNodeId).toBeUndefined();
    expect(next.snapshot.pass.rootNodeIds).toHaveLength(1);
    const questionId = next.snapshot.pass.rootNodeIds[0]!;
    expect(next.snapshot.nodes[questionId]?.parentId).toBeUndefined();
    expect(next.snapshot.nodes[questionId]?.question).toBe("How?");
    expect(isAuthoringCommand("addCoreQuestion")).toBe(true);
  });

  it("preserves snapshot identity on reject and exposes lastErrorCommand", () => {
    const ports = defaultPorts();
    const created = createProject({ name: "P" }, ports);
    if (!created.ok) {
      throw new Error("expected project");
    }
    const session = createSession(created.snapshot);
    const next = dispatchCommand(session, {
      type: "addCoreQuestion",
      question: " ",
      goal: "goal",
    });
    expect(next.snapshot).toBe(session.snapshot);
    expect(next.lastError).toEqual({ kind: "QuestionRequired" });
    expect(next.lastErrorCommand).toBe("addCoreQuestion");
  });

  it("reports remaining core-question slots", () => {
    const ports = sequentialFixturePorts();
    const created = createProject({ name: "P" }, ports);
    if (!created.ok) {
      throw new Error("expected project");
    }
    expect(selectCoreQuestionAuthoring(created.snapshot)).toMatchObject({
      canAdd: true,
      remaining: 5,
      atLimit: false,
    });
  });
});

describe("ProjectNameRequired presentation", () => {
  it("maps to an i18n key", () => {
    const presented = presentDomainError({ kind: "ProjectNameRequired" });
    expect(presented.key).toBe("error.ProjectNameRequired");
    expect(isMessageKey(presented.key)).toBe(true);
  });
});
