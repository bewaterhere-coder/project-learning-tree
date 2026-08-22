import { describe, expect, it } from "vitest";
import {
  createSession,
  dispatchCommand,
  isGlobalDomainError,
  selectAuthoringAvailability,
  selectInspectorViewModel,
  validateChildDraft,
} from "../../src/application/index.js";
import {
  createDemoTreeFixture,
  createMixedChildrenFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";

describe("authoring commands", () => {
  it("dispatches createChild through Domain and keeps reject snapshot identity", () => {
    const ports = sequentialFixturePorts(3000);
    const { snapshot, ids } = createMixedChildrenFixture(ports);
    const session = createSession(snapshot);
    const created = dispatchCommand(
      session,
      {
        type: "createChild",
        parentId: ids.parent,
        question: "Another path",
        goal: "Explore more",
      },
      ports,
    );
    expect(created.snapshot).not.toBe(session.snapshot);
    expect(created.snapshot.nodes[ids.parent]?.childIds).toHaveLength(3);
    expect(created.snapshot.nodes[ids.parent]?.blockingChildIds).toEqual([
      ids.blocking,
    ]);
    expect(created.lastError).toBeUndefined();

    const rejected = dispatchCommand(
      created,
      {
        type: "createChild",
        parentId: ids.parent,
        question: "   ",
        goal: "Explore more",
      },
      ports,
    );
    expect(rejected.snapshot).toBe(created.snapshot);
    expect(rejected.lastError?.kind).toBe("QuestionRequired");
    expect(rejected.lastErrorCommand).toBe("createChild");
    expect(isGlobalDomainError(rejected.lastError!, rejected.lastErrorCommand)).toBe(
      false,
    );
  });

  it("dispatches createBlockingChild, mark, and unmark 1:1", () => {
    const ports = sequentialFixturePorts(3100);
    const { snapshot, ids } = createMixedChildrenFixture(ports);
    const session = createSession(snapshot);
    const marked = dispatchCommand(session, {
      type: "markChildBlocking",
      parentId: ids.parent,
      childId: ids.ordinary,
    });
    expect(marked.snapshot.nodes[ids.parent]?.blockingChildIds).toEqual([
      ids.blocking,
      ids.ordinary,
    ]);

    const unmarked = dispatchCommand(marked, {
      type: "unmarkChildBlocking",
      parentId: ids.parent,
      childId: ids.ordinary,
    });
    expect(unmarked.snapshot.nodes[ids.parent]?.blockingChildIds).toEqual([
      ids.blocking,
    ]);

    const blocking = dispatchCommand(
      unmarked,
      {
        type: "createBlockingChild",
        parentId: ids.parent,
        question: "Need this first",
        goal: "Unblock parent",
      },
      ports,
    );
    expect(blocking.snapshot.nodes[ids.parent]?.blockingChildIds).toHaveLength(2);
    expect(blocking.lastError).toBeUndefined();
  });

  it("keeps existing commands working without injected ports", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q2,
    });
    expect(focused.snapshot.pass.currentFocusNodeId).toBe(ids.q2);
    expect(focused.lastError).toBeUndefined();
  });
});

describe("authoring selectors", () => {
  it("exposes availability from parent lifecycle", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    expect(selectAuthoringAvailability(snapshot, ids.q1)).toEqual({
      canCreateChild: true,
      canCreateBlockingChild: true,
      canChangeBlockingRelationship: true,
    });
    expect(selectAuthoringAvailability(snapshot, ids.q2)).toEqual({
      canCreateChild: true,
      canCreateBlockingChild: false,
      canChangeBlockingRelationship: true,
    });
    expect(selectAuthoringAvailability(snapshot, ids.q11)).toEqual({
      canCreateChild: false,
      canCreateBlockingChild: false,
      canChangeBlockingRelationship: false,
    });
    expect(selectAuthoringAvailability(snapshot, ids.q12)).toEqual({
      canCreateChild: true,
      canCreateBlockingChild: false,
      canChangeBlockingRelationship: true,
    });
  });

  it("validates drafts before dispatch", () => {
    expect(validateChildDraft({ question: "", goal: "G" })).toEqual({
      questionError: "empty",
      goalError: undefined,
      ready: false,
    });
    expect(validateChildDraft({ question: "Q", goal: "   " })).toEqual({
      questionError: undefined,
      goalError: "empty",
      ready: false,
    });
    expect(validateChildDraft({ question: "Q", goal: "G" }).ready).toBe(true);
  });

  it("lists inspector children with blocking and unresolved state", () => {
    const { snapshot, ids } = createMixedChildrenFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.parent,
    });
    const inspector = selectInspectorViewModel(focused.snapshot);
    expect(inspector.children).toEqual([
      {
        id: ids.ordinary,
        question: "Ordinary child",
        lifecycle: "open",
        isBlocking: false,
        isUnresolvedBlocker: false,
      },
      {
        id: ids.blocking,
        question: "Blocking child",
        lifecycle: "open",
        isBlocking: true,
        isUnresolvedBlocker: true,
      },
    ]);
    expect(inspector.unresolvedBlockerCount).toBe(1);
  });
});
