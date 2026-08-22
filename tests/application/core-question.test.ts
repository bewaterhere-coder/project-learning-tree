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
  ensureProjectRoot,
} from "../../src/domain/index.js";
import { isMessageKey } from "../../src/ui/i18n/messages.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

describe("addCoreQuestion application command", () => {
  it("creates a core question under the Project Root through Domain", () => {
    const ports = sequentialFixturePorts();
    const created = createProject({ name: "P" }, ports);
    if (!created.ok) {
      throw new Error("expected project");
    }
    const rooted = ensureProjectRoot(created.snapshot, ports);
    if (!rooted.ok) {
      throw new Error("expected project root");
    }
    const session = createSession(rooted.snapshot);
    const next = dispatchCommand(
      session,
      { type: "addCoreQuestion", question: "How?", goal: "Know" },
      sequentialFixturePorts(8),
    );
    expect(next.lastError).toBeUndefined();
    expect(next.snapshot.pass.rootNodeIds).toHaveLength(1);
    const projectRootId = next.snapshot.pass.projectRootNodeId;
    expect(projectRootId).toBeDefined();
    expect(next.snapshot.nodes[projectRootId!]?.childIds).toHaveLength(1);
    const childId = next.snapshot.nodes[projectRootId!]?.childIds[0];
    expect(next.snapshot.nodes[childId!]?.parentId).toBe(projectRootId);
    expect(isAuthoringCommand("addCoreQuestion")).toBe(true);
  });

  it("preserves snapshot identity on reject and exposes lastErrorCommand", () => {
    const ports = defaultPorts();
    const created = createProject({ name: "P" }, ports);
    if (!created.ok) {
      throw new Error("expected project");
    }
    const rooted = ensureProjectRoot(created.snapshot, ports);
    if (!rooted.ok) {
      throw new Error("expected project root");
    }
    const session = createSession(rooted.snapshot);
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
    const rooted = ensureProjectRoot(created.snapshot, ports);
    if (!rooted.ok) {
      throw new Error("expected project root");
    }
    expect(selectCoreQuestionAuthoring(rooted.snapshot)).toMatchObject({
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
