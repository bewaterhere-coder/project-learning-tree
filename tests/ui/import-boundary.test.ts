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
});
