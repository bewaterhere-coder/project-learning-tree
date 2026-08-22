import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}

function readAll(dir: string): string {
  return collectSourceFiles(dir)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

describe("import and state boundaries", () => {
  it("keeps Domain free of UI and XYFlow imports", () => {
    const source = readAll(join(ROOT, "src/domain"));
    expect(source.toLowerCase()).not.toContain("react");
    expect(source).not.toContain("@xyflow/react");
  });

  it("keeps Application free of React and XYFlow imports", () => {
    const source = readAll(join(ROOT, "src/application"));
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from \"react-dom\"");
    expect(source).not.toContain("@xyflow/react");
  });

  it("keeps fixtures free of React and XYFlow imports", () => {
    const source = readAll(join(ROOT, "src/fixtures"));
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("@xyflow/react");
  });

  it("keeps Workspace free of React, XYFlow, and browser storage APIs", () => {
    const source = readAll(join(ROOT, "src/workspace"));
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("from \"react-dom\"");
    expect(source).not.toContain("@xyflow/react");
    expect(source).not.toContain("localStorage");
  });

  it("keeps Application free of Workspace imports", () => {
    const source = readAll(join(ROOT, "src/application"));
    expect(source).not.toContain("from \"../workspace");
    expect(source).not.toContain("from \"../../workspace");
  });

  it("does not let UI store domain business state locally", () => {
    const uiFiles = collectSourceFiles(join(ROOT, "src/ui")).filter(
      (file) => !file.endsWith(".css"),
    );
    const source = uiFiles.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/useState\([^)]*lifecycle/);
    expect(source).not.toMatch(/useState\([^)]*activeStack/);
    expect(source).not.toMatch(/useState\([^)]*currentFocusNodeId/);
    expect(source).not.toMatch(/useState\([^)]*blocked/);
    expect(source).not.toMatch(/\.lifecycle\s*=/);
    expect(source).not.toMatch(/activeStack\s*=/);
    expect(source).not.toMatch(/currentFocusNodeId\s*=/);
    expect(source).not.toContain("from \"../domain");
    expect(source).not.toContain("from \"../../domain");
  });

  it("derives XYFlow nodes only from TreeViewModel", () => {
    const adapter = readFileSync(
      join(ROOT, "src/ui/tree/to-react-flow.ts"),
      "utf8",
    );
    expect(adapter).toContain("TreeViewModel");
    expect(adapter).toContain("toReactFlow");
    expect(adapter).not.toContain("activateNode");
    expect(adapter).not.toContain("focusNode");
    expect(adapter).not.toMatch(/nodes\[.*\]\.data\.lifecycle\s*=/);
  });

  it("keeps canvas dragging layout-only and never creates connections", () => {
    const canvas = readFileSync(
      join(ROOT, "src/ui/tree/TreeCanvas.tsx"),
      "utf8",
    );
    expect(canvas).toContain("nodesConnectable={false}");
    expect(canvas).toContain("edgesReconnectable={false}");
    expect(canvas).toContain("deleteKeyCode={null}");
    expect(canvas).toContain("layoutOnlyNodeChanges");
    expect(canvas).not.toContain("onConnect");
    expect(canvas).not.toContain("onEdgesChange");
    expect(canvas).not.toContain("activateNode");
    expect(canvas).not.toContain("createBlockingChild");
  });

  it("keeps the AI layer free of Domain mutation", () => {
    const source = readAll(join(ROOT, "src/ai"));
    expect(source).not.toContain("createBlockingChild");
    expect(source).not.toContain("moveCandidateToFrontier");
    expect(source).not.toContain("addEvidence");
    expect(source).not.toContain("addCriterion");
    expect(source).not.toContain("setNodeSummary");
    expect(source).not.toContain("closeNode");
    expect(source).not.toContain("dispatchCommand");
    expect(source).not.toContain("from \"../domain");
    expect(source).not.toContain("from \"../../domain");
  });

  it("keeps the learning framework free of UI, Domain mutation, and GitHub/network APIs", () => {
    const source = readAll(join(ROOT, "src/framework"));
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("@xyflow/react");
    expect(source).not.toContain("from \"../domain");
    expect(source).not.toContain("addCoreQuestion");
    expect(source).not.toContain("createProject");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("localStorage");
  });

  it("keeps Domain free of methodology budgets", () => {
    const source = readAll(join(ROOT, "src/domain"));
    expect(source).not.toContain("concurrentFocus");
    expect(source).not.toContain("branchDepth");
    expect(source).not.toContain("coreMechanisms");
    expect(source).not.toContain("EXPLORATION_BUDGET");
  });

  it("defines EXPLORATION_BUDGET only in the Learning Tree Coco adapter", () => {
    const files = collectSourceFiles(join(ROOT, "src")).filter((file) =>
      file.endsWith(".ts") || file.endsWith(".tsx"),
    );
    const definitions = files.filter((file) =>
      /export const EXPLORATION_BUDGET/.test(readFileSync(file, "utf8")),
    );
    expect(definitions).toEqual([join(ROOT, "src/framework/contract.ts")]);
  });

  it("keeps infrastructure free of Domain mutation and React", () => {
    const source = readAll(join(ROOT, "src/infrastructure"));
    expect(source).not.toContain("from \"react\"");
    expect(source).not.toContain("@xyflow/react");
    expect(source).not.toContain("from \"../domain");
    expect(source).not.toContain("from \"../../domain");
    expect(source).not.toContain("addCoreQuestion");
    expect(source).not.toContain("createProject");
    expect(source).not.toContain("dispatchCommand");
  });

  it("does not let UI become the source of truth for learning methodology", () => {
    const uiFiles = collectSourceFiles(join(ROOT, "src/ui")).filter(
      (file) => !file.endsWith(".css"),
    );
    const source = uiFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toContain("from \"../framework");
    expect(source).not.toContain("from \"../../framework");
    expect(source).not.toContain("EXPLORATION_BUDGET");
    expect(source).not.toContain("runProjectLearningBootstrap");
  });
});
