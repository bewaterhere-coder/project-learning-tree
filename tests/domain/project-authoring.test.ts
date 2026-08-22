import { describe, expect, it } from "vitest";
import {
  addCoreQuestion,
  CORE_QUESTION_LIMIT,
  createProject,
  defaultPorts,
} from "../../src/domain/index.js";
import { sequentialFixturePorts } from "../../src/fixtures/demo-tree.js";

describe("createProject authoring", () => {
  it("rejects blank and whitespace names", () => {
    expect(createProject({ name: "" }, defaultPorts()).ok).toBe(false);
    expect(createProject({ name: "   " }, defaultPorts())).toEqual({
      ok: false,
      error: { kind: "ProjectNameRequired" },
    });
  });

  it("trims the project name on success", () => {
    const result = createProject({ name: "  Agents  " }, sequentialFixturePorts());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.project.name).toBe("Agents");
      expect(result.snapshot.pass.rootNodeIds).toEqual([]);
    }
  });
});

describe("addCoreQuestion authoring", () => {
  it("rejects blank or whitespace question and goal without mutating the snapshot", () => {
    const created = createProject({ name: "P" }, sequentialFixturePorts());
    if (!created.ok) {
      throw new Error("expected project");
    }
    const snapshot = created.snapshot;
    const ports = sequentialFixturePorts(10);
    expect(addCoreQuestion(snapshot, { question: "   ", goal: "G" }, ports)).toEqual({
      ok: false,
      error: { kind: "QuestionRequired" },
    });
    expect(addCoreQuestion(snapshot, { question: "Q", goal: "  " }, ports)).toEqual({
      ok: false,
      error: { kind: "GoalRequired" },
    });
    expect(snapshot.pass.rootNodeIds).toEqual([]);
  });

  it("trims question and goal and still enforces the core-question limit", () => {
    const created = createProject({ name: "P" }, sequentialFixturePorts());
    if (!created.ok) {
      throw new Error("expected project");
    }
    let snapshot = created.snapshot;
    const ports = sequentialFixturePorts(20);
    for (let index = 0; index < CORE_QUESTION_LIMIT; index += 1) {
      const next = addCoreQuestion(
        snapshot,
        { question: `  Q${index}  `, goal: `  G${index}  ` },
        ports,
      );
      expect(next.ok).toBe(true);
      if (next.ok) {
        snapshot = next.snapshot;
      }
    }
    const lastId = snapshot.pass.rootNodeIds[CORE_QUESTION_LIMIT - 1];
    expect(lastId && snapshot.nodes[lastId]?.question).toBe("Q4");
    const rejected = addCoreQuestion(
      snapshot,
      { question: "too many", goal: "limit" },
      ports,
    );
    expect(rejected).toEqual({
      ok: false,
      error: { kind: "CoreQuestionLimitReached", limit: 5 },
    });
    expect(rejected.ok ? rejected.snapshot : snapshot).toBe(snapshot);
  });
});
