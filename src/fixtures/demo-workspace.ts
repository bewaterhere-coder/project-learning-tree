import { createWorkspace, type LearningWorkspace } from "../workspace/index.js";
import {
  createDemoTreeFixture,
  createSecondDemoTreeFixture,
  type DemoTreeFixture,
  type SecondDemoTreeFixture,
} from "./demo-tree.js";

export interface DemoWorkspaceFixture {
  workspace: LearningWorkspace;
  projectA: DemoTreeFixture;
  projectB: SecondDemoTreeFixture;
}

export function createDemoWorkspaceFixture(): DemoWorkspaceFixture {
  const projectA = createDemoTreeFixture();
  const projectB = createSecondDemoTreeFixture();
  return {
    workspace: createWorkspace([projectA.snapshot, projectB.snapshot]),
    projectA,
    projectB,
  };
}
