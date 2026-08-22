import { describe, expect, it } from "vitest";
import {
  createSession,
  dispatchCommand,
  selectActionAvailability,
  selectInspectorViewModel,
  selectTreeViewModel,
} from "../../src/application/index.js";
import { isBlocked } from "../../src/domain/index.js";
import {
  createBlockedBranchFixture,
  createClosableNodeFixture,
  createDemoTreeFixture,
  createMixedChildrenFixture,
  sequentialFixturePorts,
} from "../../src/fixtures/demo-tree.js";

describe("tree view model", () => {
  it("keeps lifecycle, stack, focus, and blocked on separate channels", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);

    const q1 = model.nodes.find((node) => node.id === ids.q1);
    const q11 = model.nodes.find((node) => node.id === ids.q11);
    const q12 = model.nodes.find((node) => node.id === ids.q12);
    const q2 = model.nodes.find((node) => node.id === ids.q2);
    if (!q1 || !q11 || !q12 || !q2) {
      throw new Error("missing demo nodes");
    }

    expect(q1.lifecycle).toBe("active");
    expect(q1.isBlocked).toBe(true);
    expect(q1.isOnActiveStack).toBe(true);
    expect(q1.isCurrentFocus).toBe(false);

    expect(q11.lifecycle).toBe("closed");
    expect(q11.isOnActiveStack).toBe(false);
    expect(q11.isBlocked).toBe(false);

    expect(q12.lifecycle).toBe("parked");
    expect(q12.isOnActiveStack).toBe(false);

    expect(q2.lifecycle).toBe("open");
    expect(q2.isCurrentFocus).toBe(true);
    expect(q2.isOnActiveStack).toBe(false);

    expect(model.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
      ids.q1,
    ]);
    expect(model.currentFocusNodeId).toBe(ids.q2);
    expect(JSON.stringify(model)).not.toContain('"lifecycle":"blocked"');
    expect(q1.isBlocked).toBe(isBlocked(snapshot, ids.q1));
  });

  it("marks only adjacent Active Stack pairs as stack edges", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const activated = dispatchCommand(createSession(snapshot), {
      type: "activateNode",
      nodeId: ids.childA,
    });
    const model = selectTreeViewModel(activated.snapshot);
    const stackEdge = model.edges.find(
      (edge) => edge.parentId === ids.parent && edge.childId === ids.childA,
    );
    const otherEdge = model.edges.find(
      (edge) => edge.parentId === ids.parent && edge.childId === ids.childB,
    );
    expect(stackEdge?.isOnActiveStack).toBe(true);
    expect(otherEdge?.isOnActiveStack).toBe(false);
  });

  it("marks blocking from parent.blockingChildIds and recedes parked/closed off-stack edges", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    const closedEdge = model.edges.find(
      (edge) => edge.parentId === ids.q1 && edge.childId === ids.q11,
    );
    const parkedEdge = model.edges.find(
      (edge) => edge.parentId === ids.q1 && edge.childId === ids.q12,
    );
    expect(closedEdge?.isBlocking).toBe(true);
    expect(closedEdge?.isReceded).toBe(true);
    expect(closedEdge?.isOnActiveStack).toBe(false);
    expect(parkedEdge?.isBlocking).toBe(true);
    expect(parkedEdge?.isReceded).toBe(true);

    const mixed = createMixedChildrenFixture();
    const mixedModel = selectTreeViewModel(mixed.snapshot);
    const ordinary = mixedModel.edges.find(
      (edge) =>
        edge.parentId === mixed.ids.parent && edge.childId === mixed.ids.ordinary,
    );
    const blocking = mixedModel.edges.find(
      (edge) =>
        edge.parentId === mixed.ids.parent && edge.childId === mixed.ids.blocking,
    );
    expect(ordinary?.isBlocking).toBe(false);
    expect(ordinary?.isReceded).toBe(false);
    expect(blocking?.isBlocking).toBe(true);
    expect(blocking?.isReceded).toBe(false);
  });

  it("keeps Active nodes identical to Active Stack membership", () => {
    const { snapshot } = createDemoTreeFixture();
    const model = selectTreeViewModel(snapshot);
    const activeIds = model.nodes
      .filter((node) => node.lifecycle === "active")
      .map((node) => node.id);
    expect(activeIds).toEqual(model.activeStack);
  });
});

describe("inspector and action copy", () => {
  it("reads inspector fields from the focused domain node", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q11,
    });
    const inspector = selectInspectorViewModel(focused.snapshot);
    expect(inspector.question).toBe("Q1.1");
    expect(inspector.lifecycle).toBe("closed");
    expect(inspector.isBlocked).toBe(false);
    expect(inspector.definitionOfDone).toHaveLength(1);
    expect(inspector.evidence).toHaveLength(1);
    expect(inspector.summary).toContain("Q1.1");
  });

  it("labels project-root activation as startLearning and child activation as enterQuestion", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const projectRootId = snapshot.pass.projectRootNodeId!;
    expect(selectActionAvailability(snapshot, projectRootId).activateLabel).toBe(
      "startLearning",
    );
    expect(selectActionAvailability(snapshot, ids.parent).activateLabel).toBe(
      "enterQuestion",
    );
    expect(selectActionAvailability(snapshot, ids.childA).activateLabel).toBe(
      "enterQuestion",
    );
    expect(selectActionAvailability(snapshot, ids.childA).canActivate).toBe(true);
  });
});

describe("commands", () => {
  it("replaces the session snapshot with the Domain result and does not change focus on activate", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const session = createSession(snapshot);
    const next = dispatchCommand(session, {
      type: "activateNode",
      nodeId: ids.q2,
    });
    expect(next.snapshot).not.toBe(session.snapshot);
    expect(next.snapshot.pass.currentFocusNodeId).toBe(ids.q2);
    expect(next.snapshot.pass.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
      ids.q2,
    ]);
    expect(next.snapshot.nodes[ids.q1]?.lifecycle).toBe("open");
    expect(next.snapshot.nodes[ids.q2]?.lifecycle).toBe("active");
    expect(next.lastError).toBeUndefined();
  });

  it("keeps the previous snapshot identity when a Domain operation fails", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const session = createSession(snapshot);
    const next = dispatchCommand(session, {
      type: "closeNode",
      nodeId: ids.q1,
    });
    expect(next.snapshot).toBe(session.snapshot);
    expect(next.lastError?.kind).toBe("UnresolvedBlockingChildren");
    expect(next.snapshot.nodes[ids.q1]?.lifecycle).toBe("active");
  });

  it("switches sibling branches through activateNode and leaves the old child inactive", () => {
    const { snapshot, ids } = createBlockedBranchFixture();
    const first = dispatchCommand(createSession(snapshot), {
      type: "activateNode",
      nodeId: ids.childA,
    });
    const switched = dispatchCommand(first, {
      type: "activateNode",
      nodeId: ids.childB,
    });
    expect(switched.snapshot.pass.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
      ids.parent,
      ids.childB,
    ]);
    expect(switched.snapshot.nodes[ids.childA]?.lifecycle).toBe("open");
    expect(switched.snapshot.nodes[ids.childB]?.lifecycle).toBe("active");
  });

  it("parks a leaf using the Domain snapshot and leaves focus unchanged", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q1,
    });
    const parked = dispatchCommand(focused, { type: "parkNode", nodeId: ids.q1 });
    expect(parked.snapshot.nodes[ids.q1]?.lifecycle).toBe("parked");
    expect(parked.snapshot.pass.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
    ]);
    expect(parked.snapshot.pass.currentFocusNodeId).toBe(ids.q1);
  });

  it("closes a prepared node through Domain and updates lifecycle and stack", () => {
    const ports = sequentialFixturePorts();
    const { snapshot, ids } = createBlockedBranchFixture(ports);
    const activated = dispatchCommand(createSession(snapshot), {
      type: "activateNode",
      nodeId: ids.childA,
    });
    const closable = createClosableNodeFixture(
      activated.snapshot,
      ids.childA,
      ports,
    );
    const closed = dispatchCommand(createSession(closable), {
      type: "closeNode",
      nodeId: ids.childA,
    });
    expect(closed.snapshot.nodes[ids.childA]?.lifecycle).toBe("closed");
    expect(closed.snapshot.pass.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
      ids.parent,
    ]);
    expect(closed.lastError).toBeUndefined();
  });

  it("resumes a parked node onto the Active Stack without inventing focus", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q12,
    });
    const resumed = dispatchCommand(focused, {
      type: "resumeNode",
      nodeId: ids.q12,
    });
    expect(resumed.snapshot.nodes[ids.q12]?.lifecycle).toBe("active");
    expect(resumed.snapshot.pass.activeStack).toEqual([
      snapshot.pass.projectRootNodeId,
      ids.q1,
      ids.q12,
    ]);
    expect(resumed.snapshot.pass.currentFocusNodeId).toBe(ids.q12);
  });

  it("returnToParent only changes Current Focus", () => {
    const { snapshot, ids } = createDemoTreeFixture();
    const focused = dispatchCommand(createSession(snapshot), {
      type: "focusNode",
      nodeId: ids.q11,
    });
    const stackBefore = [...focused.snapshot.pass.activeStack];
    const returned = dispatchCommand(focused, { type: "returnToParent" });
    expect(returned.snapshot.pass.currentFocusNodeId).toBe(ids.q1);
    expect(returned.snapshot.pass.activeStack).toEqual(stackBefore);
    expect(returned.snapshot.nodes[ids.q11]?.lifecycle).toBe("closed");
  });
});
