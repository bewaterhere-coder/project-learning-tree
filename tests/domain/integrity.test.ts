import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as domain from "../../src/domain/index.js";
import {
  activateNode,
  addCoreQuestion,
  closeNode,
  completePass,
  createProject,
  ensureProjectRoot,
  parkNode,
  resumeNode,
  setNodeSummary,
} from "../../src/domain/index.js";
import {
  activateRoot,
  assertActiveBijection,
  closePrepared,
  coreQuestionIds,
  createProjectWithRoots,
  expectError,
  requireProjectRootId,
  sequentialPorts,
  unwrap,
} from "./helpers.js";

const DOMAIN_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../src/domain");

function domainSourceFiles(): string[] {
  return readdirSync(DOMAIN_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(DOMAIN_DIR, name));
}

describe("general integrity", () => {
  it("23. rejects invalid lifecycle transitions", () => {
    const ports = sequentialPorts();
    const open = createProjectWithRoots(ports, ["Q1"]);
    const rootId = coreQuestionIds(open)[0];
    if (!rootId) {
      throw new Error("missing root");
    }
    expectError(parkNode(open, { nodeId: rootId }), "InvalidLifecycleTransition");
    // Close from open without convergence fails on readiness, not lifecycle gate.
    expectError(closeNode(open, { nodeId: rootId }), "SummaryRequired");
    expectError(resumeNode(open, { nodeId: rootId }), "InvalidLifecycleTransition");

    const active = unwrap(activateNode(open, { nodeId: rootId }));
    expectError(resumeNode(active, { nodeId: rootId }), "InvalidLifecycleTransition");

    const closed = closePrepared(active, rootId, ports);
    expectError(activateNode(closed, { nodeId: rootId }), "InvalidLifecycleTransition");
    expectError(parkNode(closed, { nodeId: rootId }), "InvalidLifecycleTransition");
    expectError(closeNode(closed, { nodeId: rootId }), "InvalidLifecycleTransition");
  });

  it("24. keeps Blocked derived rather than stored as a lifecycle value", () => {
    const ports = sequentialPorts();
    const { snapshot } = activateRoot(createProjectWithRoots(ports, ["Q1"]));
    expect(JSON.stringify(snapshot)).not.toMatch(/"lifecycle":"blocked"/);
    for (const node of Object.values(snapshot.nodes)) {
      expect(node.lifecycle === "open" || node.lifecycle === "active" || node.lifecycle === "closed" || node.lifecycle === "parked").toBe(true);
      expect("blocked" in node).toBe(false);
    }
    assertActiveBijection(snapshot);
  });

  it("25. does not let AI or provider output mutate domain state directly", () => {
    const exported = Object.keys(domain);
    expect(exported).not.toContain("updateNode");
    expect(exported).not.toContain("applyPatch");
    expect(exported).not.toContain("applySuggestion");
    expect(exported).not.toContain("setLifecycle");
    expect(exported).toContain("activateNode");
    expect(exported).toContain("reopenNode");

    const forbidden = [
      "react",
      "@xyflow/react",
      "zustand",
      "dexie",
      "indexeddb",
      "openai",
      "anthropic",
      "octokit",
      "from \"node:http\"",
      "from 'node:http'",
      "from \"node:fs\"",
      "from 'node:fs'",
    ];
    for (const file of domainSourceFiles()) {
      const source = readFileSync(file, "utf8");
      const lowered = source.toLowerCase();
      for (const token of forbidden) {
        expect(lowered, file).not.toContain(token);
      }
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it("rejects completing a pass while roots remain open", () => {
    const ports = sequentialPorts();
    const snapshot = createProjectWithRoots(ports, ["Q1"]);
    expectError(completePass(snapshot), "PassNotCompletable");
  });

  it("completes a pass when every root is closed and the stack is empty", () => {
    const ports = sequentialPorts();
    const { snapshot: active, rootId, projectRootId } = activateRoot(
      createProjectWithRoots(ports, ["Q1"]),
    );
    const closedChild = closePrepared(active, rootId, ports);
    let ready = unwrap(
      setNodeSummary(closedChild, {
        nodeId: projectRootId,
        summary: "Project oriented.",
      }),
    );
    ready = unwrap(closeNode(ready, { nodeId: projectRootId }));
    const completed = unwrap(completePass(ready));
    expect(completed.pass.status).toBe("completed");
    expect(completed.pass.activeStack).toEqual([]);
  });

  it("enforces the five core-question limit", () => {
    const ports = sequentialPorts();
    let snapshot = unwrap(createProject({ name: "Limit" }, ports));
    snapshot = unwrap(ensureProjectRoot(snapshot, ports));
    for (let index = 0; index < 5; index += 1) {
      snapshot = unwrap(
        addCoreQuestion(
          snapshot,
          { question: `Q${index + 1}`, goal: `G${index + 1}` },
          ports,
        ),
      );
    }
    expectError(
      addCoreQuestion(snapshot, { question: "Q6", goal: "G6" }, ports),
      "CoreQuestionLimitReached",
    );
  });

  it("maintains the active bijection after every successful mutation in this suite", () => {
    const ports = sequentialPorts();
    let snapshot = createProjectWithRoots(ports, ["Q1"]);
    assertActiveBijection(snapshot);
    const q1 = coreQuestionIds(snapshot)[0]!;
    snapshot = unwrap(activateNode(snapshot, { nodeId: q1 }));
    assertActiveBijection(snapshot);
    expect(snapshot.pass.activeStack).toEqual([
      requireProjectRootId(snapshot),
      q1,
    ]);
  });
});
