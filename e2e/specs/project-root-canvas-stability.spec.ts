import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "../fixtures/test.js";
import { mockGitHubRepository } from "../helpers/github.js";
import { createProject, openApp } from "../helpers/project.js";

const evidenceDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/milestones/task-010-project-root-learning-progress",
);

type ClusterMutationStats = {
  clusterChildListMutations: number;
  clusterAttributeMutations: number;
  clusterNodesRemoved: number;
  clusterNodesAdded: number;
};

async function installClusterObserver(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __task010ClusterStats?: ClusterMutationStats;
      __task010ClusterObserver?: MutationObserver;
    };
    w.__task010ClusterStats = {
      clusterChildListMutations: 0,
      clusterAttributeMutations: 0,
      clusterNodesRemoved: 0,
      clusterNodesAdded: 0,
    };
    const root = document.querySelector(".react-flow");
    if (!root) {
      throw new Error("react-flow host missing");
    }
    w.__task010ClusterObserver?.disconnect();
    w.__task010ClusterObserver = new MutationObserver((records) => {
      const stats = w.__task010ClusterStats!;
      for (const record of records) {
        const target = record.target as Element;
        const isCluster =
          (target instanceof Element &&
            (target.classList?.contains("knowledge-cluster") ||
              target.closest?.(".knowledge-cluster") != null ||
              target.getAttribute?.("data-id")?.startsWith("cluster:") === true ||
              target.getAttribute?.("data-testid")?.startsWith("knowledge-cluster-") ===
                true)) ||
          (record.addedNodes.length > 0 &&
            [...record.addedNodes].some(
              (n) =>
                n instanceof Element &&
                (n.classList.contains("knowledge-cluster") ||
                  n.getAttribute("data-id")?.startsWith("cluster:") ||
                  n.getAttribute("data-testid")?.startsWith("knowledge-cluster-")),
            )) ||
          (record.removedNodes.length > 0 &&
            [...record.removedNodes].some(
              (n) =>
                n instanceof Element &&
                (n.classList.contains("knowledge-cluster") ||
                  n.getAttribute("data-id")?.startsWith("cluster:") ||
                  n.getAttribute("data-testid")?.startsWith("knowledge-cluster-")),
            ));
        if (!isCluster) continue;
        if (record.type === "childList") {
          stats.clusterChildListMutations += 1;
          stats.clusterNodesAdded += record.addedNodes.length;
          stats.clusterNodesRemoved += record.removedNodes.length;
        } else if (record.type === "attributes") {
          stats.clusterAttributeMutations += 1;
        }
      }
    });
    w.__task010ClusterObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class", "transform"],
    });
  });
}

async function readClusterStats(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __task010ClusterStats?: ClusterMutationStats };
    return (
      w.__task010ClusterStats ?? {
        clusterChildListMutations: 0,
        clusterAttributeMutations: 0,
        clusterNodesRemoved: 0,
        clusterNodesAdded: 0,
      }
    );
  });
}

async function resetClusterStats(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __task010ClusterStats?: ClusterMutationStats };
    if (w.__task010ClusterStats) {
      w.__task010ClusterStats.clusterChildListMutations = 0;
      w.__task010ClusterStats.clusterAttributeMutations = 0;
      w.__task010ClusterStats.clusterNodesRemoved = 0;
      w.__task010ClusterStats.clusterNodesAdded = 0;
    }
  });
}

test("Project Root shows progress and excludes question actions", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Root Actions", {
    source: "vitejs/vite",
    mockGitHub: false,
  });

  const root = page.locator('[data-project-root="true"]');
  await expect(root).toHaveCount(1);
  const rootId = await root.getAttribute("data-node-id");
  expect(rootId).toBeTruthy();

  await expect(page.getByTestId(`project-root-progress-${rootId}`)).toBeVisible();
  await expect(page.getByTestId(`node-chat-${rootId}`)).toHaveCount(0);
  await expect(page.getByTestId(`node-complete-${rootId}`)).toHaveCount(0);
  await expect(page.getByTestId(`node-add-child-${rootId}`)).toHaveCount(0);

  await root.click();
  await expect(page.getByTestId("chat-panel")).toHaveCount(0);
  await expect(page.locator("[data-on-stack='true']")).toHaveCount(0);

  const question = page.locator("[data-node-id]:not([data-project-root='true'])").first();
  const questionId = await question.getAttribute("data-node-id");
  expect(questionId).toBeTruthy();
  await question.click();
  await question.hover();
  await expect(page.getByTestId(`node-chat-${questionId}`)).toBeVisible();
});

test("select and drag do not rebuild knowledge-cluster underlays", async ({
  page,
}) => {
  await mockGitHubRepository(page);
  await openApp(page);
  await createProject(page, "Canvas Stability", {
    source: "vitejs/vite",
    mockGitHub: false,
  });

  const parent = page.locator("[data-node-id]:not([data-project-root='true'])").first();
  const parentId = await parent.getAttribute("data-node-id");
  expect(parentId).toBeTruthy();
  await parent.click();
  await parent.hover();
  await page.getByTestId(`node-add-child-${parentId}`).click();
  await page.getByTestId("authoring-question").fill("How does the cluster stay stable?");
  await page.getByTestId("authoring-goal").fill("Verify underlay stability");
  await page.getByTestId("authoring-submit").click();
  await expect(
    page.locator(".node-question", {
      hasText: "How does the cluster stay stable?",
    }),
  ).toBeVisible();

  await expect(page.locator(".knowledge-cluster").first()).toBeVisible({
    timeout: 10_000,
  });
  await installClusterObserver(page);
  await resetClusterStats(page);

  const question = page.locator("[data-node-id]:not([data-project-root='true'])").first();
  const questionId = await question.getAttribute("data-node-id");
  expect(questionId).toBeTruthy();
  const box = await question.boundingBox();
  expect(box).toBeTruthy();

  await question.click();
  await expect(question).toHaveAttribute("data-focus", "true");
  await page.waitForTimeout(200);
  const afterSelect = await readClusterStats(page);

  await resetClusterStats(page);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2 + 24, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterDrag = await readClusterStats(page);

  // Pure selection must not remount / recreate cluster underlay nodes.
  expect(afterSelect.clusterNodesRemoved).toBe(0);
  expect(afterSelect.clusterNodesAdded).toBe(0);
  expect(afterSelect.clusterChildListMutations).toBe(0);

  // Drag may update transforms; it must not tear down and recreate cluster nodes.
  expect(afterDrag.clusterNodesRemoved).toBe(0);
  expect(afterDrag.clusterNodesAdded).toBe(0);

  mkdirSync(evidenceDir, { recursive: true });
  const evidence = {
    capturedAt: new Date().toISOString(),
    afterSelect,
    afterDrag,
    verdict:
      afterSelect.clusterChildListMutations === 0 &&
      afterSelect.clusterNodesRemoved === 0 &&
      afterDrag.clusterNodesRemoved === 0 &&
      afterDrag.clusterNodesAdded === 0
        ? "pass"
        : "fail",
  };
  writeFileSync(
    path.join(evidenceDir, "canvas-flash-verification.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await page.locator(".tree-pane").screenshot({
    path: path.join(evidenceDir, "canvas-after-select-drag.png"),
  });
});
